import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, AlertCircle, ArrowRight, Layers, Sparkles, Loader2, Info } from 'lucide-react';
import { pedidosApi, formatarPreco } from '../services/api';

export default function FormularioPedido({
  produtos,
  produtoPreSelecionado,
  onPedidoRealizado,
  onVerHistorico,
  onToast
}) {
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [ultimoPedidoSucesso, setUltimoPedidoSucesso] = useState(null);

  // Sincroniza se vier um produto pré-selecionado do Catálogo
  useEffect(() => {
    if (produtoPreSelecionado) {
      setProdutoId(produtoPreSelecionado.id);
      setQuantidade(1);
      setErro(null);
      setUltimoPedidoSucesso(null);
    }
  }, [produtoPreSelecionado]);

  // Se não tiver selecionado e a lista carregar, sugere o primeiro disponível
  useEffect(() => {
    if (!produtoId && produtos.length > 0) {
      const primeiroDisponivel = produtos.find((p) => p.estoque > 0) || produtos[0];
      if (primeiroDisponivel) {
        setProdutoId(primeiroDisponivel.id);
      }
    }
  }, [produtos, produtoId]);

  const produtoSelecionado = produtos.find((p) => p.id === produtoId);
  const estoqueMaximo = produtoSelecionado ? produtoSelecionado.estoque : 0;
  const precoUnitario = produtoSelecionado ? produtoSelecionado.preco : 0;
  const valorTotal = Number((precoUnitario * (Number(quantidade) || 0)).toFixed(2));

  // Validação reativa local
  const quantidadeInvalida = !quantidade || Number(quantidade) <= 0 || !Number.isInteger(Number(quantidade));
  const estoqueInsuficiente = produtoSelecionado && Number(quantidade) > estoqueMaximo;
  const formularioValido = Boolean(produtoId) && !quantidadeInvalida && !estoqueInsuficiente;

  async function handleCriarPedido(e) {
    e.preventDefault();
    setErro(null);
    setUltimoPedidoSucesso(null);

    if (!formularioValido) {
      if (quantidadeInvalida) setErro('A quantidade deve ser um número inteiro maior que zero.');
      else if (estoqueInsuficiente) setErro(`Quantidade excede o estoque disponível (${estoqueMaximo} un.).`);
      return;
    }

    setEnviando(true);
    try {
      const response = await pedidosApi.post('/pedidos', {
        produtoId,
        quantidade: Number(quantidade)
      });

      const pedidoCriado = response.data;
      setUltimoPedidoSucesso(pedidoCriado);

      onToast({
        type: 'success',
        title: 'Pedido Confirmado!',
        message: `Pedido de ${pedidoCriado.quantidade}x "${pedidoCriado.nomeProduto}" no valor de ${formatarPreco(pedidoCriado.valorTotal)} gerado com sucesso.`
      });

      if (onPedidoRealizado) {
        onPedidoRealizado(pedidoCriado);
      }
    } catch (err) {
      console.error('Erro ao submeter pedido:', err);
      let mensagem = 'Erro ao processar pedido.';

      if (err.response) {
        if (err.response.status === 400) {
          mensagem = err.response.data?.error || 'Estoque insuficiente para atender à solicitação.';
        } else if (err.response.status === 404) {
          mensagem = err.response.data?.error || 'Produto não encontrado no catálogo.';
        } else if (err.response.status === 503) {
          mensagem = 'O ms-produtos está fora do ar. A validação síncrona de estoque e preço falhou (HTTP 503).';
        } else {
          mensagem = err.response.data?.error || `Erro HTTP ${err.response.status}`;
        }
      } else {
        mensagem = 'Não foi possível conectar ao ms-pedidos (Porta 3002). O serviço pode estar offline.';
      }

      setErro(mensagem);
      onToast({
        type: 'error',
        title: 'Falha no Pedido',
        message: mensagem
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Cabeçalho */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Realizar Novo Pedido de Compra
            </h2>
            <p className="text-xs text-slate-500">
              Processado pelo <code className="text-blue-600 font-mono">ms-pedidos</code> (Porta 3002) com validação síncrona
            </p>
          </div>
        </div>

        {/* Card Didático: Snapshot Pattern */}
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              Padrão Arquitetural: Snapshot Pattern Ativo
            </p>
            <p className="text-blue-800 leading-relaxed">
              Ao submeter o pedido, o <code className="font-mono">ms-pedidos</code> consulta remotamente o <code className="font-mono">ms-produtos</code> e grava uma <strong>cópia imutável</strong> do nome do produto e do preço unitário atual. Mesmo que o produto mude de preço no futuro ou seja removido, o seu histórico financeiro nunca será alterado!
            </p>
          </div>
        </div>
      </div>

      {/* Formulário Principal */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleCriarPedido} className="space-y-5">
          
          {/* Mensagem de Erro com Degradação Graciosa */}
          {erro && (
            <div className="flex items-start gap-3 p-4 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs leading-relaxed animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Não foi possível concluir o pedido:</strong>
                <span>{erro}</span>
              </div>
            </div>
          )}

          {/* Seleção do Produto */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Selecione o Produto *
            </label>
            <select
              value={produtoId}
              onChange={(e) => {
                setProdutoId(e.target.value);
                setErro(null);
                setUltimoPedidoSucesso(null);
              }}
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              required
            >
              <option value="" disabled>Selecione um produto do catálogo...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id} disabled={p.estoque <= 0}>
                  {p.nome} — {formatarPreco(p.preco)} {p.estoque <= 0 ? '(ESGOTADO)' : `(${p.estoque} un. disponíveis)`}
                </option>
              ))}
            </select>
          </div>

          {/* Detalhes do Produto Escolhido */}
          {produtoSelecionado && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Preço Unitário</span>
                <span className="text-sm font-bold text-slate-900">{formatarPreco(produtoSelecionado.preco)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Estoque Disponível</span>
                <span className={`text-sm font-bold ${produtoSelecionado.estoque > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {produtoSelecionado.estoque} unidades
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase text-[10px]">Identificador (UUID)</span>
                <span className="text-[11px] font-mono text-slate-600 truncate block" title={produtoSelecionado.id}>
                  {produtoSelecionado.id.slice(0, 13)}...
                </span>
              </div>
            </div>
          )}

          {/* Quantidade */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Quantidade *
              </label>
              {estoqueMaximo > 0 && (
                <span className="text-xs text-slate-500">
                  Máximo disponível: <strong className="text-slate-700">{estoqueMaximo}</strong>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max={estoqueMaximo || 9999}
                value={quantidade}
                onChange={(e) => {
                  setQuantidade(e.target.value);
                  setErro(null);
                  setUltimoPedidoSucesso(null);
                }}
                className={`w-full px-3.5 py-3 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                  estoqueInsuficiente || quantidadeInvalida
                    ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/50'
                    : 'border-slate-300 focus:ring-blue-500 focus:bg-white'
                }`}
                required
              />
            </div>
            {estoqueInsuficiente && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                ⚠️ A quantidade informada excede o saldo em estoque ({estoqueMaximo} un.).
              </p>
            )}
          </div>

          {/* Resumo Financeiro da Transação */}
          <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total Calculado</span>
              <span className="text-xs text-slate-400">
                {quantidade || 0} un. × {formatarPreco(precoUnitario)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-400 tracking-tight">
                {formatarPreco(valorTotal)}
              </span>
            </div>
          </div>

          {/* Botão de Submissão */}
          <button
            type="submit"
            disabled={!formularioValido || enviando}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {enviando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processando Pedido & Validando Snapshot...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Confirmar e Finalizar Pedido</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Card de Confirmação com Snapshot Preservado */}
      {ultimoPedidoSucesso && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Pedido Realizado com Sucesso!</span>
            </div>
            <span className="text-xs px-2.5 py-0.5 bg-emerald-200 text-emerald-900 rounded-full font-semibold">
              STATUS: {ultimoPedidoSucesso.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white/80 rounded-xl border border-emerald-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Snapshot Produto</span>
              <strong className="text-slate-900">{ultimoPedidoSucesso.nomeProduto}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Snapshot Preço Unit.</span>
              <strong className="text-slate-900">{formatarPreco(ultimoPedidoSucesso.precoUnitario)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Qtd Comprada</span>
              <strong className="text-slate-900">{ultimoPedidoSucesso.quantidade}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Valor Total Pago</span>
              <strong className="text-emerald-700 text-sm font-extrabold">{formatarPreco(ultimoPedidoSucesso.valorTotal)}</strong>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={onVerHistorico}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-4"
            >
              <span>Ver no Histórico Completo de Pedidos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
