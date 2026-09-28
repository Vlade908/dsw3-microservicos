import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import queryRoutes from './routes/query.routes.js';
import eventoRoutes from './routes/evento.routes.js';
import brokerClient from './services/brokerClient.js';
import prisma from './database/prisma.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Endpoint de Health Check com métricas da projeção
app.get('/health', async (req, res) => {
  try {
    const [countProdutos, countPedidos] = await Promise.all([
      prisma.queryProduto.count(),
      prisma.queryPedido.count()
    ]);
    res.status(200).json({
      status: 'UP',
      service: 'ms-query',
      port: PORT,
      pattern: 'CQRS Query Service (Read Model)',
      produtosIndexados: countProdutos,
      pedidosIndexados: countPedidos,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

// Rotas do Query Service e Eventos
app.use('/query', queryRoutes);
app.use('/eventos', eventoRoutes);

// Dashboard visual do Query Service (Porta 3004)
app.get('/', async (req, res) => {
  try {
    const [produtos, pedidos] = await Promise.all([
      prisma.queryProduto.findMany({ orderBy: { nome: 'asc' } }),
      prisma.queryPedido.findMany({ orderBy: { dataPedido: 'desc' } })
    ]);

    const totalFaturado = pedidos
      .filter(p => p.status === 'REALIZADO')
      .reduce((acc, p) => acc + p.valorTotal, 0);

    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Query Service — Projeção Consolidada CQRS (DSW3)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans p-6">
  <div class="max-w-6xl mx-auto space-y-6">
    
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
      <div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
          <h1 class="text-2xl font-bold tracking-tight text-white">Query Service (ms-query)</h1>
          <span class="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">Porta 3004 | CQRS</span>
        </div>
        <p class="text-xs text-slate-400 mt-1">
          Projeção de Leitura Consolidada de Produtos e Pedidos. Consultas ultrarrápidas sem tocar nos bancos transacionais.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <a href="/query/resumo" target="_blank" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 rounded-lg border border-slate-700">
          JSON: /query/resumo
        </a>
      </div>
    </header>

    <!-- Cards de Métricas CQRS -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span class="text-slate-400 uppercase font-bold text-[10px]">Produtos Replicados</span>
        <div class="text-2xl font-extrabold text-white mt-1">${produtos.length}</div>
        <span class="text-slate-500 text-[10px]">Alimentado por Eventos</span>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span class="text-slate-400 uppercase font-bold text-[10px]">Estoque Total em Cache</span>
        <div class="text-2xl font-extrabold text-cyan-400 mt-1">${produtos.reduce((acc, p) => acc + p.estoque, 0)} un.</div>
        <span class="text-slate-500 text-[10px]">Saldo consolidado</span>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span class="text-slate-400 uppercase font-bold text-[10px]">Total de Pedidos</span>
        <div class="text-2xl font-extrabold text-white mt-1">${pedidos.length}</div>
        <span class="text-slate-500 text-[10px]">Histórico unificado</span>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span class="text-slate-400 uppercase font-bold text-[10px]">Faturamento Consolidado</span>
        <div class="text-2xl font-extrabold text-emerald-400 mt-1">R$ ${totalFaturado.toFixed(2)}</div>
        <span class="text-slate-500 text-[10px]">Aprovados (Snapshot)</span>
      </div>
    </div>

    <!-- Tabela de Produtos Cacheados -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">Catálogo Replicado (Projeção de Produtos)</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-mono">
          <thead class="text-slate-400 border-b border-slate-800">
            <tr>
              <th class="py-2">UUID</th>
              <th>Nome</th>
              <th>Preço</th>
              <th>Estoque</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            ${produtos.map(p => `
              <tr>
                <td class="py-2 text-slate-500">${p.id.slice(0, 8)}...</td>
                <td class="font-bold text-white">${p.nome}</td>
                <td class="text-emerald-400">R$ ${p.preco.toFixed(2)}</td>
                <td><span class="px-2 py-0.5 rounded bg-slate-800 ${p.estoque > 0 ? 'text-cyan-300' : 'text-rose-400'}">${p.estoque} un.</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tabela de Pedidos Cacheados -->
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">Histórico Replicado (Projeção de Pedidos)</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs font-mono">
          <thead class="text-slate-400 border-b border-slate-800">
            <tr>
              <th class="py-2">Pedido ID</th>
              <th>Item Comprado</th>
              <th>Quantidade</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 text-slate-300">
            ${pedidos.map(p => `
              <tr>
                <td class="py-2 text-slate-500">${p.id.slice(0, 8)}...</td>
                <td class="text-white">${p.nomeProduto}</td>
                <td>${p.quantidade} un.</td>
                <td class="text-emerald-400 font-bold">R$ ${p.valorTotal.toFixed(2)}</td>
                <td>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'REALIZADO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}">
                    ${p.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

  </div>
</body>
</html>`);
  } catch (err) {
    res.status(500).send('Erro ao renderizar dashboard CQRS.');
  }
});

app.listen(PORT, () => {
  console.log(`[ms-query] Query Service (CQRS) ativo em http://localhost:${PORT}`);
  brokerClient.iniciar();
});
