---
name: VERO Store — DSW3 Microserviços
project_id: 16191531843625603381
description: E-commerce flagship de hardware inspirado em Apple Store & Liquid Glass, com separação entre vitrine de compra e gestão de catálogo, comprovante imutável (Snapshot Pattern) e degradação graciosa via Event Broker e CQRS.
---

# Design System — VERO Store (Stitch Project `16191531843625603381`)

## 1. Visual Theme & Atmosphere
Interface editorial de varejo tecnológico inspirada em **Apple Store** com superfícies limpas, fotografia de estúdio em pedestal claro e elementos translúcidos **Liquid Glass**. Separa claramente a jornada do comprador (Vitrine, Checkout Rápido, Meus Pedidos Master-Detail) da operação administrativa (`Gerenciar Loja`) e da observabilidade distribuída (`StatusServicosPopover`).

## 2. Color Palette & Roles
- **Canvas Surface** (`#FAF8FE`) — Fundo base sereno da vitrine e listagens.
- **Apple Clean Background** (`#FBFBFD`) — Fundo do fluxo de Checkout Rápido.
- **Pure Surface** (`#FFFFFF`) — Cartões principais, modal de cadastro e painel de comprovante.
- **Surface Container Low** (`#F4F3F8` / `#F5F5F7`) — Pedestais de imagem, chips inativos, faixas de garantia e rodapé.
- **On-Surface Ink** (`#1A1B1F` / `#1D1D1F`) — Títulos, preços principais e texto de alto contraste.
- **Muted Variant** (`#414753` / `#86868B`) — Descrições, metadados e rótulos secundários.
- **Primary Action** (`#0071E3` / hover `#0077ED` / profundo `#0059B5`) — Botões de conversão ("Comprar", "Finalizar Pedido", "Ver comprovante") e anéis de foco.
- **Status Semânticos:**
  - `REALIZADO` / Estoque disponível / Online: `#107C41` / `#1C7E2D` sobre `#EBF9EE`.
  - `CANCELADO` / Esgotado / Offline: `#BA1A1A` / `#D70015` sobre `#FDF2F2`.
  - Modo Contingência / Fila Segura / Estoque baixo: `#B41C00` / `#D97706` sobre `#FFDAD3` / `#FFFBEB`.

## 3. Typography Rules
- **Display & Headings:** `Plus Jakarta Sans` (weights 600–800, tracking levemente fechado).
- **Body & UI:** `DM Sans` / `Inter` (weights 400–600).
- **Technical & Financial Figures:** `JetBrains Mono` + `tabular-nums` para valores em R$, UUIDs de pedidos, timestamps e portas dos microsserviços.

## 4. Telas Implementadas a partir do Stitch
1. **Vitrine (`CatalogoProdutos` + `CardProduto`)**: Sub-nav sticky por categoria, Hero Flagship Spotlight, barra de confiança de 4 pilares, grid de produtos com foto de estúdio, seção editorial de engenharia e newsletter.
2. **Checkout Rápido (`FormularioPedido`)**: Layout assimétrico 2 colunas (seletor de produto, quantidade editável com validação local e bloco de Preço Travado por Snapshot à esquerda; Resumo sticky à direita) + confirmação Peak-End pós-compra.
3. **Meus Pedidos (`HistoricoPedidos`)**: Layout Master-Detail (lista filtrável por `Todos` / `Realizados` / `Cancelados` à esquerda e `Comprovante Oficial` imutável sticky à direita) + modal limpo de cancelamento com estorno.
4. **Gerenciar Loja (`GerenciarLoja` + `ModalProduto`)**: Sub-header contextual de gestão, lista industrial de catálogo com saldo de estoque em tempo real, edição/exclusão (com Store-and-Forward) e modal Apple-style de produto.
5. **Contingência Graciosa (`App` + `StatusServicosPopover` + `Footer`)**: Banner de fila segura não-bloqueante no topo quando há indisponibilidade + indicador persistente no rodapé que expande o painel ao vivo dos 4 nós (`ms-produtos :3001`, `ms-pedidos :3002`, `event-broker :3003`, `ms-query :3004`).
