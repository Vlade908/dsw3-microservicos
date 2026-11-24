import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  ShieldCheck,
  Check,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Minus,
  Plus,
  Receipt,
  ShoppingBag,
  Trash2
} from 'lucide-react';
import ProdutoAvatar from './ProdutoAvatar';
import { pedidosApi, brokerApi, formatarPreco, formatarData } from '../services/api';

export default function FormularioPedido({
  produtos,
  produtoPreSelecionado,
  onLimparSelecao,
  onPedidoRealizado,
  onVerHistorico,
  onVoltarVitrine,
  onToast
}) {
  const [produtoId, setProdutoId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [ultimoPedidoSucesso, setUltimoPedidoSucesso] = useState(null);

  useEffect(() => {
    if (produtoPreSelecionado) {
      setProdutoId(produtoPreSelecionado.id);
      setQuantidade(1);
      setErro(null);
      setUltimoPedidoSucesso(null);
    }
  }, [produtoPreSelecionado]);

  const limparItemCheckout = () => {
    setProdutoId('');
    setQuantidade(1);
    setErro(null);
    onLimparSelecao?.();
  };

  const produtoSelecionado = produtos.find((p) => p.id === produtoId);
  const estoqueMaximo = produtoSelecionado ? produtoSelecionado.estoque : 0;
  const precoUnitario = produtoSelecionado ? produtoSelecionado.preco : 0;
  const quantidadeNum = Number(quantidade) || 0;
  const quantidadeExibida = produtoSelecionado ? quantidadeNum : 0;
  const valorTotal = Number((precoUnitario * quantidadeExibida).toFixed(2));

  // Validação reativa local (permite digitação livre para testar limites e erros)
  const quantidadeInvalida =
    !quantidade || quantidadeNum <= 0 || !Number.isInteger(quantidadeNum);
  const estoqueInsuficiente = produtoSelecionado && quantidadeNum > estoqueMaximo;
  const formularioValido =
    Boolean(produtoId) && !quantidadeInvalida && !estoqueInsuficiente;

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
      if (quantidadeInvalida) {
        setErro('A quantidade deve ser um número inteiro maior que zero.');
      } else if (estoqueInsuficiente) {
        setErro(
          `A quantidade solicitada (${quantidadeNum} un.) excede o saldo em estoque (${estoqueMaximo} un.).`
        );
      }
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
      setProdutoId('');
      setQuantidade(1);
      onLimparSelecao?.();

      onToast({
        type: 'success',
        title: 'Pedido Confirmado!',
        message: `${pedidoCriado.quantidade}x "${pedidoCriado.nomeProduto}" no valor de ${formatarPreco(
          pedidoCriado.valorTotal
        )} gravado com Snapshot.`
      });

      if (onPedidoRealizado) {
        onPedidoRealizado(pedidoCriado);
      }
    } catch (err) {
      console.error('Erro ao submeter pedido:', err);
      const isBusinessError =
        err.response && (err.response.status === 400 || err.response.status === 404);

      if (
        !isBusinessError &&
        (!err.response || err.response.status >= 500) &&
        produtoSelecionado
      ) {
        console.warn(
          '[frontend] ms-pedidos indisponível. Enfileirando pedido no Event Broker (Store-and-Forward)...'
        );
        try {
          const pedidoId =
            typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : 'ped-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
          const precoUnit = Number(produtoSelecionado.preco);
          const total = Number((precoUnit * quantidadeNum).toFixed(2));
          const pedidoEnfileirado = {
            id: pedidoId,
            pedidoId,
            produtoId,
            nomeProduto: produtoSelecionado.nome,
            precoUnitario: precoUnit,
            quantidade: quantidadeNum,
            valorTotal: total,
            dataPedido: new Date().toISOString(),
            status: 'REALIZADO',
            estoqueJaAtualizado: false
          };

          await brokerApi.post('/publish', {
            topic: 'pedidos',
            event: 'PEDIDO_CRIAR_COMANDO',
            payload: pedidoEnfileirado
          });

          setUltimoPedidoSucesso({ ...pedidoEnfileirado, _enfileirado: true });
          setProdutoId('');
          setQuantidade(1);
          onLimparSelecao?.();
          onToast({
            type: 'warning',
            title: 'Pedido Enfileirado (Store-and-Forward)',
            message: `ms-pedidos offline! O pedido de ${quantidadeNum}x "${produtoSelecionado.nome}" foi enfileirado no Event Broker (:3003) e será persistido automaticamente.`
          });

          await new Promise((r) => setTimeout(r, 150));
          if (onPedidoRealizado) {
            onPedidoRealizado(pedidoEnfileirado);
          }
          return;
        } catch (brokerErr) {
          console.error('Erro ao enfileirar pedido no Event Broker:', brokerErr);
        }
      }

      let mensagem = 'Erro ao processar compra.';

      if (err.response) {
        if (err.response.status === 400) {
          mensagem =
            err.response.data?.error ||
            'Saldo em estoque insuficiente para atender ao pedido.';
        } else if (err.response.status === 404) {
          mensagem =
            err.response.data?.error || 'Produto não encontrado no catálogo ativo.';
        } else if (err.response.status === 503) {
          mensagem =
            err.response.data?.error || 'Serviço temporariamente indisponível (HTTP 503).';
        } else {
          mensagem = err.response.data?.error || `Erro HTTP ${err.response.status}`;
        }
      } else {
        mensagem =
          'Falha de comunicação com o ms-pedidos (:3002) e com o Event Broker (:3003).';
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
    <div className="w-full bg-apple-bg min-h-[calc(100vh-140px)]">
      <div className="max-w-[1120px] mx-auto px-5 sm:px-6 py-10 lg:py-12">
        {/* Topo do Checkout */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-apple-border/70 pb-6 gap-4">
          <div>
            <button
              type="button"
              onClick={onVoltarVitrine}
              className="text-xs text-apple-subtle hover:text-apple-dark transition-colors inline-flex items-center gap-1 mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para a Vitrine</span>
            </button>
            <h1 className="font-sans text-3xl sm:text-4xl font-semibold tracking-tight text-apple-dark">
              Checkout de Pedido
            </h1>
            <p className="text-sm text-apple-subtle mt-1.5">
              Validação síncrona de existência e estoque em <code className="font-mono">ms-produtos</code>{' '}
              com registro em <code className="font-mono">ms-pedidos</code>.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start sm:self-auto bg-apple-subtle-bg px-3.5 py-1.5 rounded-full border border-apple-border/60 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-apple-green" />
            <span className="font-medium text-apple-dark">Snapshot Pattern Ativo</span>
          </div>
        </div>

        {/* Grid 2 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Coluna Esquerda */}
          <section className="lg:col-span-7 flex flex-col gap-6">
            <form
              onSubmit={handleCriarPedido}
              id="form-checkout"
              className="bg-apple-card rounded-2xl border border-apple-border p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-apple-border/60">
                <h2 className="font-sans text-xl font-semibold text-apple-dark tracking-tight">
                  Item do Pedido
                </h2>

                <div className="flex items-center gap-2 sm:w-auto w-full">
                  <div className="sm:w-72 flex-1">
                    <select
                      value={produtoId}
                      onChange={(e) => {
                        const novoId = e.target.value;
                        if (!novoId) {
                          limparItemCheckout();
                          setUltimoPedidoSucesso(null);
                          return;
                        }
                        setProdutoId(novoId);
                        setQuantidade(1);
                        setErro(null);
                        setUltimoPedidoSucesso(null);
                      }}
                      aria-label="Selecionar produto"
                      className="w-full px-3 py-2 bg-apple-subtle-bg border border-apple-border rounded-xl text-xs font-medium text-apple-dark focus:outline-none focus:ring-2 focus:ring-apple-blue/30"
                    >
                      <option value="">
                        Nenhum item selecionado...
                      </option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.estoque <= 0}>
                          {p.nome} — {formatarPreco(p.preco)}{' '}
                          {p.estoque <= 0 ? '(ESGOTADO)' : `(${p.estoque} un.)`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {produtoSelecionado && (
                    <button
                      type="button"
                      onClick={limparItemCheckout}
                      title="Remover item do checkout"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-apple-border/80 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-apple-subtle text-xs font-medium transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover
                    </button>
                  )}
                </div>
              </div>

              {erro && (
                <div className="flex items-start gap-3 p-4 bg-rose-50 text-rose-900 border border-rose-200 rounded-xl text-xs leading-relaxed animate-fade-in-up">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold mb-0.5">
                      Não foi possível concluir:
                    </strong>
                    <span>{erro}</span>
                  </div>
                </div>
              )}

              {produtoSelecionado ? (
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="w-full sm:w-44 h-44 shrink-0 rounded-xl relative overflow-hidden bg-white border border-apple-border/60">
                    <ProdutoAvatar
                      nome={produtoSelecionado.nome}
                      imagemUrl={produtoSelecionado.imagemUrl}
                      produtoId={produtoSelecionado.id}
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold text-apple-dark leading-snug tracking-tight">
                          {produtoSelecionado.nome}
                        </h3>
                        <span className="text-base font-semibold text-apple-dark whitespace-nowrap tabular-nums">
                          {formatarPreco(produtoSelecionado.preco)}
                          <span className="text-xs font-normal text-apple-subtle block text-right">
                            / unidade
                          </span>
                        </span>
                      </div>

                      <p className="text-xs text-apple-subtle mt-1.5 leading-relaxed">
                        {produtoSelecionado.descricao || 'Sem descrição cadastrada.'}
                      </p>

                      <div className="mt-3">
                        <span className="inline-flex text-[11px] font-mono text-apple-subtle bg-apple-subtle-bg px-2.5 py-1 rounded-md">
                          produtoId: {produtoSelecionado.id}
                        </span>
                      </div>
                    </div>

                    {/* Quantidade + Estoque */}
                    <div className="mt-6 pt-4 border-t border-apple-border/60">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-apple-subtle font-medium">Quantidade:</span>
                          <div className="inline-flex items-center rounded-full border border-apple-border bg-apple-subtle-bg p-0.5">
                            <button
                              type="button"
                              onClick={() => alterarQuantidade(-1)}
                              disabled={quantidadeNum <= 1}
                              aria-label="Diminuir quantidade"
                              className="w-7 h-7 rounded-full bg-white text-apple-dark flex items-center justify-center shadow-sm hover:bg-neutral-100 transition active:scale-95 disabled:opacity-40"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              value={quantidade}
                              onChange={(e) => {
                                setQuantidade(e.target.value);
                                setErro(null);
                                setUltimoPedidoSucesso(null);
                              }}
                              aria-label="Quantidade"
                              required
                              className={`w-14 text-center text-xs font-semibold bg-transparent focus:outline-none tabular-nums ${
                                estoqueInsuficiente || quantidadeInvalida
                                  ? 'text-rose-700'
                                  : 'text-apple-dark'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => alterarQuantidade(1)}
                              aria-label="Aumentar quantidade"
                              className="w-7 h-7 rounded-full bg-white text-apple-dark flex items-center justify-center shadow-sm hover:bg-neutral-100 transition active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 text-xs font-medium tabular-nums ${
                            produtoSelecionado.estoque > 0 ? 'text-apple-green' : 'text-rose-600'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              produtoSelecionado.estoque > 0 ? 'bg-apple-green' : 'bg-rose-600'
                            }`}
                          />
                          <span>
                            {produtoSelecionado.estoque > 0
                              ? `${produtoSelecionado.estoque} unidades disponíveis`
                              : 'Produto esgotado no catálogo'}
                          </span>
                        </div>
                      </div>

                      {estoqueInsuficiente && (
                        <div className="flex items-center gap-1.5 text-xs text-rose-700 mt-2.5 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            A quantidade digitada ({quantidadeNum} un.) ultrapassa o estoque disponível (
                            {estoqueMaximo} un.).
                          </span>
                        </div>
                      )}
                      {quantidadeInvalida && (
                        <div className="flex items-center gap-1.5 text-xs text-rose-700 mt-2.5 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Informe um número inteiro válido e maior que zero.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-10 px-4 flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-apple-subtle-bg border border-apple-border/60 flex items-center justify-center text-apple-subtle mb-3">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-apple-dark mb-1">
                    Nenhum item no checkout
                  </h3>
                  <p className="text-xs text-apple-subtle max-w-sm mb-5 leading-relaxed">
                    {produtos.length > 0
                      ? 'Selecione um produto no seletor acima ou volte para a vitrine para escolher um item.'
                      : 'Nenhum produto cadastrado no catálogo da loja no momento.'}
                  </p>
                  {onVoltarVitrine && (
                    <button
                      type="button"
                      onClick={onVoltarVitrine}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-apple-dark hover:bg-apple-dark/90 text-white text-xs font-semibold transition-colors"
                    >
                      Escolher produto na Vitrine
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </form>

            {/* Card real sobre Snapshot Pattern */}
            <div className="bg-apple-card rounded-2xl border border-apple-border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-start gap-4">
              <div className="w-9 h-9 rounded-full bg-apple-subtle-bg flex items-center justify-center text-apple-dark shrink-0 border border-apple-border/50">
                <ShieldCheck className="w-[18px] h-[18px]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-apple-dark tracking-tight">
                    Preço e Nome Congelados (Snapshot Pattern)
                  </h4>
                  <span className="text-[10px] font-semibold text-apple-subtle bg-apple-subtle-bg px-2 py-0.5 rounded-full border border-apple-border/60 uppercase">
                    Imutável
                  </span>
                </div>
                <p className="text-xs text-apple-subtle mt-1 leading-relaxed">
                  Ao confirmar em <code className="font-mono">POST /pedidos</code>, o{' '}
                  <code className="font-mono">ms-pedidos</code> grava uma cópia imutável de{' '}
                  <code className="font-mono">nomeProduto</code> e{' '}
                  <code className="font-mono">precoUnitario</code>. Alterações posteriores em{' '}
                  <code className="font-mono">ms-produtos</code> não modificam pedidos antigos.
                </p>
              </div>
            </div>
          </section>

          {/* Coluna Direita: Resumo Sticky */}
          <aside className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-24">
            <div className="bg-apple-card rounded-2xl border border-apple-border p-6 shadow-sm">
              <h2 className="font-sans text-xl font-semibold text-apple-dark tracking-tight pb-4 border-b border-apple-border/60">
                Resumo do Pedido
              </h2>

              <div className="flex flex-col gap-3 text-sm py-4">
                <div className="flex items-center justify-between gap-2 text-apple-subtle">
                  <span>Produto</span>
                  <span
                    className={`font-medium truncate max-w-[200px] ${
                      produtoSelecionado ? 'text-apple-dark' : 'text-apple-subtle'
                    }`}
                  >
                    {produtoSelecionado ? produtoSelecionado.nome : 'Nenhum selecionado'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-apple-subtle">
                  <span>Preço Unitário</span>
                  <span className="text-apple-dark font-medium tabular-nums">
                    {formatarPreco(precoUnitario)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-apple-subtle">
                  <span>Quantidade</span>
                  <span className="text-apple-dark font-medium tabular-nums">
                    {quantidadeExibida === 0
                      ? '0'
                      : `${quantidadeExibida} ${quantidadeExibida === 1 ? 'unidade' : 'unidades'}`}
                  </span>
                </div>
              </div>

              <div className="h-px bg-apple-border/80 my-3" />

              <div className="py-2 flex items-baseline justify-between">
                <span className="text-base font-semibold text-apple-dark tracking-tight">
                  Valor Total
                </span>
                <span className="text-2xl font-bold tracking-tight text-apple-dark tabular-nums">
                  {formatarPreco(valorTotal)}
                </span>
              </div>

              <div className="mt-5">
                <button
                  type="submit"
                  form="form-checkout"
                  disabled={!formularioValido || enviando}
                  className="w-full h-12 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 bg-apple-blue hover:bg-apple-blue-hover active:scale-[0.99] transition-all shadow-[0_1px_2px_rgba(0,113,227,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {enviando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validando e gravando pedido...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Finalizar Pedido ({formatarPreco(valorTotal)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-apple-border flex items-center gap-3 text-apple-subtle text-xs">
              <Receipt className="w-5 h-5 text-apple-dark shrink-0" />
              <span>
                O registro gerado é exibido imediatamente em Meus Pedidos com opção de cancelamento
                e estorno de estoque.
              </span>
            </div>
          </aside>
        </div>

        {/* Confirmação Pós-Compra */}
        {ultimoPedidoSucesso && (
          <section className="mt-12 pt-8 border-t border-apple-border animate-fade-in-up">
            <div
              className={`rounded-2xl border p-6 sm:p-8 shadow-sm ${
                ultimoPedidoSucesso._enfileirado
                  ? 'bg-amber-50/60 border-amber-200'
                  : 'bg-apple-card border-apple-border'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-apple-border/60">
                <div className="flex items-start sm:items-center gap-4">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border ${
                      ultimoPedidoSucesso._enfileirado
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-apple-green border-emerald-100'
                    }`}
                  >
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-xl font-semibold text-apple-dark tracking-tight">
                        {ultimoPedidoSucesso._enfileirado
                          ? 'Pedido Enfileirado (Store-and-Forward)'
                          : 'Pedido Confirmado'}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          ultimoPedidoSucesso._enfileirado
                            ? 'bg-amber-100 text-amber-900 border-amber-200'
                            : 'bg-emerald-50 text-apple-green border-emerald-100'
                        }`}
                      >
                        STATUS: {ultimoPedidoSucesso.status}
                      </span>
                    </div>
                    <p className="text-xs text-apple-subtle mt-1 font-mono">
                      ID: {ultimoPedidoSucesso.id} • {formatarData(ultimoPedidoSucesso.dataPedido)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onVerHistorico}
                  className="px-5 py-2.5 rounded-xl bg-apple-blue text-white text-xs font-medium hover:bg-apple-blue-hover transition-colors inline-flex items-center gap-1.5 shadow-sm self-start md:self-auto"
                >
                  <span>Ver em Meus Pedidos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-6 text-xs">
                <div>
                  <span className="text-apple-subtle block">nomeProduto (Snapshot)</span>
                  <span className="text-apple-dark font-semibold mt-1 block">
                    {ultimoPedidoSucesso.nomeProduto}
                  </span>
                </div>
                <div>
                  <span className="text-apple-subtle block">Quantidade &amp; precoUnitario</span>
                  <span className="text-apple-dark font-medium mt-1 block tabular-nums">
                    {ultimoPedidoSucesso.quantidade} un. ×{' '}
                    {formatarPreco(ultimoPedidoSucesso.precoUnitario)}
                  </span>
                </div>
                <div>
                  <span className="text-apple-subtle block">valorTotal</span>
                  <span className="text-apple-dark font-semibold mt-1 block tabular-nums">
                    {formatarPreco(ultimoPedidoSucesso.valorTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-apple-subtle block">Destino de Persistência</span>
                  <span className="text-apple-green font-medium mt-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-apple-green" />
                    {ultimoPedidoSucesso._enfileirado
                      ? 'event-broker :3003 (fila segura)'
                      : 'ms-pedidos :3002 (SQLite)'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
