import axios from 'axios';

const PRODUTOS_BASE_URL = process.env.PRODUTOS_SERVICE_URL || 'http://localhost:3001';

const httpClient = axios.create({
  baseURL: PRODUTOS_BASE_URL,
  timeout: 3500 // Timeout para degradação graciosa rápida
});

/**
 * Cliente HTTP para comunicação síncrona service-to-service com o ms-produtos
 */
export const produtoClient = {
  /**
   * Buscar detalhes do produto no catálogo ativo
   * @param {string} produtoId 
   */
  async obterProdutoPorId(produtoId) {
    try {
      const response = await httpClient.get(`/produtos/${produtoId}`);
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response) {
        // ms-produtos respondeu com código de erro HTTP
        if (error.response.status === 404) {
          return {
            success: false,
            status: 404,
            error: 'Produto informado não existe no catálogo.'
          };
        }
        return {
          success: false,
          status: error.response.status,
          error: error.response.data?.error || 'Erro reportado pelo serviço de produtos.'
        };
      }

      // Erro de rede, timeout ou serviço offline
      return {
        success: false,
        status: 503,
        error: 'Serviço de Produtos temporariamente indisponível para validação.'
      };
    }
  },

  /**
   * Atualizar estoque do produto após confirmação de venda
   * @param {string} produtoId 
   * @param {number} quantidade 
   */
  async decrementarEstoque(produtoId, quantidade) {
    try {
      await httpClient.patch(`/produtos/${produtoId}/estoque`, {
        quantidade,
        operacao: 'subtrair'
      });
      return { success: true };
    } catch (error) {
      console.warn(`[ms-pedidos] Aviso ao atualizar estoque no ms-produtos para o produto ${produtoId}:`, error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Estornar estoque do produto após cancelamento de pedido
   * @param {string} produtoId 
   * @param {number} quantidade 
   */
  async incrementarEstoque(produtoId, quantidade) {
    try {
      await httpClient.patch(`/produtos/${produtoId}/estoque`, {
        quantidade,
        operacao: 'adicionar'
      });
      return { success: true };
    } catch (error) {
      console.warn(`[ms-pedidos] Aviso ao estornar estoque no ms-produtos para o produto ${produtoId}:`, error.message);
      return { success: false, error: error.message };
    }
  }
};

export default produtoClient;
