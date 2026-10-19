import prisma from '../database/prisma.js';

const BROKER_URL = process.env.BROKER_URL || 'http://localhost:3003';
const SERVICE_URL = process.env.SERVICE_URL || (process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3001');

export const brokerClient = {
  /**
   * Conecta e registra a subscrição no broker
   */
  async iniciar() {
    try {
      // 1. Assinar tópico de pedidos para baixa e estorno de estoque
      const resPedidos = await fetch(`${BROKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId: 'ms-produtos',
          topic: 'pedidos',
          webhookUrl: `${SERVICE_URL}/eventos`
        })
      });

      // 2. Assinar tópico de produtos para comandos offline (Store-and-Forward)
      const resProdutos = await fetch(`${BROKER_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberId: 'ms-produtos-sync',
          topic: 'produtos',
          webhookUrl: `${SERVICE_URL}/eventos`
        })
      });

      if (resPedidos.ok && resProdutos.ok) {
        console.log(`[ms-produtos] Inscrito com sucesso no broker (${BROKER_URL}) para tópicos "pedidos" e "produtos"`);
        // Sincronizar catálogo para alimentar o cache do ms-pedidos
        this.sincronizarCatalogo();
      }
    } catch (err) {
      console.warn(`[ms-produtos] Broker (${BROKER_URL}) não disponível no momento. Tentará novamente em background.`);
      setTimeout(() => this.iniciar(), 5000);
    }
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
        console.log(`[ms-produtos] Evento [${topic}] ${event} enviado ao broker.`);
      }
    } catch (err) {
      console.warn(`[ms-produtos] Falha ao enviar evento [${topic}] ${event} ao broker:`, err.message);
    }
  },

  /**
   * Publica lista completa de produtos para popular cache do ms-pedidos
   */
  async sincronizarCatalogo() {
    try {
      const produtos = await prisma.produto.findMany();
      await this.publicarEvento('produtos', 'CATALOGO_SYNC', produtos);
      console.log(`[ms-produtos] Sincronização de catálogo enviada ao broker (${produtos.length} itens).`);
    } catch (err) {
      console.warn('[ms-produtos] Falha ao sincronizar catálogo inicial:', err.message);
    }
  }
};

export default brokerClient;
