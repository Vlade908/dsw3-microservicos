import { Router } from 'express';
import prisma from '../database/prisma.js';

const router = Router();

/**
 * Webhook consumidor de eventos do Event Broker
 * POST /eventos
 */
router.post('/', async (req, res) => {
  try {
    const { id, topic, event, payload } = req.body;
    console.log(`[ms-produtos] Evento recebido via Broker [${topic}]: ${event}`);

    if (event === 'PEDIDO_CRIADO') {
      const { produtoId, quantidade } = payload;
      const produto = await prisma.produto.findUnique({ where: { id: produtoId } });

      if (produto) {
        const novoEstoque = Math.max(0, produto.estoque - quantidade);
        await prisma.produto.update({
          where: { id: produtoId },
          data: { estoque: novoEstoque }
        });
        console.log(`[ms-produtos] Baixa de estoque assíncrona efetuada para ${produto.nome}: ${produto.estoque} -> ${novoEstoque}`);
      }
    } else if (event === 'PEDIDO_CANCELADO') {
      const { produtoId, quantidade } = payload;
      const produto = await prisma.produto.findUnique({ where: { id: produtoId } });

      if (produto) {
        const novoEstoque = produto.estoque + quantidade;
        await prisma.produto.update({
          where: { id: produtoId },
          data: { estoque: novoEstoque }
        });
        console.log(`[ms-produtos] Estorno de estoque assíncrono efetuado para ${produto.nome}: ${produto.estoque} -> ${novoEstoque}`);
      }
    }

    return res.status(200).json({ status: 'ACK', eventId: id });
  } catch (error) {
    console.error('[ms-produtos] Erro ao processar evento assíncrono:', error);
    return res.status(500).json({ error: 'Erro ao processar evento no consumidor.' });
  }
});

export default router;
