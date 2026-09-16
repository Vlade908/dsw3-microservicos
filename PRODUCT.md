# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Node.js, Express, Prisma ORM, SQLite, React (Vite), Tailwind CSS

## Users
Alunos e avaliadores acadêmicos (DSW3 - IFSP), consumidores da loja virtual (realização e consulta de pedidos) e operadores de catálogo (gerenciamento de produtos e estoque).

## Product Purpose
Sistema distribuído de catálogo e pedidos concebido sob o padrão arquitetural de Microserviços (Database-per-Service e Snapshot Pattern), provendo uma experiência de compra ágil, consistente e com degradação graciosa em cenários de indisponibilidade de serviços.

## Positioning
Arquitetura de microsserviços desacoplada com comunicação HTTP síncrona interna e resiliência visual: pedidos imutáveis que preservam dados históricos mesmo com alterações futuras no catálogo.

## Operating Context
Ambiente web acadêmico e de produção simulada, orquestrado localmente ou via contêineres Docker, operando sob conexões de rede locais e com observabilidade de status em tempo real.

## Capabilities and Constraints
- Gestão autônoma de produtos com persistência dedicada em SQLite (`ms-produtos`, porta 3001).
- Processamento de pedidos com validação síncrona de existência e saldo de estoque (`ms-pedidos`, porta 3002).
- Snapshot Pattern: cópia imutável de `nomeProduto` e `precoUnitario` no ato da compra.
- Resiliência: resposta HTTP 503 quando `ms-produtos` estiver inacessível, 400 para estoque insuficiente e 404 para item não encontrado.
- Frontend com tratamento gracioso de erros, prevenindo telas brancas e notificando o usuário com clareza.

## Brand Commitments
DSW3 Microserviços IFSP - interface no modo *Operate*: visual profissional, limpo, alta legibilidade, foco em escaneabilidade e clareza de estados de rede e transação.

## Evidence on Hand
Documento de Arquitetura de Software - Sistema Distribuído de Catálogo e Pedidos (DSW3 - IFSP), especificando contratos RESTful e topologia de rede.

## Product Principles
1. Desacoplamento Estrito: cada serviço mantém sua própria base de dados (Database-per-Service).
2. Rastreabilidade e Snapshot: transações financeiras imutáveis gravadas no momento exato do pedido.
3. Resiliência Transparente: falhas de microsserviço reportam códigos e mensagens orientativas sem quebrar o fluxo do usuário.
4. Confiabilidade e Autonomia: cada componente pode ser desenvolvido, testado e executado de maneira independente.

## Accessibility & Inclusion
Layout responsivo, conformidade WCAG AA com contraste adequado, suporte a navegação por teclado e leitores de tela para alertas de erro e confirmação de pedidos.
