import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import Header from './components/Header';
import CatalogoProdutos from './components/CatalogoProdutos';
import FormularioPedido from './components/FormularioPedido';
import HistoricoPedidos from './components/HistoricoPedidos';
import GerenciarLoja from './components/GerenciarLoja';
import Footer from './components/Footer';
import StatusServicosPopover from './components/StatusServicosPopover';
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
  const [buscaGlobal, setBuscaGlobal] = useState('');
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  // Dados reais carregados das APIs
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [erroProdutos, setErroProdutos] = useState(null);

  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [erroPedidos, setErroPedidos] = useState(null);

  // Saúde dos 4 microsserviços
  const [produtosOnline, setProdutosOnline] = useState(true);
  const [pedidosOnline, setPedidosOnline] = useState(true);
  const [brokerOnline, setBrokerOnline] = useState(true);
  const [queryOnline, setQueryOnline] = useState(true);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Item selecionado para compra
  const [produtoPreSelecionado, setProdutoPreSelecionado] = useState(null);

  // Toasts
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

  const carregarProdutos = useCallback(async () => {
    setLoadingProdutos(true);
    setErroProdutos(null);
    try {
      const response = await produtosApi.get('/produtos');
      setProdutos(response.data);
      setProdutosOnline(true);
      try {
        localStorage.setItem('dsw3_produtos_cache', JSON.stringify(response.data));
      } catch (_) {}
    } catch (err) {
      setProdutosOnline(false);
      try {
        const queryRes = await queryApi.get('/query/produtos');
        if (Array.isArray(queryRes.data)) {
          setProdutos(queryRes.data);
          setErroProdutos(null);
          try {
            localStorage.setItem('dsw3_produtos_cache', JSON.stringify(queryRes.data));
          } catch (_) {}
          return;
        }
      } catch (_) {}

      const cached = localStorage.getItem('dsw3_produtos_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProdutos(parsed);
            setErroProdutos(null);
            return;
          }
        } catch (_) {}
      }
      setErroProdutos(
        'Não foi possível obter os produtos do ms-produtos (:3001) nem do Query Service (:3004).'
      );
    } finally {
      setLoadingProdutos(false);
    }
  }, []);

  const carregarPedidos = useCallback(async () => {
    setLoadingPedidos(true);
    setErroPedidos(null);
    try {
      const response = await pedidosApi.get('/pedidos');
      setPedidos(response.data);
      setPedidosOnline(true);
    } catch (err) {
      setPedidosOnline(false);
      try {
        const queryRes = await queryApi.get('/query/pedidos');
        if (Array.isArray(queryRes.data)) {
          setPedidos(queryRes.data);
          setErroPedidos(null);
          return;
        }
      } catch (_) {}

      console.error('Falha ao carregar pedidos:', err);
      setErroPedidos(
        'Não foi possível obter o histórico de compras do ms-pedidos (:3002) nem do Query Service.'
      );
    } finally {
      setLoadingPedidos(false);
    }
  }, []);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePedidoRealizado() {
    carregarProdutos();
    carregarPedidos();
  }

  function handleReconectarTudo() {
    checkHealth();
    carregarProdutos();
    carregarPedidos();
  }

  const algumServicoOffline = !produtosOnline || !pedidosOnline;

  return (
    <div className="min-h-screen bg-surface flex flex-col text-on-surface antialiased">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        busca={buscaGlobal}
        onBuscaChange={setBuscaGlobal}
        produtosOnline={produtosOnline}
        pedidosOnline={pedidosOnline}
        brokerOnline={brokerOnline}
        queryOnline={queryOnline}
        totalProdutos={produtos.length}
        totalPedidos={pedidos.length}
        temItemCheckout={Boolean(produtoPreSelecionado)}
        onToggleStatusPopover={() => setStatusPopoverOpen((prev) => !prev)}
      />

      <main className="flex-1 w-full pt-16">
        {algumServicoOffline && (
          <section
            className="w-full bg-surface-container-low/95 backdrop-blur-md border-b border-surface-container shadow-sm transition-all duration-300"
            role="alert"
          >
            <div className="max-w-7xl mx-auto px-5 md:px-10 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-on-surface">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center text-tertiary flex-shrink-0">
                  <ShieldAlert className="w-4 h-4 animate-pulse" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-xs font-semibold tracking-tight text-on-surface shrink-0">
                    Modo de fila segura ativo
                  </span>
                  <span className="hidden sm:inline text-outline-variant text-xs">•</span>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {!produtosOnline && !pedidosOnline
                      ? 'Os serviços transacionais (produtos e pedidos) estão offline. Consultas seguem ativas via ms-query (:3004) e comandos serão enfileirados no Event Broker (:3003).'
                      : !produtosOnline
                      ? 'O ms-produtos (:3001) está offline. O catálogo segue disponível via ms-query/cache, compras usam o Cache Replicado e alterações são enfileiradas no Broker (:3003).'
                      : 'O ms-pedidos (:3002) está offline, mas você pode finalizar compras normalmente: novos pedidos e cancelamentos são enfileirados no Event Broker (:3003).'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-shrink-0 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setStatusPopoverOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest shadow-sm border border-surface-container text-[11px] text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  <span className="font-medium">Ver serviços</span>
                </button>
                <button
                  type="button"
                  onClick={handleReconectarTudo}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-container text-on-primary text-xs font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
                  <span>Reconectar</span>
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="animate-fade-in-up" key={activeTab}>
          {activeTab === 'catalogo' && (
            <CatalogoProdutos
              produtos={produtos}
              pedidos={pedidos}
              loading={loadingProdutos}
              erro={erroProdutos}
              produtosOnline={produtosOnline}
              pedidosOnline={pedidosOnline}
              onRecarregar={carregarProdutos}
              onSelecionarParaCompra={handleSelecionarParaCompra}
              onIrParaGerenciar={() => setActiveTab('gerenciar')}
              busca={buscaGlobal}
              onBuscaChange={setBuscaGlobal}
            />
          )}

          {activeTab === 'pedido' && (
            <FormularioPedido
              produtos={produtos}
              produtoPreSelecionado={produtoPreSelecionado}
              onLimparSelecao={() => setProdutoPreSelecionado(null)}
              onPedidoRealizado={handlePedidoRealizado}
              onVerHistorico={() => {
                setActiveTab('historico');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onVoltarVitrine={() => {
                setActiveTab('catalogo');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onToast={addToast}
            />
          )}

          {activeTab === 'historico' && (
            <HistoricoPedidos
              pedidos={pedidos}
              produtos={produtos}
              loading={loadingPedidos}
              erro={erroPedidos}
              onRecarregar={() => {
                carregarPedidos();
                carregarProdutos();
              }}
              onVoltarVitrine={() => {
                setActiveTab('catalogo');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onToast={addToast}
            />
          )}

          {activeTab === 'gerenciar' && (
            <GerenciarLoja
              produtos={produtos}
              loading={loadingProdutos}
              erro={erroProdutos}
              produtosOnline={produtosOnline}
              onRecarregar={carregarProdutos}
              onVoltarVitrine={() => {
                setActiveTab('catalogo');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onToast={addToast}
            />
          )}
        </div>
      </main>

      <Footer
        produtosOnline={produtosOnline}
        pedidosOnline={pedidosOnline}
        brokerOnline={brokerOnline}
        queryOnline={queryOnline}
        onNavigateTab={setActiveTab}
        onToggleStatusPopover={() => setStatusPopoverOpen((prev) => !prev)}
      />

      <StatusServicosPopover
        isOpen={statusPopoverOpen}
        onClose={() => setStatusPopoverOpen(false)}
        produtosOnline={produtosOnline}
        pedidosOnline={pedidosOnline}
        brokerOnline={brokerOnline}
        queryOnline={queryOnline}
        checkingHealth={checkingHealth}
        onRefreshHealth={handleReconectarTudo}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
