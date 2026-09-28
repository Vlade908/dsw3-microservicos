import prisma from '../database/prisma.js';

const BROKER_URL = process.env.BROKER_URL || 'http://localhost:3003';
const SERVICE_URL = process.env.SERVICE_URL || (process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3002');

export const brokerClient = {
  /**
   * Conecta e registra a subscrição no broker
   */
  async iniciar() {
    try {
      const response = await fetch(`${BROKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId: 'ms-pedidos',
          topic: 'produtos',
          webhookUrl: `${SERVICE_URL}/eventos`
        })
      });

      if (response.ok) {
        console.log(`[ms-pedidos] Inscrito com sucesso no broker (${BROKER_URL}) para o tópico "produtos"`);
        this.sincronizarCacheInicial();
      }
    } catch (err) {
      console.warn(`[ms-pedidos] Broker (${BROKER_URL}) não disponível no momento. Tentará novamente em background.`);
      setTimeout(() => this.iniciar(), 5000);
    }
  },

  /**
   * Se o cache local estiver vazio no primeiro boot, tenta hidratar a partir do ms-produtos
   */
  async sincronizarCacheInicial() {
    try {
      const count = await prisma.produtoCache.count();
      if (count === 0) {
        const produtosUrl = process.env.PRODUTOS_SERVICE_URL || 'http://localhost:3001';
        const res = await fetch(`${produtosUrl}/produtos`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const produtos = await res.json();
          for (const prod of produtos) {
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
          console.log(`[ms-pedidos] Cache local inicial populado com ${produtos.length} produtos.`);
        }
      }
    } catch (_) {}
  },

  /**
   * Publicar um evento no Barramento
   */
  async publicarEvento(topic, event, payload) {
    try {
      const response = await fetch(`${BROKER_URL}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, event, payload })
      });
      if (response.ok) {
        console.log(`[ms-pedidos] Evento [${topic}] ${event} enviado ao broker com sucesso.`);
      }
    } catch (err) {
      console.warn(`[ms-pedidos] Falha ao enviar evento [${topic}] ${event} ao broker:`, err.message);
    }
  }
};

export default brokerClient;
