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
  queryApi,
  checkProdutosHealth,
  checkPedidosHealth,
  checkBrokerHealth,
  checkQueryHealth
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
  const [brokerOnline, setBrokerOnline] = useState(true);
  const [queryOnline, setQueryOnline] = useState(true);
  const [usandoCacheProdutos, setUsandoCacheProdutos] = useState(false);
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

  // Checagem de Saúde nos nós de backend, barramento e query service
  const checkHealth = useCallback(async () => {
    setCheckingHealth(true);
    const [hProdutos, hPedidos, hBroker, hQuery] = await Promise.all([
      checkProdutosHealth(),
      checkPedidosHealth(),
      checkBrokerHealth(),
      checkQueryHealth()
    ]);
    setProdutosOnline(hProdutos.online);
    setPedidosOnline(hPedidos.online);
    setBrokerOnline(hBroker.online);
    setQueryOnline(hQuery.online);
    setCheckingHealth(false);
  }, []);

  // Carregamento de Produtos com Fallback no Query Service e Cache Local
  const carregarProdutos = useCallback(async () => {
    setLoadingProdutos(true);
    setErroProdutos(null);
    try {
      const response = await produtosApi.get('/produtos');
      setProdutos(response.data);
      setProdutosOnline(true);
      setUsandoCacheProdutos(false);
      try {
        localStorage.setItem('dsw3_produtos_cache', JSON.stringify(response.data));
      } catch (_) {}
    } catch (err) {
      setProdutosOnline(false);
      // 1. Tentar consultar no Query Service (ms-query :3004)
      try {
        const queryRes = await queryApi.get('/query/produtos');
        if (Array.isArray(queryRes.data)) {
          setProdutos(queryRes.data);
          setUsandoCacheProdutos(true);
          setErroProdutos(null);
          try {
            localStorage.setItem('dsw3_produtos_cache', JSON.stringify(queryRes.data));
          } catch (_) {}
          console.log('[frontend] RESILIÊNCIA CQRS: Catálogo obtido via ms-query (:3004).');
          return;
        }
      } catch (_) {}

      // 2. Tentar recuperar do localStorage se o Query Service também estiver fora
      const cached = localStorage.getItem('dsw3_produtos_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProdutos(parsed);
            setUsandoCacheProdutos(true);
            setErroProdutos(null);
            console.log('[frontend] RESILIÊNCIA ATIVA: Vitrine renderizada via Cache Local.');
            return;
          }
        } catch (_) {}
      }
      setErroProdutos('Não foi possível obter os produtos do ms-produtos (:3001) nem do Query Service (:3004).');
    } finally {
      setLoadingProdutos(false);
    }
  }, []);

  // Carregamento de Pedidos com Fallback no Query Service
  const carregarPedidos = useCallback(async () => {
    setLoadingPedidos(true);
    setErroPedidos(null);
    try {
      const response = await pedidosApi.get('/pedidos');
      setPedidos(response.data);
      setPedidosOnline(true);
    } catch (err) {
      setPedidosOnline(false);
      // Tentar consultar histórico no Query Service (ms-query :3004)
      try {
        const queryRes = await queryApi.get('/query/pedidos');
        if (Array.isArray(queryRes.data)) {
          setPedidos(queryRes.data);
          setErroPedidos(null);
          console.log('[frontend] RESILIÊNCIA CQRS: Histórico obtido via ms-query (:3004).');
          return;
        }
      } catch (_) {}

      console.error('Falha ao carregar pedidos:', err);
      setErroPedidos('Não foi possível obter o histórico de compras do ms-pedidos (:3002) nem do Query Service.');
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
                  ? 'O ms-produtos (:3001) está offline. O frontend está operando com Cache Local e o ms-pedidos (:3002) continuará efetuando compras com Cache Replicado e enfileirando eventos no Broker (:3003)!'
                  : 'O ms-pedidos (:3002) está offline. O catálogo continua navegável e as operações serão processadas assim que o serviço recuperar.'}
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
        brokerOnline={brokerOnline}
        queryOnline={queryOnline}
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
