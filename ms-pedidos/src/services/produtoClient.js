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
   * Buscar detalhes do produto no catálogo ativo ou no Cache Local Replicado
   * @param {string} produtoId 
   */
  async obterProdutoPorId(produtoId) {
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
          descricao: produto.descricao || null
        },
        update: {
          nome: produto.nome,
          preco: Number(produto.preco),
          estoque: produto.estoque,
          descricao: produto.descricao || null
        }
      }).catch(err => {
        console.warn('[ms-pedidos] Aviso ao atualizar ProdutoCache:', err.message);
      });

      return { success: true, data: produto, fromCache: false };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return {
          success: false,
          status: 404,
          error: 'Produto informado não existe no catálogo.'
        };
      }

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

      // Se não estiver nem no catálogo remoto nem no cache local
      return {
        success: false,
        status: 503,
        error: 'Serviço de Produtos temporariamente indisponível e item não encontrado no cache local.'
      };
    }
  },

  /**
   * Atualizar estoque do produto após confirmação de venda (compatibilidade direta)
   */
  async decrementarEstoque(produtoId, quantidade) {
    try {
      await httpClient.patch(`/produtos/${produtoId}/estoque`, {
        quantidade,
        operacao: 'subtrair'
      });
      return { success: true };
    } catch (error) {
      console.warn(`[ms-pedidos] Aviso ao atualizar estoque no ms-produtos via HTTP (${error.message}). O broker cuidará da entrega garantida.`);
      return { success: false, error: error.message };
    }
  },

  /**
   * Estornar estoque do produto após cancelamento de pedido (compatibilidade direta)
   */
  async incrementarEstoque(produtoId, quantidade) {
    try {
      await httpClient.patch(`/produtos/${produtoId}/estoque`, {
        quantidade,
        operacao: 'adicionar'
      });
      return { success: true };
    } catch (error) {
      console.warn(`[ms-pedidos] Aviso ao estornar estoque no ms-produtos via HTTP (${error.message}). O broker cuidará da entrega garantida.`);
      return { success: false, error: error.message };
    }
  }
};

export default produtoClient;
