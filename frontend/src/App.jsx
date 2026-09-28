import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import CatalogoProdutos from './components/CatalogoProdutos';
import FormularioPedido from './components/FormularioPedido';
import HistoricoPedidos from './components/HistoricoPedidos';
import ToastContainer from './components/Toast';
import {
  produtosApi,
  pedidosApi,
  checkProdutosHealth,
  checkPedidosHealth
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('catalogo');
  
  // Dados principais
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [erroProdutos, setErroProdutos] = useState(null);

  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [erroPedidos, setErroPedidos] = useState(null);

  // Monitoramento de saúde dos microserviços
  const [produtosOnline, setProdutosOnline] = useState(true);
  const [pedidosOnline, setPedidosOnline] = useState(true);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Produto selecionado a partir do Catálogo para o Formulário de Pedido
  const [produtoPreSelecionado, setProdutoPreSelecionado] = useState(null);

  // Sistema de Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message }) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Checagem de Saúde de ambos os microserviços
  const checkHealth = useCallback(async () => {
    setCheckingHealth(true);
    const [hProdutos, hPedidos] = await Promise.all([
      checkProdutosHealth(),
      checkPedidosHealth()
    ]);
    setProdutosOnline(hProdutos.online);
    setPedidosOnline(hPedidos.online);
    setCheckingHealth(false);
  }, []);

  // Carregar Catálogo de Produtos
  const carregarProdutos = useCallback(async () => {
    setLoadingProdutos(true);
    setErroProdutos(null);
    try {
      const response = await produtosApi.get('/produtos');
      setProdutos(response.data);
      setProdutosOnline(true);
    } catch (err) {
      console.error('Falha ao carregar produtos:', err);
      setErroProdutos('Não foi possível carregar o catálogo de produtos.');
      setProdutosOnline(false);
    } finally {
      setLoadingProdutos(false);
    }
  }, []);

  // Carregar Histórico de Pedidos
  const carregarPedidos = useCallback(async () => {
    setLoadingPedidos(true);
    setErroPedidos(null);
    try {
      const response = await pedidosApi.get('/pedidos');
      setPedidos(response.data);
      setPedidosOnline(true);
    } catch (err) {
      console.error('Falha ao carregar pedidos:', err);
      setErroPedidos('Não foi possível obter o histórico de pedidos.');
      setPedidosOnline(false);
    } finally {
      setLoadingPedidos(false);
    }
  }, []);

  // Inicialização e polling de saúde a cada 12 segundos
  useEffect(() => {
    checkHealth();
    carregarProdutos();
    carregarPedidos();

    const interval = setInterval(() => {
      checkHealth();
    }, 12000);

    return () => clearInterval(interval);
  }, [checkHealth, carregarProdutos, carregarPedidos]);

  // Ação ao clicar em "Comprar" no Catálogo
  function handleSelecionarParaCompra(produto) {
    setProdutoPreSelecionado(produto);
    setActiveTab('pedido');
  }

  // Ação ao concluir pedido
  function handlePedidoRealizado() {
    carregarProdutos();
    carregarPedidos();
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased">
      
      {/* Topo com Navegação e Status */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        produtosOnline={produtosOnline}
        pedidosOnline={pedidosOnline}
        checkingHealth={checkingHealth}
        onRefreshHealth={() => {
          checkHealth();
          carregarProdutos();
          carregarPedidos();
        }}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'catalogo' && (
          <CatalogoProdutos
            produtos={produtos}
            loading={loadingProdutos}
            erro={erroProdutos}
            onRecarregar={carregarProdutos}
            onSelecionarParaCompra={handleSelecionarParaCompra}
            onToast={addToast}
          />
        )}

        {activeTab === 'pedido' && (
          <FormularioPedido
            produtos={produtos}
            produtoPreSelecionado={produtoPreSelecionado}
            onPedidoRealizado={handlePedidoRealizado}
            onVerHistorico={() => setActiveTab('historico')}
            onToast={addToast}
          />
        )}

        {activeTab === 'historico' && (
          <HistoricoPedidos
            pedidos={pedidos}
            loading={loadingPedidos}
            erro={erroPedidos}
            onRecarregar={() => {
              carregarPedidos();
              carregarProdutos();
            }}
            onToast={addToast}
          />
        )}
      </main>

      {/* Rodapé Informativo */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            DSW 3 — Projeto Prático de Arquitetura de Microserviços
          </p>
          <p>
            IFSP • Câmpus Capivari • Engenharia de Software & Sistemas Distribuídos
          </p>
        </div>
      </footer>

      {/* Container Flutuante de Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
