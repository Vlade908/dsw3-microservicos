import prisma from '../database/prisma.js';

const BROKER_URL = process.env.BROKER_URL || 'http://localhost:3003';
const SERVICE_URL = process.env.SERVICE_URL || (process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3004');

export const brokerClient = {
  /**
   * Conecta e registra as subscrições no broker para tópicos de produtos e pedidos
   */
  async iniciar() {
    try {
      // 1. Assinar tópico de produtos
      const resProdutos = await fetch(`${BROKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId: 'ms-query-produtos',
          topic: 'produtos',
          webhookUrl: `${SERVICE_URL}/eventos`
        })
      });

      // 2. Assinar tópico de pedidos
      const resPedidos = await fetch(`${BROKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId: 'ms-query-pedidos',
          topic: 'pedidos',
          webhookUrl: `${SERVICE_URL}/eventos`
        })
      });

      if (resProdutos.ok && resPedidos.ok) {
        console.log(`[ms-query] Inscrito com sucesso no broker (${BROKER_URL}) para os tópicos "produtos" e "pedidos"`);
        this.hidratarProjeçõesIniciais();
      }
    } catch (err) {
      console.warn(`[ms-query] Broker (${BROKER_URL}) temporariamente inacessível. Tentando reconectar em 5s...`);
      setTimeout(() => this.iniciar(), 5000);
    }
  },

  /**
   * Hidrata as projeções de leitura se o banco estiver vazio no primeiro boot
   */
  async hidratarProjeçõesIniciais() {
    try {
      // 1. Hidratar produtos
      const countProd = await prisma.queryProduto.count();
      if (countProd === 0) {
        const prodUrl = process.env.PRODUTOS_SERVICE_URL || 'http://localhost:3001';
        const res = await fetch(`${prodUrl}/produtos`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const prods = await res.json();
          for (const p of prods) {
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
          console.log(`[ms-query] Projeção de produtos hidratada com ${prods.length} registros.`);
        }
      }

      // 2. Hidratar pedidos
      const countPed = await prisma.queryPedido.count();
      if (countPed === 0) {
        const pedUrl = process.env.PEDIDOS_SERVICE_URL || 'http://localhost:3002';
        const res = await fetch(`${pedUrl}/pedidos`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const pedidos = await res.json();
          for (const ped of pedidos) {
            await prisma.queryPedido.upsert({
              where: { id: ped.id },
              create: {
                id: ped.id,
                produtoId: ped.produtoId,
                nomeProduto: ped.nomeProduto,
                precoUnitario: Number(ped.precoUnitario),
                quantidade: ped.quantidade,
                valorTotal: Number(ped.valorTotal),
                dataPedido: new Date(ped.dataPedido),
                status: ped.status
              },
              update: {
                status: ped.status
              }
            });
          }
          console.log(`[ms-query] Projeção de pedidos hidratada com ${pedidos.length} registros.`);
        }
      }
    } catch (err) {
      console.warn('[ms-query] Nota: Hidratação síncrona inicial ignorada. Projeção será alimentada via Event Broker.');
    }
  }
};

export default brokerClient;
