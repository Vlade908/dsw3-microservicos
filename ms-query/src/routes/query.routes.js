import { Router } from 'express';
import prisma from '../database/prisma.js';

const router = Router();

/**
 * Listar produtos a partir do Read Model CQRS
 * GET /query/produtos
 */
router.get('/produtos', async (req, res) => {
  try {
    const produtos = await prisma.queryProduto.findMany({
      orderBy: { nome: 'asc' }
    });
    return res.status(200).json(produtos);
  } catch (error) {
    console.error('[ms-query] Erro ao consultar produtos:', error);
    return res.status(500).json({ error: 'Erro ao consultar projeção de produtos.' });
  }
});

/**
 * Buscar produto por ID
 * GET /query/produtos/:id
 */
router.get('/produtos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const produto = await prisma.queryProduto.findUnique({ where: { id } });
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado na projeção de leitura.' });
    }
    return res.status(200).json(produto);
  } catch (error) {
    console.error('[ms-query] Erro ao consultar produto:', error);
    return res.status(500).json({ error: 'Erro ao consultar produto.' });
  }
});

/**
 * Listar histórico de pedidos a partir do Read Model CQRS
 * GET /query/pedidos
 */
router.get('/pedidos', async (req, res) => {
  try {
    const pedidos = await prisma.queryPedido.findMany({
      orderBy: { dataPedido: 'desc' }
    });
    return res.status(200).json(pedidos);
  } catch (error) {
    console.error('[ms-query] Erro ao consultar pedidos:', error);
    return res.status(500).json({ error: 'Erro ao consultar projeção de pedidos.' });
  }
});

/**
 * Buscar pedido por ID
 * GET /query/pedidos/:id
 */
router.get('/pedidos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const pedido = await prisma.queryPedido.findUnique({ where: { id } });
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado na projeção de leitura.' });
    }
    return res.status(200).json(pedido);
  } catch (error) {
    console.error('[ms-query] Erro ao consultar pedido:', error);
    return res.status(500).json({ error: 'Erro ao consultar pedido.' });
  }
});

/**
 * Visão consolidada analítica (União de Produtos + Pedidos sem sobrecarregar bancos operacionais)
 * GET /query/resumo
 */
router.get('/resumo', async (req, res) => {
  try {
    const [totalProdutos, totalPedidos, produtos, pedidos] = await Promise.all([
      prisma.queryProduto.count(),
      prisma.queryPedido.count(),
      prisma.queryProduto.findMany(),
      prisma.queryPedido.findMany()
    ]);

    const estoqueGlobal = produtos.reduce((acc, p) => acc + p.estoque, 0);
    const pedidosRealizados = pedidos.filter(p => p.status === 'REALIZADO');
    const faturamentoTotal = pedidosRealizados.reduce((acc, p) => acc + p.valorTotal, 0);

    return res.status(200).json({
      modelo: 'CQRS Materialized View',
      totalProdutos,
      estoqueGlobal,
      totalPedidos,
      pedidosRealizados: pedidosRealizados.length,
      pedidosCancelados: pedidos.filter(p => p.status === 'CANCELADO').length,
      faturamentoTotal: Number(faturamentoTotal.toFixed(2)),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ms-query] Erro ao gerar resumo consolidado:', error);
    return res.status(500).json({ error: 'Erro ao gerar resumo analítico.' });
  }
});

export default router;
