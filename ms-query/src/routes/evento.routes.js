import { Router } from 'express';
import prisma from '../database/prisma.js';

const router = Router();

/**
 * Webhook consumidor do Event Broker para atualizar Projeções de Leitura (CQRS Read Model)
 * POST /eventos
 */
router.post('/', async (req, res) => {
  try {
    const { id, topic, event, payload } = req.body;
    console.log(`[ms-query] Evento recebido via Broker [${topic}]: ${event}`);

    // === Eventos de Produtos ===
    if (event === 'CATALOGO_SYNC' && Array.isArray(payload)) {
      for (const p of payload) {
        await prisma.queryProduto.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            nome: p.nome,
            preco: Number(p.preco),
            estoque: p.estoque,
            descricao: p.descricao || null
          },
          update: {
            nome: p.nome,
            preco: Number(p.preco),
            estoque: p.estoque,
            descricao: p.descricao || null
          }
        });
      }
      console.log(`[ms-query] Projeção de produtos sincronizada: ${payload.length} itens.`);
    } else if (event === 'PRODUTO_CRIADO' || event === 'PRODUTO_ATUALIZADO' || event === 'PRODUTO_CRIAR_COMANDO' || event === 'PRODUTO_ATUALIZAR_COMANDO') {
      const p = payload;
      await prisma.queryProduto.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          nome: p.nome,
          preco: Number(p.preco),
          estoque: p.estoque,
          descricao: p.descricao || null
        },
        update: {
          nome: p.nome,
          preco: Number(p.preco),
          estoque: p.estoque,
          descricao: p.descricao || null
        }
      });
      console.log(`[ms-query] Projeção atualizada para produto: ${p.nome}`);
    } else if (event === 'ESTOQUE_ATUALIZADO') {
      const p = payload;
      await prisma.queryProduto.updateMany({
        where: { id: p.id },
        data: { estoque: p.estoque }
      });
      console.log(`[ms-query] Projeção: estoque atualizado do item ${p.id} -> ${p.estoque}`);
    } else if (event === 'PRODUTO_EXCLUIDO' || event === 'PRODUTO_EXCLUIR_COMANDO') {
      await prisma.queryProduto.deleteMany({
        where: { id: payload.id }
      });
      console.log(`[ms-query] Projeção: produto ${payload.id} removido.`);
    }

    // === Eventos de Pedidos ===
    else if (event === 'PEDIDO_CRIADO') {
      const ped = payload;
      await prisma.queryPedido.upsert({
        where: { id: ped.pedidoId },
        create: {
          id: ped.pedidoId,
          produtoId: ped.produtoId,
          nomeProduto: ped.nomeProduto || 'Produto',
          precoUnitario: Number(ped.precoUnitario),
          quantidade: ped.quantidade,
          valorTotal: Number(ped.valorTotal),
          status: 'REALIZADO'
        },
        update: {
          status: 'REALIZADO'
        }
      });

      // Também decrementa o estoque na projeção de produtos
      const prod = await prisma.queryProduto.findUnique({ where: { id: ped.produtoId } });
      if (prod) {
        await prisma.queryProduto.update({
          where: { id: ped.produtoId },
          data: { estoque: Math.max(0, prod.estoque - ped.quantidade) }
        });
      }
      console.log(`[ms-query] Projeção: pedido registrado ${ped.pedidoId.slice(0, 8)}...`);
    } else if (event === 'PEDIDO_CANCELADO') {
      const ped = payload;
      await prisma.queryPedido.updateMany({
        where: { id: ped.pedidoId },
        data: { status: 'CANCELADO' }
      });

      // Recompõe o estoque na projeção de produtos
      const prod = await prisma.queryProduto.findUnique({ where: { id: ped.produtoId } });
      if (prod) {
        await prisma.queryProduto.update({
          where: { id: ped.produtoId },
          data: { estoque: prod.estoque + ped.quantidade }
        });
      }
      console.log(`[ms-query] Projeção: pedido cancelado ${ped.pedidoId.slice(0, 8)}...`);
    }

    return res.status(200).json({ status: 'ACK', eventId: id });
  } catch (error) {
    console.error('[ms-query] Erro ao processar evento na projeção:', error);
    return res.status(500).json({ error: 'Erro ao atualizar projeção CQRS.' });
  }
});

export default router;
