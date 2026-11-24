import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  Search,
  PackageX,
  AlertCircle
} from 'lucide-react';
import ModalProduto from './ModalProduto';
import ProdutoAvatar from './ProdutoAvatar';
import { produtosApi, brokerApi, formatarPreco } from '../services/api';

export default function GerenciarLoja({
  produtos,
  loading,
  erro,
  produtosOnline,
  onRecarregar,
  onVoltarVitrine,
  onToast
}) {
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState(null);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null);
  const [excluindoId, setExcluindoId] = useState(null);

  const estoqueTotal = useMemo(
    () => produtos.reduce((acc, p) => acc + (p.estoque || 0), 0),
    [produtos]
  );

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        (p.descricao && p.descricao.toLowerCase().includes(termo)) ||
        p.id.toLowerCase().includes(termo)
    );
  }, [produtos, busca]);

  useEffect(() => {
    if (!produtoParaExcluir) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e) {
      if (e.key === 'Escape' && !excluindoId) {
        setProdutoParaExcluir(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [produtoParaExcluir, excluindoId]);

  function abrirNovoProduto() {
    setProdutoEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(produto) {
    setProdutoEditando(produto);
    setModalAberto(true);
  }

  async function confirmarExclusao() {
    if (!produtoParaExcluir) return;
    const { id, nome } = produtoParaExcluir;
    setExcluindoId(id);

    try {
      await produtosApi.delete(`/produtos/${id}`);
      onToast({
        type: 'success',
        title: 'Produto Removido',
        message: `"${nome}" foi excluído do catálogo oficial.`
      });
      setProdutoParaExcluir(null);
      onRecarregar();
    } catch (err) {
      console.warn('[frontend] ms-produtos offline. Publicando exclusão no Barramento...');
      try {
        await brokerApi.post('/publish', {
          topic: 'produtos',
          event: 'PRODUTO_EXCLUIR_COMANDO',
          payload: { id }
        });
        onToast({
          type: 'warning',
          title: 'Exclusão Enfileirada (Modo Resiliente)',
          message: `ms-produtos offline! A remoção de "${nome}" foi enfileirada no Event Broker e será aplicada ao SQLite quando o serviço retornar.`
        });
        setProdutoParaExcluir(null);
        await new Promise((r) => setTimeout(r, 150));
        onRecarregar();
      } catch (finalErr) {
        console.error('Erro ao excluir produto:', finalErr);
        onToast({
          type: 'error',
          title: 'Falha na Exclusão',
          message: 'Não foi possível excluir o produto nem via ms-produtos nem via Barramento.'
        });
      }
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <div className="flex flex-col w-full">
      {/* Sub-header Contextual */}
      <section className="w-full bg-surface-container-lowest shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-b border-surface-container sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={onVoltarVitrine}
              className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors text-xs font-medium group"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Voltar para a Vitrine</span>
            </button>
            <span className="h-3.5 w-[1px] bg-outline-variant/50" />
            <div className="inline-flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-medium">
                Modo Gestão de Catálogo
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4">
            <div className="flex items-center gap-2 text-on-surface-variant text-xs tabular-nums">
              <span className="font-medium text-on-surface">{produtos.length} ativos</span>
              <span>•</span>
              <span>
                Estoque total: <strong className="font-medium text-on-surface">{estoqueTotal} un.</strong>
              </span>
              <span className="hidden sm:inline">•</span>
              <span
                className={`hidden sm:inline-flex items-center gap-1 ${
                  produtosOnline ? 'text-primary' : 'text-amber-700'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{produtosOnline ? 'Sincronizado' : 'Modo Fila (Broker)'}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={abrirNovoProduto}
              className="inline-flex items-center gap-1.5 bg-on-surface hover:opacity-90 text-surface-container-lowest text-xs font-medium px-4 py-2 rounded-full transition-all shadow-sm active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Produto</span>
            </button>
          </div>
        </div>
      </section>

      {/* Área Principal */}
      <div className="max-w-7xl w-full mx-auto px-5 md:px-10 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-7">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-outline font-semibold">
              Inventário Real • ms-produtos :3001
            </p>
            <h1 className="font-sans text-3xl sm:text-4xl text-on-surface tracking-tight font-semibold">
              Gerenciar Catálogo
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, descrição ou ID..."
                className="w-full pl-9 pr-4 py-2 rounded-full bg-surface-container-lowest border border-surface-container text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <button
              type="button"
              onClick={onRecarregar}
              disabled={loading}
              aria-label="Sincronizar inventário"
              className="w-9 h-9 rounded-full bg-surface-container-lowest border border-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
        </div>

        {erro && (
          <div className="mb-6 p-5 bg-error-container/40 border border-error/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-error shrink-0" />
              <span className="text-xs text-on-surface">{erro}</span>
            </div>
            <button
              type="button"
              onClick={onRecarregar}
              className="px-4 py-1.5 rounded-full bg-on-surface text-white text-xs font-medium"
            >
              Reconectar
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-surface-container-lowest rounded-xl p-4 h-24 animate-pulse border border-surface-container"
              />
            ))}
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container p-12 text-center">
            <PackageX className="w-8 h-8 text-outline mx-auto mb-2" />
            <h3 className="text-base font-semibold text-on-surface">Nenhum item no catálogo</h3>
            <p className="text-xs text-on-surface-variant mt-1 mb-4">
              Cadastre um produto para disponibilizá-lo na vitrine e no checkout.
            </p>
            <button
              type="button"
              onClick={abrirNovoProduto}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-on-surface text-white text-xs font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Produto</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {produtosFiltrados.map((produto) => {
              const esgotado = produto.estoque <= 0;
              const baixo = produto.estoque > 0 && produto.estoque <= 5;

              return (
                <article
                  key={produto.id}
                  className="bg-surface-container-lowest rounded-xl p-4 border border-surface-container flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-surface-container/70 flex-shrink-0">
                      <ProdutoAvatar
                        nome={produto.nome}
                        imagemUrl={produto.imagemUrl}
                        produtoId={produto.id}
                        compact
                      />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <span className="font-mono text-[11px] text-outline block">
                        id: {produto.id}
                      </span>

                      <h2 className="font-sans text-lg font-semibold text-on-surface truncate">
                        {produto.nome}
                      </h2>

                      <p className="text-xs sm:text-sm text-on-surface-variant truncate max-w-2xl">
                        {produto.descricao || 'Sem descrição cadastrada.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-2 md:pt-0">
                    <div className="flex flex-col md:items-end">
                      <span className="font-sans text-lg font-semibold text-on-surface tabular-nums">
                        {formatarPreco(produto.preco)}
                      </span>
                      <div className="inline-flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            esgotado ? 'bg-error' : baixo ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span
                          className={`text-[11px] tabular-nums ${
                            esgotado
                              ? 'text-error font-medium'
                              : baixo
                              ? 'text-amber-700 font-medium'
                              : 'text-on-surface-variant'
                          }`}
                        >
                          {produto.estoque} un. em estoque
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(produto)}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium text-primary hover:bg-surface-container transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProdutoParaExcluir(produto)}
                        title="Excluir produto"
                        aria-label={`Excluir ${produto.nome}`}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição */}
      <ModalProduto
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        produtoParaEditar={produtoEditando}
        onSalvo={onRecarregar}
        onToast={onToast}
      />

      {/* Modal de Confirmação de Exclusão */}
      {produtoParaExcluir &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !excluindoId) {
                setProdutoParaExcluir(null);
              }
            }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in-up"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-surface-container-lowest rounded-[24px] p-7 max-w-md w-full shadow-2xl border border-surface-container space-y-4">
              <div className="w-11 h-11 rounded-full bg-error-container/50 text-error flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans text-lg font-semibold text-on-surface">
                  Remover produto do catálogo?
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed">
                  O produto <strong className="text-on-surface">{produtoParaExcluir.nome}</strong> será
                  removido da vitrine. Pedidos já realizados continuam preservados pelo Snapshot Pattern.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProdutoParaExcluir(null)}
                  disabled={Boolean(excluindoId)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarExclusao}
                  disabled={Boolean(excluindoId)}
                  className="px-5 py-2 rounded-full text-xs font-medium bg-error text-on-error hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {excluindoId ? 'Removendo...' : 'Excluir Produto'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
