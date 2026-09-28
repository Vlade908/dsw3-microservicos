import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, RefreshCw, ServerOff } from 'lucide-react';
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
  
  // Estado dos dados principais
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

  // Item selecionado para compra a partir da vitrine
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

  // Checagem de Saúde nos dois nós de backend
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

  // Carregamento de Produtos
  const carregarProdutos = useCallback(async () => {
    setLoadingProdutos(true);
    setErroProdutos(null);
    try {
      const response = await produtosApi.get('/produtos');
      setProdutos(response.data);
      setProdutosOnline(true);
    } catch (err) {
      console.error('Falha ao carregar catálogo:', err);
      setErroProdutos('Não foi possível obter os produtos do ms-produtos (:3001).');
      setProdutosOnline(false);
    } finally {
      setLoadingProdutos(false);
    }
  }, []);

  // Carregamento de Pedidos
  const carregarPedidos = useCallback(async () => {
    setLoadingPedidos(true);
    setErroPedidos(null);
    try {
      const response = await pedidosApi.get('/pedidos');
      setPedidos(response.data);
      setPedidosOnline(true);
    } catch (err) {
      console.error('Falha ao carregar pedidos:', err);
      setErroPedidos('Não foi possível obter o histórico de compras do ms-pedidos (:3002).');
      setPedidosOnline(false);
    } finally {
      setLoadingPedidos(false);
    }
  }, []);

  // Polling de saúde contínuo a cada 10s
  useEffect(() => {
    checkHealth();
    carregarProdutos();
    carregarPedidos();

    const interval = setInterval(() => {
      checkHealth();
    }, 10000);

    return () => clearInterval(interval);
  }, [checkHealth, carregarProdutos, carregarPedidos]);

  function handleSelecionarParaCompra(produto) {
    setProdutoPreSelecionado(produto);
    setActiveTab('pedido');
  }

  function handlePedidoRealizado() {
    carregarProdutos();
    carregarPedidos();
  }

  const algumServicoOffline = !produtosOnline || !pedidosOnline;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased">
      
      {/* Banner de Alta Visibilidade para Tolerância a Falhas ao Vivo (Regra 3) */}
      {algumServicoOffline && (
        <div 
          className="bg-rose-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs animate-fade-in-up"
          role="alert"
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ServerOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
              <span>
                <strong>Aviso de Resiliência:</strong>{' '}
                {!produtosOnline && !pedidosOnline
                  ? 'Os dois microsserviços (produtos e pedidos) estão offline.'
                  : !produtosOnline
                  ? 'O ms-produtos (:3001) está offline. A visualização de catálogo e validação síncrona foram pausadas.'
                  : 'O ms-pedidos (:3002) está offline. O processamento e histórico de pedidos estão pausados.'}
                {' '}A interface continua operando com degradação graciosa.
              </span>
            </div>

            <button
              onClick={() => {
                checkHealth();
                carregarProdutos();
                carregarPedidos();
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg transition-all active:scale-95 flex-shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${checkingHealth ? 'animate-spin' : ''}`} />
              <span>Reconectar</span>
            </button>
          </div>
        </div>
      )}

      {/* Topo com Navegação e Monitor de Serviços */}
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
        totalProdutos={produtos.length}
        totalPedidos={pedidos.length}
      />

      {/* Conteúdo Principal com Animação Fluida */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in-up" key={activeTab}>
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
        </div>
      </main>

      {/* Rodapé Comercial Limpo */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-slate-700">
            NEXUS TECH STORE • Arquitetura de Microserviços
          </p>
          <p className="text-slate-400">
            IFSP • Câmpus Capivari • Projeto Prático DSW 3 • Prof. Me. André Luís Bordignon
          </p>
        </div>
      </footer>

      {/* Container Flutuante de Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
