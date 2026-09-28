import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Loader2, 
  Minus, 
  Plus, 
  Lock,
  AlertTriangle 
} from 'lucide-react';
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

  // Pré-seleciona primeiro item disponível se não houver seleção
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
  const quantidadeNum = Number(quantidade) || 0;
  const valorTotal = Number((precoUnitario * quantidadeNum).toFixed(2));

  // Validação reativa local (Permite digitação livre no input para demonstrar validações da banca)
  const quantidadeInvalida = !quantidade || quantidadeNum <= 0 || !Number.isInteger(quantidadeNum);
  const estoqueInsuficiente = produtoSelecionado && quantidadeNum > estoqueMaximo;
  const formularioValido = Boolean(produtoId) && !quantidadeInvalida && !estoqueInsuficiente;

  function alterarQuantidade(delta) {
    const atual = Number(quantidade) || 0;
    const proximo = Math.max(1, atual + delta);
    setQuantidade(proximo);
    setErro(null);
    setUltimoPedidoSucesso(null);
  }

  async function handleCriarPedido(e) {
    e.preventDefault();
    setErro(null);
    setUltimoPedidoSucesso(null);

    if (!formularioValido) {
      if (quantidadeInvalida) setErro('A quantidade deve ser um número inteiro maior que zero.');
      else if (estoqueInsuficiente) setErro(`A quantidade solicitada (${quantidadeNum} un.) excede o saldo em estoque (${estoqueMaximo} un.).`);
      return;
    }

    setEnviando(true);
    try {
      const response = await pedidosApi.post('/pedidos', {
        produtoId,
        quantidade: quantidadeNum
      });

      const pedidoCriado = response.data;
      setUltimoPedidoSucesso(pedidoCriado);

      onToast({
        type: 'success',
        title: 'Compra Confirmada!',
        message: `${pedidoCriado.quantidade}x "${pedidoCriado.nomeProduto}" no valor de ${formatarPreco(pedidoCriado.valorTotal)} gravado com Snapshot.`
      });

      if (onPedidoRealizado) {
        onPedidoRealizado(pedidoCriado);
      }
    } catch (err) {
      console.error('Erro ao submeter pedido:', err);
      let mensagem = 'Erro ao processar compra.';

      if (err.response) {
        if (err.response.status === 400) {
          mensagem = err.response.data?.error || 'Saldo em estoque insuficiente para atender ao pedido.';
        } else if (err.response.status === 404) {
          mensagem = err.response.data?.error || 'Produto não encontrado no catálogo ativo.';
        } else if (err.response.status === 503) {
          mensagem = 'O ms-produtos está inacessível. A validação síncrona de preço e saldo falhou (HTTP 503).';
        } else {
          mensagem = err.response.data?.error || `Erro HTTP ${err.response.status}`;
        }
      } else {
        mensagem = 'Falha de comunicação com o ms-pedidos (Porta 3002). O serviço pode estar offline.';
      }

      setErro(mensagem);
      onToast({
        type: 'error',
        title: 'Falha na Compra',
        message: mensagem
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Topo do Checkout */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Checkout de Pedido
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Processamento síncrono com o microsserviço <code className="text-blue-600 font-mono">ms-pedidos</code> (Porta 3002)
          </p>
        </div>

        {/* Badge Sóbrio de Integridade */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
          <Lock className="w-3.5 h-3.5 text-blue-600" />
          <span>Snapshot Transacional Ativo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna da Esquerda: Seleção e Configuração do Item */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-5">
          <form onSubmit={handleCriarPedido} id="form-checkout" className="space-y-5">
            
            {/* Mensagem de Erro de Validação Local ou de Rede */}
            {erro && (
              <div className="flex items-start gap-3 p-4 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs leading-relaxed animate-fade-in-up">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold mb-0.5">Falha no processamento:</strong>
                  <span>{erro}</span>
                </div>
              </div>
            )}

            {/* Seleção do Produto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Produto Selecionado *
              </label>
              <select
                value={produtoId}
                onChange={(e) => {
                  setProdutoId(e.target.value);
                  setErro(null);
                  setUltimoPedidoSucesso(null);
                }}
                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
                required
              >
                <option value="" disabled>Escolha um produto da loja...</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.estoque <= 0}>
                    {p.nome} — {formatarPreco(p.preco)} {p.estoque <= 0 ? '(ESGOTADO)' : `(${p.estoque} un. disponíveis)`}
                  </option>
                ))}
              </select>
            </div>

            {/* Ficha Rápida do Item Escolhido */}
            {produtoSelecionado && (
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Valor Unitário</span>
                  <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                    {formatarPreco(produtoSelecionado.preco)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Saldo no Catálogo</span>
                  <span className={`font-semibold tabular-nums ${produtoSelecionado.estoque > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {produtoSelecionado.estoque} unidades em estoque
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>UUID Referencial:</span>
                  <span className="font-mono text-slate-600 truncate max-w-[180px]" title={produtoSelecionado.id}>
                    {produtoSelecionado.id}
                  </span>
                </div>
              </div>
            )}

            {/* Quantidade (Regra 2: Botões + e - com input livre editável para testes de validação) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Quantidade a Comprar *
                </label>
                {estoqueMaximo > 0 && (
                  <span className="text-xs text-slate-500 tabular-nums">
                    Disponível: <strong className="text-slate-700">{estoqueMaximo}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alterarQuantidade(-1)}
                  disabled={quantidadeNum <= 1}
                  aria-label="Diminuir quantidade"
                  className="w-11 h-11 flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95 disabled:opacity-40 transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>

                {/* Input central livre para digitar qualquer número (inclusive 0 ou > estoque para testes da banca) */}
                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) => {
                    setQuantidade(e.target.value);
                    setErro(null);
                    setUltimoPedidoSucesso(null);
                  }}
                  className={`flex-1 h-11 text-center font-bold text-base bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all tabular-nums ${
                    estoqueInsuficiente || quantidadeInvalida
                      ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500 bg-rose-50/40 text-rose-900'
                      : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900'
                  }`}
                  placeholder="Qtd"
                  required
                />

                <button
                  type="button"
                  onClick={() => alterarQuantidade(1)}
                  aria-label="Aumentar quantidade"
                  className="w-11 h-11 flex items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Mensagens de Alerta Reativo */}
              {estoqueInsuficiente && (
                <div className="flex items-center gap-1.5 text-xs text-rose-700 mt-2 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>A quantidade digitada ({quantidadeNum} un.) ultrapassa o estoque ({estoqueMaximo} un.).</span>
                </div>
              )}
              {quantidadeInvalida && (
                <div className="flex items-center gap-1.5 text-xs text-rose-700 mt-2 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Informe um número inteiro válido e maior que zero.</span>
                </div>
              )}
            </div>
          </form>

          {/* Vantagens Comerciais */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-400" />
              <span>Frete Grátis Nacional</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Estorno de Estoque ao Cancelar</span>
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Resumo Financeiro da Transação */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider pb-3 border-b border-slate-800">
              Resumo da Compra
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Subtotal ({quantidadeNum} {quantidadeNum === 1 ? 'item' : 'itens'})</span>
                <span className="font-semibold text-slate-200 tabular-nums">{formatarPreco(valorTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Frete Express</span>
                <span className="font-semibold text-emerald-400 uppercase text-[11px]">Grátis</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Garantia de Preço</span>
                <span className="font-semibold text-blue-400 text-[11px]">Snapshot Auditado</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between">
              <div>
                <span className="block text-xs font-semibold text-slate-400">Total a Pagar</span>
                <span className="text-[11px] text-slate-500">ou 10x sem juros no cartão</span>
              </div>
              <span className="text-2xl font-black text-emerald-400 tracking-tight tabular-nums">
                {formatarPreco(valorTotal)}
              </span>
            </div>

            <button
              type="submit"
              form="form-checkout"
              disabled={!formularioValido || enviando}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-blue-500/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando e Congelando Preço...</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>Concluir Pedido com Snapshot</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Transação protegida por imutabilidade de dados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recibo Rápido de Confirmação da Compra */}
      {ultimoPedidoSucesso && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm space-y-4 animate-fade-in-up">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Pedido Gerado com Sucesso!</span>
            </div>
            <span className="text-xs px-2.5 py-0.5 bg-emerald-200 text-emerald-900 rounded-full font-bold">
              STATUS: {ultimoPedidoSucesso.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-white rounded-xl border border-emerald-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Produto Congelado</span>
              <strong className="text-slate-900">{ultimoPedidoSucesso.nomeProduto}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Preço Unit. Snapshot</span>
              <strong className="text-slate-900 tabular-nums">{formatarPreco(ultimoPedidoSucesso.precoUnitario)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Qtd Comprada</span>
              <strong className="text-slate-900 tabular-nums">{ultimoPedidoSucesso.quantidade}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Pago</span>
              <strong className="text-emerald-700 text-sm font-black tabular-nums">{formatarPreco(ultimoPedidoSucesso.valorTotal)}</strong>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={onVerHistorico}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-4"
            >
              <span>Acessar Recibo no Histórico de Pedidos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
