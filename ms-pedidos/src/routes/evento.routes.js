import { Router } from 'express';
import prisma from '../database/prisma.js';

const router = Router();

/**
 * Webhook consumidor de eventos do Event Broker:
 * - Tópico "produtos": alimenta o Cache Local (Materialized View)
 * - Tópico "pedidos": executa comandos Store-and-Forward quando ms-pedidos esteve offline
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
            descricao: prod.descricao || null,
            imagemUrl: prod.imagemUrl || null
          },
          update: {
            nome: prod.nome,
            preco: Number(prod.preco),
            estoque: prod.estoque,
            descricao: prod.descricao || null,
            imagemUrl: prod.imagemUrl || null
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
          descricao: prod.descricao || null,
          imagemUrl: prod.imagemUrl || null
        },
        update: {
          nome: prod.nome,
          preco: Number(prod.preco),
          estoque: prod.estoque,
          descricao: prod.descricao || null,
          imagemUrl: prod.imagemUrl || null
        }
      });
      console.log(`[ms-pedidos] Cache local atualizado para o item: ${prod.nome} (Estoque: ${prod.estoque})`);
    } else if (event === 'ESTOQUE_ATUALIZADO') {
      const prod = payload;
      await prisma.$transaction(async (tx) => {
        await tx.produtoCache.updateMany({
          where: { id: prod.id },
          data: { estoque: prod.estoque }
        });
        if (prod.causaKey) {
          await tx.eventoProcessado.upsert({
            where: { id: String(prod.causaKey) },
            create: { id: String(prod.causaKey), event },
            update: {}
          });
        }
      });
      console.log(`[ms-pedidos] Cache local: saldo de estoque atualizado para o item ${prod.id} -> ${prod.estoque}`);
    } else if (event === 'PRODUTO_EXCLUIDO' || event === 'PRODUTO_EXCLUIR_COMANDO') {
      await prisma.produtoCache.deleteMany({
        where: { id: payload.id }
      });
      console.log(`[ms-pedidos] Cache local: item ${payload.id} removido.`);
    } else if (event === 'PEDIDO_CRIAR_COMANDO') {
      const ped = payload;
      if (ped && ped.pedidoId) {
        const cmdKey = `CMD_CRIAR:${ped.pedidoId}`;
        const baixaKey = `PEDIDO_BAIXA:${ped.pedidoId}`;

        await prisma.$transaction(async (tx) => {
          const cmdJaProcessado = await tx.eventoProcessado.findUnique({ where: { id: cmdKey } });
          if (cmdJaProcessado) return;

          await tx.pedido.upsert({
            where: { id: ped.pedidoId },
            create: {
              id: ped.pedidoId,
              produtoId: ped.produtoId,
              nomeProduto: ped.nomeProduto || 'Produto',
              precoUnitario: Number(ped.precoUnitario),
              quantidade: Number(ped.quantidade),
              valorTotal: Number(ped.valorTotal),
              dataPedido: ped.dataPedido ? new Date(ped.dataPedido) : new Date(),
              status: 'REALIZADO'
            },
            update: {}
          });

          await tx.eventoProcessado.create({
            data: { id: cmdKey, event }
          });

          const baixaJaAplicada = await tx.eventoProcessado.findUnique({ where: { id: baixaKey } });
          if (!baixaJaAplicada) {
            const cached = await tx.produtoCache.findUnique({ where: { id: ped.produtoId } });
            if (cached) {
              await tx.produtoCache.update({
                where: { id: ped.produtoId },
                data: { estoque: Math.max(0, cached.estoque - Number(ped.quantidade)) }
              });
            }
            await tx.eventoProcessado.create({
              data: { id: baixaKey, event }
            });
          }
        });
        console.log(`[ms-pedidos] STORE-AND-FORWARD: Pedido ${ped.pedidoId.slice(0, 8)}... persistido no SQLite via Broker.`);
      }
    } else if (event === 'PEDIDO_CANCELAR_COMANDO') {
      const ped = payload;
      if (ped && ped.pedidoId) {
        const cmdKey = `CMD_CANCELAR:${ped.pedidoId}`;
        const estornoKey = `PEDIDO_ESTORNO:${ped.pedidoId}`;

        await prisma.$transaction(async (tx) => {
          const cmdJaProcessado = await tx.eventoProcessado.findUnique({ where: { id: cmdKey } });
          if (cmdJaProcessado) return;

          await tx.pedido.updateMany({
            where: { id: ped.pedidoId },
            data: { status: 'CANCELADO' }
          });

          await tx.eventoProcessado.create({
            data: { id: cmdKey, event }
          });

          const estornoJaAplicado = await tx.eventoProcessado.findUnique({ where: { id: estornoKey } });
          if (!estornoJaAplicado) {
            const cached = await tx.produtoCache.findUnique({ where: { id: ped.produtoId } });
            if (cached) {
              await tx.produtoCache.update({
                where: { id: ped.produtoId },
                data: { estoque: cached.estoque + Number(ped.quantidade) }
              });
            }
            await tx.eventoProcessado.create({
              data: { id: estornoKey, event }
            });
          }
        });
        console.log(`[ms-pedidos] STORE-AND-FORWARD: Pedido ${ped.pedidoId.slice(0, 8)}... cancelado via Broker.`);
      }
    }

    // Eventos PEDIDO_CRIADO e PEDIDO_CANCELADO originados pelo próprio ms-pedidos são apenas confirmados (ACK)
    return res.status(200).json({ status: 'ACK', eventId: id });
  } catch (error) {
    console.error('[ms-pedidos] Erro ao sincronizar cache local via evento:', error);
    return res.status(500).json({ error: 'Erro ao processar evento no consumidor.' });
  }
});

export default router;
