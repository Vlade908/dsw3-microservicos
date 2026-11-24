import React from 'react';
import { formatarPreco } from '../services/api';
import ProdutoAvatar from './ProdutoAvatar';

export default function CardProduto({ produto, onComprar, pedidosOnline = true }) {
  const esgotado = produto.estoque <= 0;
  const estoqueBaixo = produto.estoque > 0 && produto.estoque <= 5;

  return (
    <article
      className={`bg-surface-container-lowest rounded-3xl flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden border border-surface-container ${
        esgotado ? 'opacity-90' : ''
      }`}
    >
      <div>
        {/* Palco Visual (Imagem real do produto se cadastrada ou avatar limpo com dados reais) */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-white border-b border-surface-container/60">
          <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2 flex-wrap">
            {esgotado ? (
              <span className="px-3 py-1 rounded-full bg-surface-container-high/95 backdrop-blur-md shadow-sm text-on-surface-variant text-xs font-semibold tracking-wide">
                Esgotado
              </span>
            ) : estoqueBaixo ? (
              <span className="px-3 py-1 rounded-full bg-tertiary-fixed/95 backdrop-blur-md shadow-sm text-on-tertiary-fixed-variant text-xs font-semibold tracking-wide">
                Últimas {produto.estoque} un.
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-primary-fixed/95 backdrop-blur-md shadow-sm text-primary text-xs font-semibold tracking-wide border border-primary/10">
                Em estoque
              </span>
            )}
          </div>

          <ProdutoAvatar
            nome={produto.nome}
            imagemUrl={produto.imagemUrl}
            produtoId={produto.id}
            zoomOnHover
            className={esgotado ? 'grayscale opacity-75' : ''}
          />

          {!pedidosOnline && !esgotado && (
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[11px] text-on-surface font-medium">Fila Segura Ativa</span>
            </div>
          )}
        </div>

        {/* Informações Reais do Produto */}
        <div className="p-6 pb-3">
          <span className="font-mono text-[11px] text-outline block mb-1">
            ID: {produto.id.slice(0, 8)}...
          </span>
          <h3 className="font-sans text-[19px] leading-snug font-semibold text-on-surface mb-1.5 line-clamp-2">
            {produto.nome}
          </h3>
          <p className="text-sm text-on-surface-variant line-clamp-2 min-h-[40px] leading-relaxed">
            {produto.descricao || 'Sem descrição cadastrada.'}
          </p>
        </div>
      </div>

      {/* Preço Real e Ação */}
      <div className="p-6 pt-2">
        <div className="mb-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-sans text-[22px] font-semibold text-on-surface tabular-nums tracking-tight">
              {formatarPreco(produto.preco)}
            </span>
            <span
              className={`text-xs font-medium tabular-nums ${
                esgotado
                  ? 'text-error'
                  : estoqueBaixo
                  ? 'text-amber-700'
                  : 'text-apple-green'
              }`}
            >
              {esgotado ? '0 un. disponíveis' : `${produto.estoque} un. disponíveis`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onComprar(produto)}
          disabled={esgotado}
          className={`w-full py-2.5 px-4 rounded-full text-sm font-medium transition-all active:scale-[0.98] ${
            esgotado
              ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
              : 'bg-primary-container text-on-primary hover:bg-primary shadow-sm'
          }`}
        >
          {esgotado ? 'Indisponível no momento' : 'Comprar'}
        </button>
      </div>
    </article>
  );
}
