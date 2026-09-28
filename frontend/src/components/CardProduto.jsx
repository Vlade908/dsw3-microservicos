import React from 'react';
import { ShoppingBag, Edit3, Trash2, CheckCircle2, AlertTriangle, XCircle, Tag } from 'lucide-react';
import { formatarPreco } from '../services/api';

// Inferência semântica de categoria comercial
function obterCategoria(nome = '') {
  const n = nome.toLowerCase();
  if (n.includes('monitor')) return 'Monitores';
  if (n.includes('teclado') || n.includes('mouse') || n.includes('mousepad')) return 'Periféricos';
  if (n.includes('headset') || n.includes('fone') || n.includes('áudio') || n.includes('som')) return 'Áudio';
  if (n.includes('memória') || n.includes('ssd') || n.includes('processador') || n.includes('placa')) return 'Hardware';
  return 'Tecnologia';
}

export default function CardProduto({ produto, onComprar, onEditar, onExcluir }) {
  const esgotado = produto.estoque <= 0;
  const estoqueBaixo = produto.estoque > 0 && produto.estoque <= 5;
  const categoria = obterCategoria(produto.nome);

  // Simulação de parcelamento de loja real
  const precoParcela = produto.preco > 0 ? (produto.preco / 10).toFixed(2) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      
      {/* Topo do Card: Categoria & Ações de Gestão (CRUD) */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Tag className="w-3 h-3 text-slate-500" />
            <span>{categoria}</span>
          </span>

          {/* Botões de Ação Administrativa (Editar e Excluir mantidos para demonstração do Snapshot) */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEditar(produto)}
              title="Editar produto (Demonstrar Snapshot Pattern)"
              aria-label={`Editar ${produto.nome}`}
              className="p-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onExcluir(produto.id, produto.nome)}
              title="Excluir produto do catálogo"
              aria-label={`Excluir ${produto.nome}`}
              className="p-1.5 text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Título do Produto */}
        <h3 className="font-bold text-slate-900 text-base mb-1.5 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
          {produto.nome}
        </h3>

        {/* Descrição */}
        <p className="text-slate-600 text-xs line-clamp-2 mb-4 min-h-[32px] leading-relaxed">
          {produto.descricao || 'Produto oficial com garantia integral de fábrica.'}
        </p>

        {/* Status de Disponibilidade e Estoque */}
        <div className="flex items-center gap-1.5 text-xs mb-4">
          {esgotado ? (
            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold text-[11px]">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Indisponível no estoque</span>
            </span>
          ) : estoqueBaixo ? (
            <span className="inline-flex items-center gap-1 text-amber-800 font-semibold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Últimas {produto.estoque} unidades disponíveis</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{produto.estoque} un. em estoque para envio imediato</span>
            </span>
          )}
        </div>
      </div>

      {/* Bloco de Preço Comercial e Ação de Compra */}
      <div className="pt-4 border-t border-slate-100 flex items-end justify-between gap-3">
        <div>
          <span className="block text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
            Preço à vista
          </span>
          <span className="text-xl font-black text-slate-900 tracking-tight tabular-nums block">
            {formatarPreco(produto.preco)}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
            ou 10x de {formatarPreco(precoParcela)} sem juros
          </span>
        </div>

        <button
          onClick={() => onComprar(produto)}
          disabled={esgotado}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            esgotado
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Comprar</span>
        </button>
      </div>
    </div>
  );
}
