import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { produtosApi, brokerApi } from '../services/api';
import ProdutoAvatar, { ORIENTATION_LABELS } from './ProdutoAvatar';

export default function ModalProduto({ isOpen, onClose, produtoParaEditar, onSalvo, onToast }) {
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [estoque, setEstoque] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [previewMetrics, setPreviewMetrics] = useState(null);

  const modoEdicao = Boolean(produtoParaEditar);

  useEffect(() => {
    if (produtoParaEditar) {
      setNome(produtoParaEditar.nome || '');
      setPreco(produtoParaEditar.preco !== undefined ? String(produtoParaEditar.preco) : '');
      setDescricao(produtoParaEditar.descricao || '');
      setImagemUrl(produtoParaEditar.imagemUrl || '');
      setEstoque(produtoParaEditar.estoque !== undefined ? String(produtoParaEditar.estoque) : '');
    } else {
      setNome('');
      setPreco('');
      setDescricao('');
      setImagemUrl('');
      setEstoque('');
    }
    setErro(null);
    setPreviewMetrics(null);
  }, [produtoParaEditar, isOpen]);

  useEffect(() => {
    setPreviewMetrics(null);
  }, [imagemUrl]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro('O campo "Nome" é obrigatório.');
      return;
    }

    const precoNum = parseFloat(preco);
    if (isNaN(precoNum) || precoNum < 0) {
      setErro('Informe um preço válido maior ou igual a zero.');
      return;
    }

    const estoqueNum = parseInt(estoque, 10);
    if (isNaN(estoqueNum) || estoqueNum < 0) {
      setErro('Informe uma quantidade de estoque inteira e válida.');
      return;
    }

    const payload = {
      nome: nome.trim(),
      preco: precoNum,
      descricao: descricao.trim() || null,
      imagemUrl: imagemUrl.trim() || null,
      estoque: estoqueNum
    };

    setSalvando(true);
    try {
      if (modoEdicao) {
        try {
          await produtosApi.put(`/produtos/${produtoParaEditar.id}`, payload);
          onToast({
            type: 'success',
            title: 'Produto Atualizado',
            message: `"${payload.nome}" foi atualizado no catálogo.`
          });
        } catch (err) {
          console.warn('[frontend] ms-produtos offline. Publicando atualização no Barramento...');
          const itemAtualizado = { id: produtoParaEditar.id, ...payload };
          await brokerApi.post('/publish', {
            topic: 'produtos',
            event: 'PRODUTO_ATUALIZAR_COMANDO',
            payload: itemAtualizado
          });
          onToast({
            type: 'warning',
            title: 'Atualização Enfileirada (Modo Resiliente)',
            message: `O ms-produtos está offline! A alteração de "${payload.nome}" foi enfileirada no Barramento e sincronizada.`
          });
          await new Promise((r) => setTimeout(r, 150));
        }
      } else {
        try {
          await produtosApi.post('/produtos', payload);
          onToast({
            type: 'success',
            title: 'Produto Cadastrado',
            message: `"${payload.nome}" foi adicionado com sucesso.`
          });
        } catch (err) {
          console.warn('[frontend] ms-produtos offline. Acionando Store-and-Forward no Barramento...');
          const id =
            typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);

          const novoProduto = { id, ...payload };
          await brokerApi.post('/publish', {
            topic: 'produtos',
            event: 'PRODUTO_CRIAR_COMANDO',
            payload: novoProduto
          });

          onToast({
            type: 'warning',
            title: 'Produto Enfileirado (Store-and-Forward)',
            message: `O ms-produtos está offline! O produto "${payload.nome}" foi enfileirado no Barramento e será gravado no SQLite quando o serviço voltar.`
          });
          await new Promise((r) => setTimeout(r, 150));
        }
      }
      onSalvo();
      onClose();
    } catch (finalErr) {
      console.error('Erro ao salvar produto:', finalErr);
      const mensagem =
        finalErr.response?.data?.error ||
        'Não foi possível salvar o produto nem via ms-produtos nem via Barramento de Eventos.';
      setErro(mensagem);
    } finally {
      setSalvando(false);
    }
  }

  const modalJSX = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-md transition-opacity duration-200"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-surface-container-lowest w-full max-w-[620px] rounded-[24px] shadow-[0_24px_64px_rgba(0,0,0,0.18)] p-6 sm:p-8 flex flex-col gap-6 relative animate-fade-in-up max-h-[92vh] overflow-y-auto border border-surface-container">
        {/* Topo */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-outline font-semibold block">
              Catálogo • ms-produtos :3001
            </span>
            <h2 className="font-sans text-2xl text-on-surface font-semibold tracking-tight">
              {modoEdicao ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h2>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              {modoEdicao
                ? 'Atualize os dados do produto diretamente no catálogo oficial.'
                : 'Cadastre um novo produto no banco de dados de ms-produtos.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="w-8 h-8 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {erro && (
            <div className="flex items-start gap-2 p-3.5 bg-error-container/50 text-error border border-error/20 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-on-surface block" htmlFor="prod-name">
              Nome do Produto *
            </label>
            <input
              id="prod-name"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Monitor Gamer 27 165Hz"
              required
              autoFocus
              className="w-full bg-surface-container-lowest text-on-surface text-sm px-4 py-2.5 rounded-xl border border-surface-container focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 focus:outline-none transition-all placeholder:text-outline"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface block" htmlFor="prod-price">
                Preço Unitário (R$) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm text-outline">R$</span>
                <input
                  id="prod-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  placeholder="1250.00"
                  required
                  className="w-full bg-surface-container-lowest text-on-surface text-sm pl-10 pr-4 py-2.5 rounded-xl border border-surface-container focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 focus:outline-none transition-all tabular-nums"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface block" htmlFor="prod-stock">
                Estoque Disponível *
              </label>
              <div className="relative flex items-center">
                <input
                  id="prod-stock"
                  type="number"
                  step="1"
                  min="0"
                  value={estoque}
                  onChange={(e) => setEstoque(e.target.value)}
                  placeholder="10"
                  required
                  className="w-full bg-surface-container-lowest text-on-surface text-sm px-4 pr-20 py-2.5 rounded-xl border border-surface-container focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 focus:outline-none transition-all tabular-nums"
                />
                <span className="absolute right-3.5 text-[11px] text-outline">unidades</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-on-surface block" htmlFor="prod-desc">
              Descrição
            </label>
            <textarea
              id="prod-desc"
              rows="3"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição real do produto..."
              className="w-full bg-surface-container-lowest text-on-surface text-sm px-4 py-2.5 rounded-xl border border-surface-container focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 focus:outline-none transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-on-surface block" htmlFor="prod-img">
              URL da Imagem (opcional)
            </label>
            <input
              id="prod-img"
              type="url"
              value={imagemUrl}
              onChange={(e) => setImagemUrl(e.target.value)}
              placeholder="https://exemplo.com/foto-produto.jpg"
              className="w-full bg-surface-container-lowest text-on-surface text-sm px-4 py-2.5 rounded-xl border border-surface-container focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 focus:outline-none transition-all placeholder:text-outline"
            />
            {imagemUrl.trim() !== '' && (
              <div className="mt-2 p-2.5 rounded-xl bg-surface-container-low/80 border border-surface-container flex items-center gap-3">
                <div className="w-28 aspect-[4/3] rounded-xl overflow-hidden border border-surface-container shrink-0 bg-white">
                  <ProdutoAvatar
                    nome={nome || 'Pré-visualização'}
                    imagemUrl={imagemUrl}
                    onImageMetrics={setPreviewMetrics}
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="text-xs font-semibold text-on-surface block">
                    Pré-visualização da vitrine
                  </span>
                  {previewMetrics ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-on-surface-variant">
                      <span className="font-mono bg-surface-container-lowest px-1.5 py-0.5 rounded border border-surface-container">
                        {previewMetrics.width}×{previewMetrics.height}px
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-primary-fixed/70 text-primary font-medium">
                        {ORIENTATION_LABELS[previewMetrics.orientation] || 'Paisagem'}
                      </span>
                      <span className="text-outline">•</span>
                      <span>
                        {previewMetrics.fitMode === 'cover'
                          ? 'Preenchimento natural'
                          : 'Enquadramento adaptativo'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-outline block">
                      Analisando proporção da imagem...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nota Snapshot */}
          <div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3 mt-1">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold text-on-surface">
                Snapshot Pattern nos Pedidos
              </h4>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Alterações de preço ou nome afetam apenas novos pedidos. Compras já registradas em{' '}
                <code className="font-mono">ms-pedidos</code> permanecem imutáveis.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-surface-container">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-medium bg-primary-container hover:bg-primary text-on-primary transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {salvando
                  ? 'Processando...'
                  : modoEdicao
                  ? 'Salvar Alterações'
                  : 'Cadastrar Produto'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
