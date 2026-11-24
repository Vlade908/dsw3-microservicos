import axios from 'axios';
import prisma from '../database/prisma.js';

const PRODUTOS_BASE_URL = process.env.PRODUTOS_SERVICE_URL || 'http://localhost:3001';

const httpClient = axios.create({
  baseURL: PRODUTOS_BASE_URL,
  timeout: 2000 // Timeout rápido para acionar fallback sem travar o cliente
});

/**
 * Cliente HTTP resiliente para service-to-service com fallback para Cache Local (Materialized View)
 */
export const produtoClient = {
  /**
   * Buscar detalhes do produto no catálogo ativo (HTTP síncrono) ou no Cache Local Replicado
   * @param {string} produtoId
   * @param {{ strict?: boolean }} options
   */
  async obterProdutoPorId(produtoId, { strict = false } = {}) {
    try {
      const response = await httpClient.get(`/produtos/${produtoId}`);
      const produto = response.data;

      // Mantém o cache local atualizado em background
      prisma.produtoCache.upsert({
        where: { id: produto.id },
        create: {
          id: produto.id,
          nome: produto.nome,
          preco: Number(produto.preco),
          estoque: produto.estoque,
          descricao: produto.descricao || null,
          imagemUrl: produto.imagemUrl || null
        },
        update: {
          nome: produto.nome,
          preco: Number(produto.preco),
          estoque: produto.estoque,
          descricao: produto.descricao || null,
          imagemUrl: produto.imagemUrl || null
        }
      }).catch(err => {
        console.warn('[ms-pedidos] Aviso ao atualizar ProdutoCache:', err.message);
      });

      return { success: true, data: produto, fromCache: false };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // Remove item obsoleto do cache local caso tenha sido excluído no catálogo oficial
        prisma.produtoCache.deleteMany({ where: { id: produtoId } }).catch(() => {});
        return {
          success: false,
          status: 404,
          error: 'Produto informado não existe no catálogo.'
        };
      }

      const allowFallback = !strict && process.env.USE_CACHE_FALLBACK !== 'false';
      if (allowFallback) {
        // Falha de rede, timeout ou ms-produtos offline: acionar Fallback do Cache Local
        console.warn(`[ms-pedidos] ms-produtos indisponível (${error.code || error.message}). Consultando Cache Local Replicado...`);
        try {
          const cached = await prisma.produtoCache.findUnique({ where: { id: produtoId } });
          if (cached) {
            console.log(`[ms-pedidos] RESILIÊNCIA ATIVA: Utilizando dados de "${cached.nome}" do Cache Local do ms-pedidos.`);
            return { success: true, data: cached, fromCache: true };
          }
        } catch (cacheErr) {
          console.error('[ms-pedidos] Erro ao consultar cache local:', cacheErr);
        }
      }

      // Em modo síncrono estrito ou se não estiver nem no catálogo remoto nem no cache local
      return {
        success: false,
        status: 503,
        error: strict
          ? 'Serviço de Produtos indisponível para validação síncrona estrita.'
          : 'Serviço de Produtos temporariamente indisponível e item não encontrado no cache local.'
      };
    }
  },

  /**
   * Reservar/decrementar estoque do produto de forma síncrona e idempotente
   */
  async decrementarEstoque(produtoId, quantidade, idempotencyKey) {
    try {
      const response = await httpClient.patch(`/produtos/${produtoId}/estoque`, {
        quantidade,
        operacao: 'subtrair',
        idempotencyKey
      });
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response && (error.response.status === 400 || error.response.status === 404)) {
        return {
          success: false,
          businessError: true,
          status: error.response.status,
          error: error.response.data?.error || 'Erro de validação ao reservar estoque.'
        };
      }
      console.warn(`[ms-pedidos] Aviso ao atualizar estoque no ms-produtos via HTTP (${error.message}). O broker cuidará da entrega garantida.`);
      return {
        success: false,
        businessError: false,
        status: 503,
        error: error.message
      };
    }
  },

  /**
   * Estornar estoque do produto após cancelamento ou compensação (Saga)
   */
  async incrementarEstoque(produtoId, quantidade, idempotencyKey) {
    try {
      const response = await httpClient.patch(`/produtos/${produtoId}/estoque`, {
        quantidade,
        operacao: 'adicionar',
        idempotencyKey
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.warn(`[ms-pedidos] Aviso ao estornar estoque no ms-produtos via HTTP (${error.message}). O broker cuidará da entrega garantida.`);
      return { success: false, error: error.message };
    }
  }
};

export default produtoClient;
