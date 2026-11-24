import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  Lock,
  ShieldCheck,
  ChevronRight,
  Search,
  Printer,
  Ban,
  Info
} from 'lucide-react';
import ProdutoAvatar from './ProdutoAvatar';
import { pedidosApi, brokerApi, formatarPreco, formatarData } from '../services/api';

export default function HistoricoPedidos({
  pedidos,
  produtos = [],
  loading,
  erro,
  onRecarregar,
  onVoltarVitrine,
  onToast
}) {
  const [filtroStatus, setFiltroStatus] = useState('todos'); // 'todos', 'REALIZADO', 'CANCELADO'
  const [buscaPedido, setBuscaPedido] = useState('');
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState(null);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState(null);
  const [cancelandoId, setCancelandoId] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);

  const produtosPorId = useMemo(() => {
    const map = new Map();
    for (const p of produtos) {
      map.set(p.id, p);
    }
    return map;
  }, [produtos]);

  const totalRealizados = useMemo(
    () => pedidos.filter((p) => p.status === 'REALIZADO').length,
    [pedidos]
  );
  const totalCancelados = useMemo(
    () => pedidos.filter((p) => p.status === 'CANCELADO').length,
    [pedidos]
  );
  const totalFaturado = useMemo(
    () =>
      pedidos
        .filter((p) => p.status === 'REALIZADO')
        .reduce((acc, p) => acc + (p.valorTotal || 0), 0),
    [pedidos]
  );

  const pedidosFiltrados = useMemo(() => {
    const termo = buscaPedido.trim().toLowerCase();
    return pedidos.filter((p) => {
      const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus;
      const matchBusca =
        !termo ||
        p.id.toLowerCase().includes(termo) ||
        p.produtoId.toLowerCase().includes(termo) ||
        (p.nomeProduto && p.nomeProduto.toLowerCase().includes(termo));
      return matchStatus && matchBusca;
    });
  }, [pedidos, filtroStatus, buscaPedido]);

  const pedidoAtivo = useMemo(() => {
    if (pedidosFiltrados.length === 0) return null;
    return (
      pedidosFiltrados.find((p) => p.id === pedidoSelecionadoId) || pedidosFiltrados[0]
    );
  }, [pedidosFiltrados, pedidoSelecionadoId]);

  useEffect(() => {
    if (!pedidoParaCancelar) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setPedidoParaCancelar(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pedidoParaCancelar]);

  function copiarId(id, label = 'UUID do pedido copiado!') {
    navigator.clipboard.writeText(id);
    setCopiadoId(id);
    onToast?.({
      type: 'info',
      title: 'Copiado',
      message: label
    });
    setTimeout(() => setCopiadoId(null), 2000);
  }

  async function confirmarCancelamento() {
    if (!pedidoParaCancelar || pedidoParaCancelar.status === 'CANCELADO') return;

    const pedido = pedidoParaCancelar;
    setCancelandoId(pedido.id);
    try {
      await pedidosApi.patch(`/pedidos/${pedido.id}/cancelar`);
      onToast({
        type: 'success',
        title: 'Pedido Cancelado',
        message: `O pedido de "${pedido.nomeProduto}" foi cancelado e o estoque estornado com sucesso.`
      });
      setPedidoParaCancelar(null);
      onRecarregar();
    } catch (err) {
      console.error('Erro ao cancelar pedido:', err);
      const isBusinessError =
        err.response && (err.response.status === 400 || err.response.status === 404);

      if (!isBusinessError && (!err.response || err.response.status >= 500)) {
        try {
          await brokerApi.post('/publish', {
            topic: 'pedidos',
            event: 'PEDIDO_CANCELAR_COMANDO',
            payload: {
              pedidoId: pedido.id,
              produtoId: pedido.produtoId,
              quantidade: pedido.quantidade,
              estoqueJaAtualizado: false
            }
          });
          onToast({
            type: 'warning',
            title: 'Cancelamento Enfileirado (Store-and-Forward)',
            message: `ms-pedidos offline! O cancelamento de "${pedido.nomeProduto}" foi enfileirado no Event Broker (:3003) e será sincronizado automaticamente.`
          });
          setPedidoParaCancelar(null);
          await new Promise((r) => setTimeout(r, 150));
          onRecarregar();
          return;
        } catch (brokerErr) {
          console.error('Erro ao enfileirar cancelamento no broker:', brokerErr);
        }
      }

      const mensagem =
        err.response?.data?.error ||
        'Não foi possível cancelar o pedido nem via ms-pedidos (:3002) nem via Event Broker (:3003).';
      onToast({
        type: 'error',
        title: 'Falha no Cancelamento',
        message: mensagem
      });
    } finally {
      setCancelandoId(null);
    }
  }

  return (
    <div className="flex flex-col w-full">
      {/* Sub-header / Breadcrumb Bar */}
      <section className="w-full bg-surface-container-lowest/70 backdrop-blur-md border-b border-surface-container">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-3.5 flex flex-wrap items-center justify-between gap-3 text-on-surface-variant text-[11px]">
          <div className="flex items-center gap-1.5 tracking-tight">
            <button
              type="button"
              onClick={onVoltarVitrine}
              className="hover:text-on-surface transition-colors"
            >
              Vitrine
            </button>
            <span>/</span>
            <span className="text-on-surface font-medium text-xs">Meus Pedidos</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              <span>Snapshot Pattern Ativo</span>
            </span>
            <span className="hidden sm:inline text-outline-variant">|</span>
            <span className="text-xs text-on-surface font-medium tabular-nums">
              {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'} •{' '}
              {formatarPreco(totalFaturado)} realizados
            </span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-5 md:px-10 w-full py-10">
        <header className="mb-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-sans text-3xl sm:text-4xl font-semibold text-on-surface tracking-tight">
                Meus Pedidos
              </h1>
              <p className="text-sm sm:text-base text-on-surface-variant mt-1 max-w-2xl">
                Histórico em tempo real persistido em <code className="font-mono text-xs">ms-pedidos</code>{' '}
                com nome e preço unitário preservados por Snapshot.
              </p>
            </div>

            <button
              type="button"
              onClick={onRecarregar}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-lowest border border-surface-container text-xs font-medium text-on-surface hover:bg-surface-container transition-colors self-start sm:self-auto disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
              <span>Atualizar histórico</span>
            </button>
          </div>

          {/* Filtros Segmentados + Busca */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="inline-flex p-1 bg-surface-container-low rounded-full self-start border border-surface-container">
              <button
                type="button"
                onClick={() => setFiltroStatus('todos')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  filtroStatus === 'todos'
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Todos ({pedidos.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('REALIZADO')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  filtroStatus === 'REALIZADO'
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Realizados ({totalRealizados})
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('CANCELADO')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  filtroStatus === 'CANCELADO'
                    ? 'bg-surface-container-lowest text-on-surface shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Cancelados ({totalCancelados})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-on-surface-variant absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={buscaPedido}
                onChange={(e) => setBuscaPedido(e.target.value)}
                placeholder="Buscar por ID ou produto..."
                className="w-full bg-surface-container-lowest pl-10 pr-4 py-2 rounded-full text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant border border-surface-container focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
              />
            </div>
          </div>
        </header>

        {/* Alerta de Degradação Graciosa */}
        {erro && (
          <div className="mb-8 p-5 bg-error-container/40 border border-error/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-on-surface">
                  Histórico Temporariamente Indisponível
                </h4>
                <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                  {erro} A interface segue estável e sem perda de dados.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRecarregar}
              className="px-4 py-2 rounded-full bg-on-surface text-surface-container-lowest text-xs font-medium hover:opacity-90 transition-opacity self-start sm:self-auto"
            >
              Tentar Reconectar
            </button>
          </div>
        )}

        {/* Loading / Vazio / Master-Detail */}
        {loading ? (
          <div className="bg-surface-container-lowest rounded-[20px] border border-surface-container p-12 text-center text-on-surface-variant space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-container" />
            <p className="text-xs">Sincronizando pedidos e snapshots...</p>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-[20px] border border-surface-container p-12 text-center space-y-3">
            <Receipt className="w-9 h-9 mx-auto text-outline opacity-60" />
            <h3 className="font-semibold text-on-surface text-base">Nenhum pedido encontrado</h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
              {buscaPedido || filtroStatus !== 'todos'
                ? 'Nenhum registro corresponde aos filtros selecionados.'
                : 'Ainda não há pedidos registrados no banco do ms-pedidos.'}
            </p>
            <button
              type="button"
              onClick={onVoltarVitrine}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary-container text-white text-xs font-medium hover:bg-primary transition-colors"
            >
              Ir para a Vitrine
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna Esquerda: Lista de Pedidos */}
            <section aria-label="Lista de Pedidos" className="lg:col-span-8 space-y-4">
              {pedidosFiltrados.map((pedido) => {
                const cancelado = pedido.status === 'CANCELADO';
                const selecionado = pedidoAtivo?.id === pedido.id;
                const prodAtual = produtosPorId.get(pedido.produtoId);

                return (
                  <article
                    key={pedido.id}
                    className={`group relative bg-surface-container-lowest rounded-[20px] p-5 sm:p-6 border transition-all duration-200 ${
                      selecionado
                        ? 'border-primary/30 shadow-md'
                        : 'border-surface-container shadow-sm hover:shadow-md'
                    } ${cancelado ? 'opacity-90' : ''}`}
                  >
                    {selecionado && (
                      <div className="absolute left-0 top-7 bottom-7 w-1 bg-primary rounded-r-full" />
                    )}

                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-surface-container/70">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-on-surface-variant">
                        <span className="tabular-nums">{formatarData(pedido.dataPedido)}</span>
                        <span className="w-1 h-1 rounded-full bg-outline-variant" />
                        <span className="font-mono font-medium text-on-surface tracking-tight">
                          Pedido #{pedido.id.slice(0, 8)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copiarId(pedido.id)}
                          title="Copiar UUID completo do pedido"
                          className="p-1 text-on-surface-variant hover:text-primary transition-colors flex items-center rounded"
                        >
                          {copiadoId === pedido.id ? (
                            <Check className="w-3.5 h-3.5 text-apple-green" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${
                          cancelado
                            ? 'bg-[#fdf2f2] text-[#d70015]'
                            : 'bg-[#ebf9ee] text-[#1c7e2d]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cancelado ? 'bg-[#ff3b30]' : 'bg-[#34c759]'
                          }`}
                        />
                        {pedido.status}
                      </span>
                    </div>

                    {/* Corpo do Pedido */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pt-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-white border border-surface-container/70 shrink-0 ${
                            cancelado ? 'grayscale opacity-75' : ''
                          }`}
                        >
                          <ProdutoAvatar
                            nome={pedido.nomeProduto}
                            imagemUrl={prodAtual?.imagemUrl || null}
                            produtoId={pedido.produtoId}
                            compact
                          />
                        </div>

                        <div className="space-y-1.5">
                          <span className="font-mono text-[11px] text-outline block">
                            produtoId: {pedido.produtoId.slice(0, 8)}...
                          </span>
                          <h2
                            className={`font-sans text-lg font-semibold text-on-surface leading-tight ${
                              cancelado ? 'line-through opacity-70' : ''
                            }`}
                          >
                            {pedido.nomeProduto}
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="text-xs sm:text-sm text-on-surface font-medium tabular-nums">
                              {pedido.quantidade} un. × {formatarPreco(pedido.precoUnitario)}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant text-[11px]">
                              <Lock className="w-3 h-3 text-primary" />
                              <span>Snapshot Imutável</span>
                            </span>
                          </div>
                          {cancelado && (
                            <p className="text-[11px] text-on-surface-variant flex items-center gap-1 pt-0.5">
                              <Info className="w-3.5 h-3.5 text-tertiary" />
                              <span>Pedido cancelado • Estoque estornado para o catálogo</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Preço & Ações */}
                      <div className="flex flex-col md:items-end justify-between shrink-0 pt-2 md:pt-0">
                        <div className="md:text-right mb-3">
                          <span className="text-[11px] text-on-surface-variant block uppercase tracking-wider">
                            {cancelado ? 'Valor Estornado' : 'Valor Total'}
                          </span>
                          <span
                            className={`font-sans text-xl font-semibold tabular-nums ${
                              cancelado ? 'text-on-surface-variant line-through' : 'text-on-surface'
                            }`}
                          >
                            {formatarPreco(pedido.valorTotal)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setPedidoSelecionadoId(pedido.id)}
                            className={`px-4 py-2 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                              selecionado
                                ? 'bg-primary text-on-primary shadow-sm'
                                : 'bg-surface-container-low hover:bg-surface-container text-on-surface'
                            }`}
                          >
                            <span>Ver comprovante</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {!cancelado && (
                            <button
                              type="button"
                              onClick={() => setPedidoParaCancelar(pedido)}
                              disabled={cancelandoId === pedido.id}
                              className="px-4 py-2 rounded-full text-xs font-medium text-on-surface-variant hover:text-error hover:bg-error-container/25 transition-colors disabled:opacity-50"
                            >
                              {cancelandoId === pedido.id ? 'Estornando...' : 'Cancelar pedido'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            {/* Coluna Direita: Comprovante Oficial Sticky */}
            {pedidoAtivo && (
              <aside aria-label="Comprovante do Pedido" className="lg:col-span-4 w-full lg:sticky lg:top-24">
                <div className="bg-surface-container-lowest rounded-[20px] p-6 shadow-sm border border-surface-container relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-primary-container to-primary" />

                  <div className="flex items-center justify-between pb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-primary text-[11px] font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Snapshot Imutável</span>
                    </div>
                    <span className="text-[11px] font-mono text-on-surface-variant">ms-pedidos</span>
                  </div>

                  <div className="space-y-1 mb-5">
                    <h3 className="font-sans text-xl font-semibold text-on-surface">
                      Comprovante do Pedido
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Campos reais persistidos no momento da transação.
                    </p>
                  </div>

                  <div className="bg-surface-container-low rounded-xl p-3.5 space-y-2.5 mb-5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-on-surface-variant">id:</span>
                      <button
                        type="button"
                        onClick={() =>
                          copiarId(pedidoAtivo.id, 'UUID do pedido copiado para a área de transferência!')
                        }
                        className="font-mono text-on-surface font-medium hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <span className="truncate max-w-[160px]">{pedidoAtivo.id}</span>
                        <Copy className="w-3 h-3 shrink-0" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-on-surface-variant">produtoId:</span>
                      <button
                        type="button"
                        onClick={() =>
                          copiarId(
                            pedidoAtivo.produtoId,
                            'UUID do produto copiado para a área de transferência!'
                          )
                        }
                        className="font-mono text-on-surface font-medium hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <span className="truncate max-w-[160px]">{pedidoAtivo.produtoId}</span>
                        <Copy className="w-3 h-3 shrink-0" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-on-surface-variant">dataPedido:</span>
                      <span className="text-on-surface font-medium tabular-nums">
                        {formatarData(pedidoAtivo.dataPedido)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-on-surface-variant">status:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          pedidoAtivo.status === 'CANCELADO'
                            ? 'bg-[#fdf2f2] text-[#d70015]'
                            : 'bg-[#ebf9ee] text-[#1c7e2d]'
                        }`}
                      >
                        {pedidoAtivo.status}
                      </span>
                    </div>
                  </div>

                  {/* Item Congelado */}
                  <div className="space-y-3 mb-5">
                    <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
                      Dados do Snapshot
                    </span>
                    <div className="p-3 rounded-xl bg-surface-container-low/60 border border-surface-container flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-on-surface truncate">
                          {pedidoAtivo.nomeProduto}
                        </p>
                        <span className="text-[11px] text-on-surface-variant tabular-nums">
                          {pedidoAtivo.quantidade} × {formatarPreco(pedidoAtivo.precoUnitario)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-on-surface tabular-nums shrink-0">
                        {formatarPreco(pedidoAtivo.valorTotal)}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 text-xs">
                      <div className="flex justify-between text-on-surface-variant">
                        <span>precoUnitario</span>
                        <span className="tabular-nums font-medium text-on-surface">
                          {formatarPreco(pedidoAtivo.precoUnitario)}
                        </span>
                      </div>
                      <div className="flex justify-between text-on-surface-variant">
                        <span>quantidade</span>
                        <span className="tabular-nums font-medium text-on-surface">
                          {pedidoAtivo.quantidade} un.
                        </span>
                      </div>
                      <div className="flex justify-between text-on-surface text-base font-semibold pt-2 border-t border-surface-container">
                        <span>valorTotal</span>
                        <span className="tabular-nums">{formatarPreco(pedidoAtivo.valorTotal)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface-container-low rounded-xl p-3.5 mb-5">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        Registro gravado via <strong className="text-on-surface font-medium">Snapshot Pattern</strong>.
                        Alterações futuras de nome ou preço no <code className="font-mono text-primary">ms-produtos</code>{' '}
                        não alteram este pedido.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full py-2.5 px-4 rounded-full bg-primary-container hover:bg-primary text-on-primary text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir / Salvar Comprovante</span>
                  </button>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Cancelamento */}
      {pedidoParaCancelar &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !cancelandoId) {
                setPedidoParaCancelar(null);
              }
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in-up"
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar cancelamento do pedido"
          >
            <div className="bg-surface-container-lowest rounded-[24px] p-7 max-w-md w-full shadow-2xl border border-surface-container space-y-5">
              <div className="w-12 h-12 rounded-full bg-error-container/50 text-error flex items-center justify-center">
                <Ban className="w-6 h-6" />
              </div>

              <div>
                <h3 className="font-sans text-xl font-semibold text-on-surface">
                  Solicitar Cancelamento
                </h3>
                <p className="text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                  Deseja cancelar o pedido{' '}
                  <span className="font-mono font-semibold text-on-surface">
                    #{pedidoParaCancelar.id.slice(0, 8)}
                  </span>{' '}
                  ({pedidoParaCancelar.nomeProduto})?
                </p>
              </div>

              <div className="bg-surface-container-low rounded-xl p-3.5 text-xs text-on-surface-variant leading-relaxed">
                O status passará para <strong className="text-on-surface">CANCELADO</strong> e as{' '}
                <strong className="text-on-surface">{pedidoParaCancelar.quantidade} un.</strong>{' '}
                retornarão automaticamente ao estoque oficial em{' '}
                <code className="font-mono text-primary">ms-produtos</code>.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPedidoParaCancelar(null)}
                  disabled={Boolean(cancelandoId)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                >
                  Manter pedido
                </button>
                <button
                  type="button"
                  onClick={confirmarCancelamento}
                  disabled={Boolean(cancelandoId)}
                  className="px-5 py-2 rounded-full text-xs font-medium bg-error text-on-error hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
                >
                  {cancelandoId ? 'Estornando...' : 'Confirmar Cancelamento'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
