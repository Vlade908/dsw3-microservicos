---
name: DSW3 Microserviços
description: Sistema distribuído de catálogo e pedidos no modo Operate com resiliência visual e snapshot pattern.
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-subtle: "#eff6ff"
  slate-dark: "#0f172a"
  slate-body: "#334155"
  slate-muted: "#64748b"
  slate-border: "#e2e8f0"
  surface-bg: "#f8fafc"
  surface-card: "#ffffff"
  status-success-bg: "#ecfdf5"
  status-success-text: "#065f46"
  status-success-border: "#a7f3d0"
  status-danger-bg: "#fff1f2"
  status-danger-text: "#9f1239"
  status-danger-border: "#fecdd3"
  status-warning-bg: "#fffbeb"
  status-warning-text: "#92400e"
  status-warning-border: "#fde68a"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  heading:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  tabular:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System — DSW3 Microserviços

## Overview
Interface no modo **Operate** com foco em escaneabilidade de dados operacionais (catálogo, estoque e transações), visualização instantânea da topologia de rede/serviços e alta tolerância a falhas.

## Colors
- **Primária:** Azul Royal (`#2563eb`) e suas derivações sutis para foco e ações afirmativas.
- **Neutros:** Tons de Slate (`slate-50` a `slate-900`) para separar camadas de elevação e evitar contraste excessivo com fundo puro.
- **Semântica de Microsserviços:**
  - Verde Esmeralda (`#059669` / `#ecfdf5`) para nós saudáveis e pedidos confirmados.
  - Vermelho Rosa (`#e11d48` / `#fff1f2`) para serviços fora do ar ou cancelamentos.
  - Âmbar (`#d97706` / `#fffbeb`) para advertências e estoques baixos.

## Typography
- Tipografia base: **Inter**, sem serifa, limpa e legível em densidades compactas.
- Números tabulares (`tabular-nums`) e fontes monoespaçadas para UUIDs de pedidos e valores financeiros em R$.

## Layout
- Shell de aplicação com navegação superior sticky, monitor de conectividade persistente e corpo centralizado com limite de largura (`max-w-7xl`).
- Grid responsivo dinâmico: 1 coluna em mobile, 2 em tablet e 3 colunas em telas desktop.

## Elevation & Depth
- Sombras suaves com dispersão natural (`shadow-sm`, `shadow-md`), sem halos duros.
- Camada de backdrop blur em modais e notificações com fundo semi-opaco.

## Shapes
- Raio de curvatura consistente (`rounded-xl` / `rounded-2xl`) em cartões e botões, conferindo toque contemporâneo.

## Components
- **CardProduto:** Unidade autônoma de catálogo com informações de preço, status de estoque em tempo real e ações de CRUD.
- **FormularioPedido:** Formulário com validação local reativa de saldo e resumo do Snapshot Pattern.
- **HistoricoPedidos:** Tabela densa com valores congelados e controle de cancelamento com estorno.
- **Monitor de Serviços:** Pílula informativa fixa reportando a saúde das portas 3001 e 3002.

## Do's and Don'ts
- **DO:** Usar `tabular-nums` para tabelas financeiras e contadores.
- **DO:** Destacar a imutabilidade do Snapshot Pattern na interface.
- **DON'T:** Usar texto cinza sobre fundos coloridos (regra Impeccable `gray-on-color`).
- **DON'T:** Apresentar telas brancas em falhas de rede — sempre renderizar a casca e avisar com degradação graciosa.
