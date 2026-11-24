import { v4 as uuidv4 } from 'uuid';
import prisma from '../database/prisma.js';
import produtoClient from '../services/produtoClient.js';
import brokerClient from '../services/brokerClient.js';

/**
 * Criar um novo pedido
 * POST /pedidos
 * 
 * Executa comunicação síncrona com ms-produtos:
 * 1. Valida existência (404) e disponibilidade de estoque (400)
 * 2. Reserva estoque de forma síncrona (com idempotencyKey) e compensação Saga em caso de falha local
 * 3. Suporta modo síncrono estrito (X-Sync-Strict: true -> 503) ou fallback resiliente via ProdutoCache
 * 4. Aplica o Snapshot Pattern (grava nome e preço imutáveis)
 */
export async function criarPedido(req, res) {
  try {
    const { produtoId, quantidade } = req.body;
    const strictMode = req.headers['x-sync-strict'] === 'true' || req.query.strict === 'true';

    if (!produtoId || typeof produtoId !== 'string' || produtoId.trim() === '') {
      return res.status(400).json({ error: 'O campo "produtoId" é obrigatório.' });
    }

    if (!quantidade || typeof quantidade !== 'number' || quantidade <= 0 || !Number.isInteger(quantidade)) {
      return res.status(400).json({ error: 'O campo "quantidade" deve ser um número inteiro maior que zero.' });
    }

    // 1. Consulta síncrona HTTP ao ms-produtos (ou fallback de cache se permitido)
    const consultaProduto = await produtoClient.obterProdutoPorId(produtoId.trim(), { strict: strictMode });

    if (!consultaProduto.success) {
      return res.status(consultaProduto.status).json({
        error: consultaProduto.error
      });
    }

    const produto = consultaProduto.data;

    // 2. Validação de estoque disponível
    if (quantidade > produto.estoque) {
      return res.status(400).json({
        error: `Quantidade solicitada excede o estoque disponível (Disponível: ${produto.estoque}).`
      });
    }

    const pedidoId = uuidv4();
    const causaKey = `PEDIDO_BAIXA:${pedidoId}`;

    // 3. Reserva síncrona aguardada no ms-produtos quando online
    let baixaSync = null;
    if (!consultaProduto.fromCache) {
      baixaSync = await produtoClient.decrementarEstoque(produto.id, quantidade, causaKey);

      if (!baixaSync.success && baixaSync.businessError) {
        return res.status(baixaSync.status).json({ error: baixaSync.error });
      }

      if (!baixaSync.success && strictMode) {
        return res.status(503).json({
          error: 'Falha ao confirmar baixa de estoque no ms-produtos em modo síncrono estrito.'
        });
      }
    }

    const estoqueJaAtualizado = Boolean(!consultaProduto.fromCache && baixaSync?.success);
    const estoqueRestante = estoqueJaAtualizado && baixaSync.data
      ? baixaSync.data.estoque
      : Math.max(0, produto.estoque - quantidade);

    // 4. Execução do Snapshot Pattern
    // Captura nomeProduto e precoUnitario oficiais no exato momento da transação
    const precoUnitario = Number(produto.preco);
    const valorTotal = Number((precoUnitario * quantidade).toFixed(2));

    let novoPedido;
    try {
      novoPedido = await prisma.pedido.create({
        data: {
          id: pedidoId,
          produtoId: produto.id,
          nomeProduto: produto.nome,
          precoUnitario,
          quantidade,
          valorTotal,
          status: 'REALIZADO'
        },
        select: {
          id: true,
          produtoId: true,
          nomeProduto: true,
          precoUnitario: true,
          quantidade: true,
          valorTotal: true,
          dataPedido: true,
          status: true
        }
      });
    } catch (createErr) {
      // Compensação Saga caso o estoque já tenha sido reservado no ms-produtos
      if (estoqueJaAtualizado) {
        await produtoClient.incrementarEstoque(
          produto.id,
          quantidade,
          `PEDIDO_COMPENSACAO:${pedidoId}`
        ).catch(() => {});
      }
      throw createErr;
    }

    // 5. Atualizar saldo no Cache Local do ms-pedidos e registrar idempotência causal
    await prisma.$transaction([
      prisma.produtoCache.updateMany({
        where: { id: produto.id },
        data: { estoque: estoqueRestante }
      }),
      prisma.eventoProcessado.upsert({
        where: { id: causaKey },
        create: { id: causaKey, event: 'PEDIDO_CRIADO' },
        update: {}
      })
    ]).catch(() => {});

    // 6. Publicação garantida no Barramento de Eventos (Event Broker) com snapshot completo
    brokerClient.publicarEvento('pedidos', 'PEDIDO_CRIADO', {
      pedidoId: novoPedido.id,
      produtoId: novoPedido.produtoId,
      nomeProduto: novoPedido.nomeProduto,
      precoUnitario: novoPedido.precoUnitario,
      quantidade: novoPedido.quantidade,
      valorTotal: novoPedido.valorTotal,
      dataPedido: novoPedido.dataPedido,
      status: novoPedido.status,
      estoqueJaAtualizado
    });

    res.setHeader('X-Validation-Mode', consultaProduto.fromCache ? 'cache-fallback' : 'sync-http');
    return res.status(201).json(novoPedido);
  } catch (error) {
    console.error('[ms-pedidos] Erro ao processar pedido:', error);
    return res.status(500).json({ error: 'Erro interno ao processar pedido.' });
  }
}

/**
 * Listar histórico de pedidos
 * GET /pedidos
 */
export async function listarPedidos(req, res) {
  try {
    const pedidos = await prisma.pedido.findMany({
      select: {
        id: true,
        produtoId: true,
        nomeProduto: true,
        precoUnitario: true,
        quantidade: true,
        valorTotal: true,
        dataPedido: true,
        status: true
      },
      orderBy: {
        dataPedido: 'desc'
      }
    });

    return res.status(200).json(pedidos);
  } catch (error) {
    console.error('[ms-pedidos] Erro ao listar pedidos:', error);
    return res.status(500).json({ error: 'Erro interno ao listar pedidos.' });
  }
}

/**
 * Buscar detalhes de um pedido específico
 * GET /pedidos/:id
 */
export async function buscarPedidoPorId(req, res) {
  try {
    const { id } = req.params;

    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: {
        id: true,
        produtoId: true,
        nomeProduto: true,
        precoUnitario: true,
        quantidade: true,
        valorTotal: true,
        dataPedido: true,
        status: true
      }
    });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    return res.status(200).json(pedido);
  } catch (error) {
    console.error('[ms-pedidos] Erro ao buscar pedido:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar pedido.' });
  }
}

/**
 * Cancelar um pedido e estornar estoque no ms-produtos
 * PATCH /pedidos/:id/cancelar
 */
export async function cancelarPedido(req, res) {
  try {
    const { id } = req.params;

    const pedido = await prisma.pedido.findUnique({ where: { id } });
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    if (pedido.status === 'CANCELADO') {
      return res.status(400).json({ error: 'Este pedido já está cancelado.' });
    }

    const pedidoAtualizado = await prisma.pedido.update({
      where: { id },
      data: { status: 'CANCELADO' },
      select: {
        id: true,
        produtoId: true,
        nomeProduto: true,
        precoUnitario: true,
        quantidade: true,
        valorTotal: true,
        dataPedido: true,
        status: true
      }
    });

    const causaKey = `PEDIDO_ESTORNO:${pedido.id}`;

    // Tentativa síncrona idempotente de estorno no ms-produtos
    const estornoSync = await produtoClient.incrementarEstoque(
      pedido.produtoId,
      pedido.quantidade,
      causaKey
    );

    // Recompõe o estoque no Cache Local do ms-pedidos e registra idempotência causal
    const cached = await prisma.produtoCache.findUnique({ where: { id: pedido.produtoId } });
    const estoqueAtualizadoCache = estornoSync.success && estornoSync.data
      ? estornoSync.data.estoque
      : (cached ? cached.estoque + pedido.quantidade : null);

    await prisma.$transaction([
      ...(cached && estoqueAtualizadoCache !== null
        ? [prisma.produtoCache.update({
            where: { id: pedido.produtoId },
            data: { estoque: estoqueAtualizadoCache }
          })]
        : []),
      prisma.eventoProcessado.upsert({
        where: { id: causaKey },
        create: { id: causaKey, event: 'PEDIDO_CANCELADO' },
        update: {}
      })
    ]).catch(() => {});

    // Publicação assíncrona do cancelamento no Event Broker
    brokerClient.publicarEvento('pedidos', 'PEDIDO_CANCELADO', {
      pedidoId: pedido.id,
      produtoId: pedido.produtoId,
      quantidade: pedido.quantidade,
      estoqueJaAtualizado: estornoSync.success
    });

    return res.status(200).json(pedidoAtualizado);
  } catch (error) {
    console.error('[ms-pedidos] Erro ao cancelar pedido:', error);
    return res.status(500).json({ error: 'Erro interno ao cancelar pedido.' });
  }
}
