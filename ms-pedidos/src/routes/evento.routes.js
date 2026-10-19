import { Router } from 'express';
import prisma from '../database/prisma.js';

const router = Router();

/**
 * Webhook consumidor de eventos do Event Broker para alimentar o Cache Local (Materialized View)
 * POST /eventos
 */
router.post('/', async (req, res) => {
  try {
    const { id, topic, event, payload } = req.body;
    console.log(`[ms-pedidos] Evento recebido via Broker [${topic}]: ${event}`);

    if (event === 'CATALOGO_SYNC' && Array.isArray(payload)) {
      for (const prod of payload) {
        await prisma.produtoCache.upsert({
          where: { id: prod.id },
          create: {
            id: prod.id,
            nome: prod.nome,
            preco: Number(prod.preco),
            estoque: prod.estoque,
            descricao: prod.descricao || null
          },
          update: {
            nome: prod.nome,
            preco: Number(prod.preco),
            estoque: prod.estoque,
            descricao: prod.descricao || null
          }
        });
      }
      console.log(`[ms-pedidos] Cache local sincronizado: ${payload.length} produtos gravados.`);
    } else if (event === 'PRODUTO_CRIADO' || event === 'PRODUTO_ATUALIZADO' || event === 'PRODUTO_CRIAR_COMANDO' || event === 'PRODUTO_ATUALIZAR_COMANDO') {
      const prod = payload;
      await prisma.produtoCache.upsert({
        where: { id: prod.id },
        create: {
          id: prod.id,
          nome: prod.nome,
          preco: Number(prod.preco),
          estoque: prod.estoque,
          descricao: prod.descricao || null
        },
        update: {
          nome: prod.nome,
          preco: Number(prod.preco),
          estoque: prod.estoque,
          descricao: prod.descricao || null
        }
      });
      console.log(`[ms-pedidos] Cache local atualizado para o item: ${prod.nome} (Estoque: ${prod.estoque})`);
    } else if (event === 'ESTOQUE_ATUALIZADO') {
      const prod = payload;
      await prisma.produtoCache.updateMany({
        where: { id: prod.id },
        data: { estoque: prod.estoque }
      });
      console.log(`[ms-pedidos] Cache local: saldo de estoque atualizado para o item ${prod.id} -> ${prod.estoque}`);
    } else if (event === 'PRODUTO_EXCLUIDO' || event === 'PRODUTO_EXCLUIR_COMANDO') {
      await prisma.produtoCache.deleteMany({
        where: { id: payload.id }
      });
      console.log(`[ms-pedidos] Cache local: item ${payload.id} removido.`);
    }

    return res.status(200).json({ status: 'ACK', eventId: id });
  } catch (error) {
    console.error('[ms-pedidos] Erro ao sincronizar cache local via evento:', error);
    return res.status(500).json({ error: 'Erro ao processar evento no consumidor.' });
  }
});

export default router;
