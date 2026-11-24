import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package } from 'lucide-react';

function gerarIniciais(nome = '') {
  const palavras = String(nome)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (palavras.length === 0) return 'PR';
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return (palavras[0][0] + palavras[1][0]).toUpperCase();
}

export const ORIENTATION_LABELS = {
  portrait: 'Retrato',
  square: 'Quadrada',
  landscape: 'Paisagem',
  ultrawide: 'Panorâmica'
};

/**
 * Exibe a imagem real cadastrada no produto (`imagemUrl`), detectando automaticamente
 * a proporção natural da foto em relação ao container para evitar cortes indesejados
 * ou bordas artificiais. Quando ausente/inválida, exibe um palco tipográfico limpo.
 */
export default function ProdutoAvatar({
  nome = '',
  imagemUrl = null,
  produtoId = '',
  className = '',
  compact = false,
  zoomOnHover = false,
  onImageMetrics = null
}) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const onImageMetricsRef = useRef(onImageMetrics);
  onImageMetricsRef.current = onImageMetrics;

  const [erroImagem, setErroImagem] = useState(false);
  const [imgDims, setImgDims] = useState(null);
  const [containerRatio, setContainerRatio] = useState(compact ? 1 : 4 / 3);

  const urlLimpa =
    typeof imagemUrl === 'string' && imagemUrl.trim() !== '' ? imagemUrl.trim() : null;

  useEffect(() => {
    setErroImagem(false);
    setImgDims(null);
  }, [urlLimpa]);

  useEffect(() => {
    if (!urlLimpa || erroImagem) {
      onImageMetricsRef.current?.(null);
      return;
    }

    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
      setImgDims({ width: img.naturalWidth, height: img.naturalHeight });
    }
  }, [urlLimpa, erroImagem]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const updateRatio = (width, height) => {
      if (width > 0 && height > 0) {
        const nextRatio = width / height;
        setContainerRatio((prev) => (Math.abs(prev - nextRatio) >= 0.02 ? nextRatio : prev));
      }
    };

    const rect = el.getBoundingClientRect();
    updateRatio(rect.width, rect.height);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateRatio(entry.contentRect.width, entry.contentRect.height);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [urlLimpa, erroImagem]);

  const metrics = useMemo(() => {
    if (!imgDims || imgDims.width <= 0 || imgDims.height <= 0) return null;

    const naturalRatio = imgDims.width / imgDims.height;
    const mismatch = Math.max(naturalRatio / containerRatio, containerRatio / naturalRatio);

    let orientation = 'landscape';
    if (naturalRatio < 0.85) {
      orientation = 'portrait';
    } else if (naturalRatio > 1.65) {
      orientation = 'ultrawide';
    } else if (naturalRatio >= 0.85 && naturalRatio <= 1.18) {
      orientation = 'square';
    }

    let fitMode = 'adaptive';
    if (mismatch <= 1.16 && !compact && orientation === 'landscape') {
      fitMode = 'cover';
    } else if (mismatch <= 1.12 && compact) {
      fitMode = 'contain';
    }

    return {
      width: imgDims.width,
      height: imgDims.height,
      naturalRatio,
      orientation,
      fitMode
    };
  }, [imgDims, containerRatio, compact]);

  useEffect(() => {
    if (metrics) {
      onImageMetricsRef.current?.(metrics);
    }
  }, [metrics]);

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setImgDims({ width: naturalWidth, height: naturalHeight });
    }
  };

  if (urlLimpa && !erroImagem) {
    const isCover = metrics?.fitMode === 'cover';
    const paddingClass =
      metrics?.fitMode === 'contain' ? 'p-0.5' : compact ? 'p-1' : 'p-2.5 sm:p-3';

    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full overflow-hidden flex items-center justify-center bg-white ${className}`}
      >
        <img
          ref={imgRef}
          src={urlLimpa}
          alt={nome}
          loading="lazy"
          onLoad={handleImageLoad}
          onError={() => setErroImagem(true)}
          className={
            isCover
              ? `w-full h-full object-cover object-center ${
                  zoomOnHover ? 'group-hover:scale-105 transition-transform duration-500' : ''
                }`
              : `relative z-[1] max-w-full max-h-full w-full h-full object-contain ${paddingClass} ${
                  zoomOnHover
                    ? 'group-hover:scale-105 transition-transform duration-500'
                    : 'transition-opacity duration-300'
                }`
          }
        />
      </div>
    );
  }

  const iniciais = gerarIniciais(nome);

  if (compact) {
    return (
      <div
        className={`w-full h-full bg-surface-container-low border border-surface-container flex flex-col items-center justify-center text-on-surface-variant select-none ${className}`}
      >
        <Package className="w-5 h-5 text-outline mb-0.5" />
        <span className="font-mono text-[10px] font-semibold tracking-wider text-on-surface">
          {iniciais}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-full bg-gradient-to-br from-surface-container-low to-surface-container flex flex-col items-center justify-center p-5 text-center select-none ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-sm flex items-center justify-center mb-3">
        <Package className="w-6 h-6 text-primary-container" />
      </div>
      <span className="font-sans text-lg font-semibold text-on-surface tracking-tight line-clamp-1 max-w-[90%]">
        {iniciais}
      </span>
      {produtoId && (
        <span className="font-mono text-[11px] text-outline mt-1">
          #{String(produtoId).slice(0, 8)}
        </span>
      )}
    </div>
  );
}
