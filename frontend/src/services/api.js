import axios from 'axios';

export const PRODUTOS_API_URL = import.meta.env.VITE_PRODUTOS_API_URL || 'http://localhost:3001';
export const PEDIDOS_API_URL = import.meta.env.VITE_PEDIDOS_API_URL || 'http://localhost:3002';

// Instância Axios para o Microserviço de Produtos
export const produtosApi = axios.create({
  baseURL: PRODUTOS_API_URL,
  timeout: 4000
});

// Instância Axios para o Microserviço de Pedidos
export const pedidosApi = axios.create({
  baseURL: PEDIDOS_API_URL,
  timeout: 4000
});

// Checagem de Saúde (Health Check)
export async function checkProdutosHealth() {
  try {
    const response = await produtosApi.get('/health', { timeout: 2000 });
    return { online: response.status === 200, data: response.data };
  } catch (error) {
    return { online: false, error: error.message };
  }
}

export async function checkPedidosHealth() {
  try {
    const response = await pedidosApi.get('/health', { timeout: 2000 });
    return { online: response.status === 200, data: response.data };
  } catch (error) {
    return { online: false, error: error.message };
  }
}

// Formatadores utilitários
export function formatarPreco(valor) {
  if (valor === undefined || valor === null || isNaN(valor)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(valor));
}

export function formatarData(dataIso) {
  if (!dataIso) return '-';
  const data = new Date(dataIso);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(data);
}
