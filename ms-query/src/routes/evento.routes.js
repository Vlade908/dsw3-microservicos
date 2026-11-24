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
            descricao: p.descricao || null,
            imagemUrl: p.imagemUrl || null
          },
          update: {
            nome: p.nome,
            preco: Number(p.preco),
            estoque: p.estoque,
            descricao: p.descricao || null,
            imagemUrl: p.imagemUrl || null
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
          descricao: p.descricao || null,
          imagemUrl: p.imagemUrl || null
        },
        update: {
          nome: p.nome,
          preco: Number(p.preco),
          estoque: p.estoque,
          descricao: p.descricao || null,
          imagemUrl: p.imagemUrl || null
        }
      });
      console.log(`[ms-query] Projeção atualizada para produto: ${p.nome}`);
    } else if (event === 'ESTOQUE_ATUALIZADO') {
      const p = payload;
      await prisma.$transaction(async (tx) => {
        await tx.queryProduto.updateMany({
          where: { id: p.id },
          data: { estoque: p.estoque }
        });
        if (p.causaKey) {
          await tx.eventoProcessado.upsert({
            where: { id: String(p.causaKey) },
            create: { id: String(p.causaKey), event },
            update: {}
          });
        }
      });
      console.log(`[ms-query] Projeção: estoque atualizado do item ${p.id} -> ${p.estoque}`);
    } else if (event === 'PRODUTO_EXCLUIDO' || event === 'PRODUTO_EXCLUIR_COMANDO') {
      await prisma.queryProduto.deleteMany({
        where: { id: payload.id }
      });
      console.log(`[ms-query] Projeção: produto ${payload.id} removido.`);
    }

    // === Eventos de Pedidos ===
    else if (event === 'PEDIDO_CRIADO' || event === 'PEDIDO_CRIAR_COMANDO') {
      const ped = payload;
      const prodExistente = await prisma.queryProduto.findUnique({ where: { id: ped.produtoId } });
      const nomeProdutoResolvido = ped.nomeProduto || prodExistente?.nome || 'Produto';

      await prisma.queryPedido.upsert({
        where: { id: ped.pedidoId },
        create: {
          id: ped.pedidoId,
          produtoId: ped.produtoId,
          nomeProduto: nomeProdutoResolvido,
          precoUnitario: Number(ped.precoUnitario),
          quantidade: Number(ped.quantidade),
          valorTotal: Number(ped.valorTotal),
          dataPedido: ped.dataPedido ? new Date(ped.dataPedido) : new Date(),
          status: ped.status || 'REALIZADO'
        },
        update: {
          nomeProduto: nomeProdutoResolvido,
          status: ped.status || 'REALIZADO'
        }
      });

      // Só decrementa localmente se ainda não houve baixa confirmada nem processamento prévio para esta chave causal
      if (!ped.estoqueJaAtualizado) {
        const causaKey = `PEDIDO_BAIXA:${ped.pedidoId}`;
        await prisma.$transaction(async (tx) => {
          const jaProcessado = await tx.eventoProcessado.findUnique({ where: { id: causaKey } });
          if (jaProcessado) return;

          const prod = await tx.queryProduto.findUnique({ where: { id: ped.produtoId } });
          if (prod) {
            await tx.queryProduto.update({
              where: { id: ped.produtoId },
              data: { estoque: Math.max(0, prod.estoque - Number(ped.quantidade)) }
            });
          }
          await tx.eventoProcessado.create({
            data: { id: causaKey, event }
          });
        });
      }
      console.log(`[ms-query] Projeção: pedido registrado ${ped.pedidoId.slice(0, 8)}... (${nomeProdutoResolvido})`);
    } else if (event === 'PEDIDO_CANCELADO' || event === 'PEDIDO_CANCELAR_COMANDO') {
      const ped = payload;
      await prisma.queryPedido.updateMany({
        where: { id: ped.pedidoId },
        data: { status: 'CANCELADO' }
      });

      // Só recompõe o estoque localmente se o estorno ainda não tiver sido aplicado/notificado
      if (!ped.estoqueJaAtualizado) {
        const causaKey = `PEDIDO_ESTORNO:${ped.pedidoId}`;
        await prisma.$transaction(async (tx) => {
          const jaProcessado = await tx.eventoProcessado.findUnique({ where: { id: causaKey } });
          if (jaProcessado) return;

          const prod = await tx.queryProduto.findUnique({ where: { id: ped.produtoId } });
          if (prod) {
            await tx.queryProduto.update({
              where: { id: ped.produtoId },
              data: { estoque: prod.estoque + Number(ped.quantidade) }
            });
          }
          await tx.eventoProcessado.create({
            data: { id: causaKey, event }
          });
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
