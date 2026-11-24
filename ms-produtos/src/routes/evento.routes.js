import { Router } from 'express';
import prisma from '../database/prisma.js';
import brokerClient from '../services/brokerClient.js';

const router = Router();

/**
 * Aplica baixa ou estorno de estoque de forma idempotente via Inbox Pattern (EventoProcessado)
 */
async function aplicarMovimentacaoEstoque({ causaKey, event, produtoId, quantidade, operacao }) {
  const resultado = await prisma.$transaction(async (tx) => {
    const jaProcessado = await tx.eventoProcessado.findUnique({
      where: { id: causaKey }
    });
    if (jaProcessado) {
      return { ignored: true };
    }

    const produto = await tx.produto.findUnique({ where: { id: produtoId } });
    let produtoAtualizado = null;

    if (produto) {
      const qtd = Number(quantidade);
      const novoEstoque = operacao === 'subtrair'
        ? Math.max(0, produto.estoque - qtd)
        : produto.estoque + qtd;

      produtoAtualizado = await tx.produto.update({
        where: { id: produtoId },
        data: { estoque: novoEstoque },
        select: {
          id: true,
          nome: true,
          preco: true,
          descricao: true,
          imagemUrl: true,
          estoque: true
        }
      });
    }

    await tx.eventoProcessado.create({
      data: { id: causaKey, event }
    });

    return { ignored: false, produto: produtoAtualizado, estoqueAnterior: produto?.estoque };
  });

  if (resultado.ignored) {
    console.log(`[ms-produtos] Evento ${event} ignorado por idempotência (${causaKey}).`);
    return;
  }

  if (resultado.produto) {
    const acao = operacao === 'subtrair' ? 'Baixa' : 'Estorno';
    console.log(`[ms-produtos] ${acao} de estoque assíncrona efetuada para ${resultado.produto.nome}: ${resultado.estoqueAnterior} -> ${resultado.produto.estoque}`);
    brokerClient.publicarEvento('produtos', 'ESTOQUE_ATUALIZADO', {
      ...resultado.produto,
      causaKey
    });
  }
}

/**
 * Webhook consumidor de eventos do Event Broker
 * POST /eventos
 */
router.post('/', async (req, res) => {
  try {
    const { id, topic, event, payload } = req.body;
    console.log(`[ms-produtos] Evento recebido via Broker [${topic}]: ${event}`);

    if (event === 'PEDIDO_CRIADO' || event === 'PEDIDO_CRIAR_COMANDO') {
      const { pedidoId, produtoId, quantidade } = payload || {};
      if (produtoId && quantidade) {
        const causaKey = pedidoId ? `PEDIDO_BAIXA:${pedidoId}` : `EVENTO:${id}`;
        await aplicarMovimentacaoEstoque({
          causaKey,
          event,
          produtoId,
          quantidade,
          operacao: 'subtrair'
        });
      }
    } else if (event === 'PEDIDO_CANCELADO' || event === 'PEDIDO_CANCELAR_COMANDO') {
      const { pedidoId, produtoId, quantidade } = payload || {};
      if (produtoId && quantidade) {
        const causaKey = pedidoId ? `PEDIDO_ESTORNO:${pedidoId}` : `EVENTO:${id}`;
        await aplicarMovimentacaoEstoque({
          causaKey,
          event,
          produtoId,
          quantidade,
          operacao: 'adicionar'
        });
      }
    } else if (event === 'PRODUTO_CRIAR_COMANDO') {
      const prod = payload;
      if (prod && prod.id && prod.nome) {
        const cmdKey = `CMD:${id}`;
        await prisma.$transaction(async (tx) => {
          const jaProcessado = await tx.eventoProcessado.findUnique({ where: { id: cmdKey } });
          if (jaProcessado) return;

          await tx.produto.upsert({
            where: { id: prod.id },
            create: {
              id: prod.id,
              nome: prod.nome,
              preco: Number(prod.preco),
              estoque: Number(prod.estoque),
              descricao: prod.descricao || null,
              imagemUrl: prod.imagemUrl || null
            },
            update: {
              nome: prod.nome,
              preco: Number(prod.preco),
              estoque: Number(prod.estoque),
              descricao: prod.descricao || null,
              imagemUrl: prod.imagemUrl || null
            }
          });
          await tx.eventoProcessado.create({ data: { id: cmdKey, event } });
          console.log(`[ms-produtos] STORE-AND-FORWARD: Produto persistido no SQLite oficial via fila do Broker: ${prod.nome} (${prod.id})`);
        });
      }
    } else if (event === 'PRODUTO_ATUALIZAR_COMANDO') {
      const prod = payload;
      if (prod && prod.id) {
        const cmdKey = `CMD:${id}`;
        await prisma.$transaction(async (tx) => {
          const jaProcessado = await tx.eventoProcessado.findUnique({ where: { id: cmdKey } });
          if (jaProcessado) return;

          await tx.produto.updateMany({
            where: { id: prod.id },
            data: {
              nome: prod.nome,
              preco: Number(prod.preco),
              estoque: Number(prod.estoque),
              descricao: prod.descricao || null,
              imagemUrl: prod.imagemUrl || null
            }
          });
          await tx.eventoProcessado.create({ data: { id: cmdKey, event } });
          console.log(`[ms-produtos] STORE-AND-FORWARD: Produto atualizado via fila do Broker: ${prod.nome} (${prod.id})`);
        });
      }
    } else if (event === 'PRODUTO_EXCLUIR_COMANDO') {
      if (payload?.id) {
        const cmdKey = `CMD:${id}`;
        await prisma.$transaction(async (tx) => {
          const jaProcessado = await tx.eventoProcessado.findUnique({ where: { id: cmdKey } });
          if (jaProcessado) return;

          await tx.produto.deleteMany({ where: { id: payload.id } });
          await tx.eventoProcessado.create({ data: { id: cmdKey, event } });
          console.log(`[ms-produtos] STORE-AND-FORWARD: Produto excluído via fila do Broker: ${payload.id}`);
        });
      }
    }

    return res.status(200).json({ status: 'ACK', eventId: id });
  } catch (error) {
    console.error('[ms-produtos] Erro ao processar evento assíncrono:', error);
    return res.status(500).json({ error: 'Erro ao processar evento no consumidor.' });
  }
});

export default router;
