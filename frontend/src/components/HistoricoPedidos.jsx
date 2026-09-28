import React, { useState } from 'react';
import { 
  Receipt, 
  RefreshCw, 
  AlertCircle, 
  Ban, 
  CheckCircle2, 
  Lock, 
  Copy, 
  Check, 
  Eye, 
  X, 
  ShieldCheck, 
  Calendar, 
  ShoppingBag,
  Clock
} from 'lucide-react';
import { pedidosApi, formatarPreco, formatarData } from '../services/api';

export default function HistoricoPedidos({
  pedidos,
  loading,
  erro,
  onRecarregar,
  onToast
}) {
  const [cancelandoId, setCancelandoId] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);
  const [pedidoDetalhe, setPedidoDetalhe] = useState(null);

  async function handleCancelar(pedido) {
    if (pedido.status === 'CANCELADO') return;

    const confirmou = window.confirm(
      `Confirmação de Cancelamento de Compra:\n\nDeseja cancelar o pedido de "${pedido.nomeProduto}"?\nA quantidade de ${pedido.quantidade} un. retornará automaticamente ao estoque no ms-produtos.`
    );
    if (!confirmou) return;

    setCancelandoId(pedido.id);
    try {
      await pedidosApi.patch(`/pedidos/${pedido.id}/cancelar`);
      onToast({
        type: 'success',
        title: 'Pedido Cancelado',
        message: `O pedido de "${pedido.nomeProduto}" foi cancelado e o estoque estornado com sucesso.`
      });
      onRecarregar();
      if (pedidoDetalhe?.id === pedido.id) {
        setPedidoDetalhe((prev) => ({ ...prev, status: 'CANCELADO' }));
      }
    } catch (err) {
      console.error('Erro ao cancelar pedido:', err);
      const mensagem = err.response?.data?.error || 'Não foi possível cancelar o pedido. Verifique a conexão com o ms-pedidos (:3002).';
      onToast({
        type: 'error',
        title: 'Falha no Cancelamento',
        message: mensagem
      });
    } finally {
      setCancelandoId(null);
    }
  }

  function copiarId(id) {
    navigator.clipboard.writeText(id);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  }

  // Estatísticas calculadas
  const totalFaturado = pedidos
    .filter((p) => p.status === 'REALIZADO')
    .reduce((acc, p) => acc + (p.valorTotal || 0), 0);
  const totalRealizados = pedidos.filter((p) => p.status === 'REALIZADO').length;
  const totalCancelados = pedidos.filter((p) => p.status === 'CANCELADO').length;

  return (
    <div className="space-y-6">
      
      {/* Topo do Histórico com Régua Analítica Integrada (Sem cards soltos de IA) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Meus Pedidos & Histórico
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold tabular-nums">
              {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Persistência independente no banco de dados do <code className="text-blue-600 font-mono">ms-pedidos</code>
          </p>
        </div>

        {/* Régua de Métricas Compacta e Integrada */}
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 self-start md:self-auto text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Aprovado</span>
            <span className="font-extrabold text-slate-900 tabular-nums">{formatarPreco(totalFaturado)}</span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Concluídos</span>
            <span className="font-bold text-emerald-700 tabular-nums">{totalRealizados}</span>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Cancelados</span>
            <span className="font-bold text-rose-700 tabular-nums">{totalCancelados}</span>
          </div>

          <button
            onClick={onRecarregar}
            disabled={loading}
            aria-label="Atualizar histórico"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-all active:scale-95 ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alerta de Degradação Graciosa (ms-pedidos Offline) */}
      {erro && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                Histórico Temporariamente Indisponível
              </h4>
              <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                Não foi possível conectar ao <code className="font-mono">ms-pedidos</code> na porta 3002.
                Se o serviço foi derrubado propositalmente no teste de resiliência, a interface não quebra.
              </p>
            </div>
          </div>
          <button
            onClick={onRecarregar}
            className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm self-start sm:self-auto transition-colors"
          >
            Tentar Reconectar
          </button>
        </div>
      )}

      {/* Tabela de Pedidos com Evidência do Snapshot Pattern */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-xs">Sincronizando pedidos...</p>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Receipt className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
            <h4 className="font-bold text-slate-700 text-sm">Nenhum pedido registrado</h4>
            <p className="text-xs text-slate-500">
              Suas compras finalizadas aparecerão nesta central com recibo imutável.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Pedido ID</th>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Produto (Snapshot)</th>
                  <th className="py-3 px-4">Preço Unit. (Snapshot)</th>
                  <th className="py-3 px-4 text-center">Qtd</th>
                  <th className="py-3 px-4">Valor Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {pedidos.map((pedido) => {
                  const cancelado = pedido.status === 'CANCELADO';
                  return (
                    <tr
                      key={pedido.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        cancelado ? 'bg-slate-50/40 opacity-75' : ''
                      }`}
                    >
                      {/* ID do Pedido */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        <button
                          onClick={() => copiarId(pedido.id)}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          title="Copiar UUID do pedido"
                        >
                          <span>{pedido.id.slice(0, 8)}...</span>
                          {copiadoId === pedido.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-40 hover:opacity-100" />
                          )}
                        </button>
                      </td>

                      {/* Data Formatada */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap tabular-nums">
                        {formatarData(pedido.dataPedido)}
                      </td>

                      {/* Nome do Produto com Selo de Imutabilidade */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{pedido.nomeProduto}</span>
                          <span 
                            className="inline-flex items-center p-0.5 text-blue-600 bg-blue-50 border border-blue-200 rounded" 
                            title="Snapshot Pattern: gravado de forma imutável no ato da compra"
                          >
                            <Lock className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </td>

                      {/* Preço Unitário Snapshot (Regra 3) */}
                      <td className="py-3.5 px-4 text-slate-700 font-semibold tabular-nums">
                        {formatarPreco(pedido.precoUnitario)}
                      </td>

                      {/* Quantidade */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 tabular-nums">
                        {pedido.quantidade}
                      </td>

                      {/* Valor Total */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 whitespace-nowrap tabular-nums">
                        {formatarPreco(pedido.valorTotal)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          cancelado
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {cancelado ? (
                            <>
                              <Ban className="w-3 h-3" />
                              CANCELADO
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              APROVADO
                            </>
                          )}
                        </span>
                      </td>

                      {/* Ações: Ver Recibo & Cancelar */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setPedidoDetalhe(pedido)}
                            title="Visualizar Recibo de Compra"
                            aria-label={`Ver recibo do pedido ${pedido.id.slice(0, 8)}`}
                            className="p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!cancelado ? (
                            <button
                              onClick={() => handleCancelar(pedido)}
                              disabled={cancelandoId === pedido.id}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors active:scale-95 disabled:opacity-50"
                            >
                              <Ban className="w-3 h-3" />
                              <span>{cancelandoId === pedido.id ? 'Estornando...' : 'Cancelar'}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic px-1">Estornado</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Recibo Detalhado (Comprovação Integral do Snapshot Pattern) */}
      {pedidoDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            
            {/* Topo do Recibo */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Recibo Oficial do Pedido
                </h3>
              </div>
              <button
                onClick={() => setPedidoDetalhe(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                aria-label="Fechar recibo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo do Recibo */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Número do Pedido</span>
                  <span className="font-mono text-slate-700 font-bold">{pedidoDetalhe.id.slice(0, 16)}...</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Data da Transação</span>
                  <span className="text-slate-800 font-medium tabular-nums">{formatarData(pedidoDetalhe.dataPedido)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                    pedidoDetalhe.status === 'CANCELADO' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {pedidoDetalhe.status}
                  </span>
                </div>
              </div>

              {/* Tabela de Valores do Snapshot */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900 pb-2 border-b border-slate-100">
                  <span>{pedidoDetalhe.nomeProduto}</span>
                  <span className="tabular-nums">{formatarPreco(pedidoDetalhe.valorTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Preço Unitário (Snapshot)</span>
                  <span className="tabular-nums font-semibold text-slate-800">{formatarPreco(pedidoDetalhe.precoUnitario)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Quantidade Adquirida</span>
                  <span className="tabular-nums font-semibold text-slate-800">{pedidoDetalhe.quantidade} un.</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Frete</span>
                  <span className="text-emerald-700 font-semibold uppercase text-[10px]">Grátis</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-extrabold text-slate-900">
                  <span>Total Consolidado</span>
                  <span className="text-emerald-700 tabular-nums">{formatarPreco(pedidoDetalhe.valorTotal)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="leading-relaxed">
                  Valores financeiros preservados pelo Snapshot Pattern. Alterações no catálogo não impactam este registro.
                </span>
              </div>
            </div>

            {/* Ações do Recibo */}
            <div className="flex items-center justify-end p-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setPedidoDetalhe(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
              >
                Fechar Recibo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
