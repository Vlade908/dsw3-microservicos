import React, { useState } from 'react';
import { History, RefreshCw, AlertCircle, Ban, CheckCircle2, Clock, Sparkles, Copy, Check } from 'lucide-react';
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

  async function handleCancelar(pedido) {
    if (pedido.status === 'CANCELADO') return;

    const confirmou = window.confirm(
      `Deseja realmente cancelar o pedido do produto "${pedido.nomeProduto}"?\n\nA quantidade de ${pedido.quantidade} un. será estornada automaticamente ao estoque no ms-produtos.`
    );
    if (!confirmou) return;

    setCancelandoId(pedido.id);
    try {
      await pedidosApi.patch(`/pedidos/${pedido.id}/cancelar`);
      onToast({
        type: 'success',
        title: 'Pedido Cancelado',
        message: `O pedido de "${pedido.nomeProduto}" foi cancelado e o estoque foi estornado no catálogo.`
      });
      onRecarregar();
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

  // Estatísticas rápidas
  const totalFaturado = pedidos
    .filter((p) => p.status === 'REALIZADO')
    .reduce((acc, p) => acc + (p.valorTotal || 0), 0);

  const totalRealizados = pedidos.filter((p) => p.status === 'REALIZADO').length;
  const totalCancelados = pedidos.filter((p) => p.status === 'CANCELADO').length;

  return (
    <div className="space-y-6">
      
      {/* Cabeçalho do Histórico */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Histórico Geral de Pedidos
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
              {pedidos.length} {pedidos.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Persistido exclusivamente no banco do <code className="text-blue-600 font-mono">ms-pedidos</code> (Database-per-Service)
          </p>
        </div>

        <button
          onClick={onRecarregar}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Pedidos</span>
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Faturamento Concluído
          </span>
          <span className="text-xl font-black text-emerald-600 tracking-tight mt-1 block">
            {formatarPreco(totalFaturado)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Pedidos Ativos
          </span>
          <span className="text-xl font-black text-slate-900 tracking-tight mt-1 block">
            {totalRealizados}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Pedidos Cancelados
          </span>
          <span className="text-xl font-black text-rose-600 tracking-tight mt-1 block">
            {totalCancelados}
          </span>
        </div>
      </div>

      {/* Banner de Erro Gracioso / ms-pedidos Offline */}
      {erro && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                Microserviço de Pedidos Inacessível
              </h4>
              <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
                Não foi possível estabelecer conexão com o <code className="font-mono">ms-pedidos</code> na porta 3002.
                Se o serviço foi derrubado propositalmente no teste de resiliência, a interface degrada com segurança sem travar.
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

      {/* Tabela de Histórico */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-xs">Carregando histórico de pedidos...</p>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <History className="w-8 h-8 mx-auto opacity-50 text-slate-300" />
            <h4 className="font-bold text-slate-700 text-sm">Nenhum pedido registrado</h4>
            <p className="text-xs text-slate-400">
              Faça sua primeira compra na aba "Fazer Pedido" para alimentar esta tabela.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">ID do Pedido</th>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Produto (Snapshot)</th>
                  <th className="py-3 px-4">Preço Unit.</th>
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
                        cancelado ? 'bg-slate-50/50 opacity-70' : ''
                      }`}
                    >
                      {/* ID com botão de copiar */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        <button
                          onClick={() => copiarId(pedido.id)}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                          title="Clique para copiar o UUID do pedido"
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
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatarData(pedido.dataPedido)}
                      </td>

                      {/* Nome do Produto com Snapshot Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{pedido.nomeProduto}</span>
                          <span
                            className="inline-block p-0.5 rounded text-[10px] text-blue-600 bg-blue-50 border border-blue-200"
                            title="Nome capturado pelo Snapshot Pattern no momento da compra"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </td>

                      {/* Preço Unitário Snapshot */}
                      <td className="py-3.5 px-4 text-slate-700">
                        {formatarPreco(pedido.precoUnitario)}
                      </td>

                      {/* Quantidade */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {pedido.quantidade}
                      </td>

                      {/* Valor Total */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                        {formatarPreco(pedido.valorTotal)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          cancelado
                            ? 'bg-rose-100 text-rose-700'
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
                              REALIZADO
                            </>
                          )}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        {!cancelado ? (
                          <button
                            onClick={() => handleCancelar(pedido)}
                            disabled={cancelandoId === pedido.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Ban className="w-3 h-3" />
                            <span>{cancelandoId === pedido.id ? 'Cancelando...' : 'Cancelar'}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Estornado</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
