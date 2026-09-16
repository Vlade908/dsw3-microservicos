import prisma from '../database/prisma.js';
import produtoClient from '../services/produtoClient.js';

/**
 * Criar um novo pedido
 * POST /pedidos
 * 
 * Executa comunicação síncrona com ms-produtos:
 * 1. Valida existência (404)
 * 2. Valida disponibilidade de estoque (400)
 * 3. Trata indisponibilidade do serviço remoto (503)
 * 4. Aplica o Snapshot Pattern (grava nome e preço imutáveis)
 */
export async function criarPedido(req, res) {
  try {
    const { produtoId, quantidade } = req.body;

    if (!produtoId || typeof produtoId !== 'string' || produtoId.trim() === '') {
      return res.status(400).json({ error: 'O campo "produtoId" é obrigatório.' });
    }

    if (!quantidade || typeof quantidade !== 'number' || quantidade <= 0 || !Number.isInteger(quantidade)) {
      return res.status(400).json({ error: 'O campo "quantidade" deve ser um número inteiro maior que zero.' });
    }

    // 1. Consulta síncrona HTTP ao ms-produtos
    const consultaProduto = await produtoClient.obterProdutoPorId(produtoId.trim());

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

    // 3. Execução do Snapshot Pattern
    // Captura nomeProduto e precoUnitario oficiais no exato momento da transação
    const precoUnitario = Number(produto.preco);
    const valorTotal = Number((precoUnitario * quantidade).toFixed(2));

    const novoPedido = await prisma.pedido.create({
      data: {
        produtoId: produto.id,
        nomeProduto: produto.nome,
        precoUnitario: precoUnitario,
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

    // 4. Baixa no estoque do ms-produtos (assíncrona/não impeditiva do pedido realizado)
    produtoClient.decrementarEstoque(produto.id, quantidade).catch(err => {
      console.warn('[ms-pedidos] Falha ao dar baixa de estoque no ms-produtos:', err);
    });

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
