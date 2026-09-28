# Sistema Distribuído de Catálogo e Pedidos — Arquitetura de Microserviços

**Instituição:** Instituto Federal de Educação, Ciência e Tecnologia de São Paulo (IFSP)  
**Curso / Disciplina:** Tecnologia em Análise e Desenvolvimento de Sistemas | DSW 3 (Desenvolvimento Web 3)  
**Docente Responsável:** Prof. Me. André Luís Bordignon  
**Aluno:** Enzo Alves dos Santos Souza  
**Matrícula:** CP3025802  
**Status do Projeto:** 100% Implementado (Momentos 1, 2, 3 e 4)

---

## 1. Visão Geral do Sistema

Aplicação web distribuída de ponta a ponta desenvolvida sob o padrão arquitetural de **Microserviços**, composta por dois serviços de backend independentes (`ms-produtos` e `ms-pedidos`) e uma aplicação cliente única desenvolvida em **React (Vite)** com foco em alta resiliência, degradação graciosa e tolerância a falhas.

### Padrões Arquiteturais Implementados
- **Database-per-Service:** Cada microsserviço gerencia exclusivamente sua própria base de dados relacional (SQLite via Prisma ORM). O isolamento é total: nenhum microsserviço realiza consultas diretas ao banco do outro.
- **Snapshot Pattern:** No momento da realização de um pedido (`POST /pedidos`), o `ms-pedidos` grava uma **cópia imutável** do `nomeProduto` e do `precoUnitario` no banco de pedidos. Isso impede que atualizações cadastrais ou alterações de preços futuras distorçam o histórico contábil/financeiro das compras já efetuadas.
- **Event-Driven Architecture & Cache Local Replicado (Materialized View):** O sistema conta com um **Event Broker** dedicado (`event-broker`, porta 3003) com garantia de entrega (*at-least-once*) e retentativas automáticas. O `ms-produtos` publica eventos de ciclo de vida (`PRODUTO_CRIADO`, `PRODUTO_ATUALIZADO`, `ESTOQUE_ATUALIZADO`, `PRODUTO_EXCLUIDO`), enquanto o `ms-pedidos` os consome e mantém sua própria tabela `ProdutoCache`.
- **CQRS & Query Service Dedicado (ms-query, porta 3004):** O sistema agora conta com um microsserviço de consulta dedicado que implementa o padrão **CQRS (Command Query Responsibility Segregation)**. O `ms-query` mantém uma réplica consolidada dos bancos de dados (projeções de leitura de Produtos e Pedidos) alimentada via `event-broker`. As leituras no frontend e análises agregadas ocorrem com latência ultra-baixa sem competir por recursos de I/O com os serviços transacionais de escrita.
- **Desacoplamento Temporal e Alta Resiliência (Zero Single Point of Failure):** Se o `ms-produtos` cair, o `ms-pedidos` continua realizando pedidos via Cache Replicado e o Frontend continua visualizando produtos e pedidos através do `ms-query` (ou cache local). O sistema sobrevive à queda de múltiplos serviços!
- **Compensação e Ciclo de Vida (Estorno de Estoque):** No cancelamento do pedido (`PATCH /pedidos/:id/cancelar`), o `ms-pedidos` recompõe seu saldo local e publica um evento `PEDIDO_CANCELADO` no broker para estornar o estoque oficial no `ms-produtos` e na projeção do `ms-query`.

---

## 2. Diagrama Arquitetural e Topologia de Serviços

```mermaid
flowchart TD
    subgraph CamadaCliente["Camada Cliente (Frontend)"]
        SPA["Frontend SPA (React + Vite + Tailwind)<br/>Porta: 3000"]
    end

    subgraph CamadaBarramento["Barramento de Eventos Assíncronos"]
        BROKER["Event Broker (event-broker)<br/>Porta: 3003<br/>Fila com Retentativa & Dashboard Web"]
    end

    subgraph CamadaConsulta["Camada CQRS (Query Service)"]
        MS_QUERY["Query Service (ms-query)<br/>Porta: 3004"]
        DB_QUERY[("Banco SQLite Replicado<br/>Projeção Produtos + Pedidos")]
        MS_QUERY --- DB_QUERY
    end

    subgraph CamadaComando["Microsserviços Transacionais (Command)"]
        subgraph DominioPedidos["ms-pedidos (:3002)"]
            MS_PED["Microserviço Pedidos"]
            DB_PED[("SQLite Independente<br/>Pedidos + ProdutoCache")]
            MS_PED --- DB_PED
        end

        subgraph DominioProdutos["ms-produtos (:3001)"]
            MS_PROD["Microserviço Produtos"]
            DB_PROD[("SQLite Independente<br/>Catálogo Oficial")]
            MS_PROD --- DB_PROD
        end
    end

    SPA -->|"1. Compras (POST, PATCH /pedidos)"| MS_PED
    SPA -->|"2. CRUD Catálogo (POST, PUT, DELETE)"| MS_PROD
    SPA -.->|"3. Consultas Resilientes (GET /query/...)"| MS_QUERY
    
    MS_PROD -->|"4. Publica Eventos de Catálogo"| BROKER
    MS_PED -->|"5. Publica Eventos de Pedidos"| BROKER
    
    BROKER -->|"6. Alimenta Cache do ms-pedidos"| MS_PED
    BROKER -->|"7. Alimenta Projeções do ms-query"| MS_QUERY
    BROKER -.->|"8. Baixa & Estorno de Estoque"| MS_PROD

    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef broker fill:#f3e8ff,stroke:#9333ea,stroke-width:2px;
    classDef query fill:#cffafe,stroke:#0891b2,stroke-width:2px;
    classDef ms fill:#f8fafc,stroke:#334155,stroke-width:2px;
    classDef db fill:#fef3c7,stroke:#d97706,stroke-width:2px;

    class SPA client;
    class BROKER broker;
    class MS_QUERY query;
    class MS_PED,MS_PROD ms;
    class DB_PED,DB_PROD,DB_QUERY db;
```

---

## 3. Matriz de Componentes e Tecnologias

| Componente | Diretório | Tecnologias Principais | Porta | Persistência / Volume |
| :--- | :--- | :--- | :---: | :--- |
| **event-broker** | `/event-broker` | Node.js 20, Express, Pub/Sub, Queue Retry | `3003` | Volume Docker `broker-data` (`/app/data`) |
| **ms-query** | `/ms-query` | Node.js 20, Express, Prisma ORM, CQRS Read Model | `3004` | Volume Docker `query-data` (`/app/prisma/data`) |
| **ms-produtos** | `/ms-produtos` | Node.js 20, Express, Prisma ORM, SQLite | `3001` | Volume Docker `produtos-data` (`/app/prisma/data`) |
| **ms-pedidos** | `/ms-pedidos` | Node.js 20, Express, Prisma ORM, SQLite, Cache | `3002` | Volume Docker `pedidos-data` (`/app/prisma/data`) |
| **Frontend** | `/frontend` | React 18, Vite, Axios, Tailwind CSS, Lucide | `3000` | N/A (Build SPA estático multi-stage Nginx) |
| **Orquestrador** | `/` | Docker Compose (v3.8) | — | Rede interna `dsw3-network` (bridge) |

---

## 4. Especificação dos Contratos de API (Endpoints)

### 4.1. Microserviço de Produtos (`http://localhost:3001`)

| Método | Endpoint | Descrição / Regra | Códigos HTTP |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Health check da saúde do serviço | `200 OK` |
| `GET` | `/produtos` | Listar todos os produtos do catálogo (ordenados por nome) | `200 OK` |
| `GET` | `/produtos/:id` | Buscar detalhes de um produto por UUID | `200 OK`, `404 Not Found` |
| `POST` | `/produtos` | Cadastrar novo produto no catálogo (CRUD) | `201 Created`, `400 Bad Request` |
| `PUT` | `/produtos/:id` | Atualizar dados completos do produto (CRUD) | `200 OK`, `400`, `404` |
| `DELETE`| `/produtos/:id` | Excluir produto do catálogo (CRUD) | `200 OK`, `404 Not Found` |
| `PATCH`| `/produtos/:id/estoque` | Atualizar saldo de estoque (`subtrair` ou `adicionar`) | `200 OK`, `400`, `404` |

#### Payload de Exemplo (Cadastro / Edição de Produto):
```json
{
  "nome": "Monitor Gamer 27 165Hz",
  "preco": 1250.00,
  "descricao": "Monitor IPS 1ms FreeSync HDR",
  "estoque": 15
}
```

---

### 4.2. Microserviço de Pedidos (`http://localhost:3002`)

| Método | Endpoint | Descrição / Regra | Códigos HTTP |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Health check da saúde do serviço | `200 OK` |
| `GET` | `/pedidos` | Listar histórico de pedidos (mais recentes primeiro) | `200 OK` |
| `GET` | `/pedidos/:id` | Obter detalhes e snapshot de um pedido por UUID | `200 OK`, `404 Not Found` |
| `POST` | `/pedidos` | Criar pedido com validação síncrona e Snapshot Pattern | `201 Created`, `400`, `404`, `503` |
| `PATCH`| `/pedidos/:id/cancelar` | Cancelar pedido e estornar estoque no catálogo | `200 OK`, `400`, `404` |

#### Payload de Exemplo (Criação de Pedido):
```json
{
  "produtoId": "4905338d-8204-45c1-b908-90c7fd305d55",
  "quantidade": 2
}
```

#### Tratamento de Respostas e Falhas Mapeadas:
- **`201 Created`**: Pedido aprovado com sucesso, contendo o snapshot imutável do nome e preço unitário.
- **`400 Bad Request`**: Quantidade requerida excede o estoque disponível no catálogo.
- **`404 Not Found`**: Produto informado não existe no catálogo.
- **`503 Service Unavailable`**: `ms-produtos` está offline/inacessível no momento da validação síncrona.

---

## 5. Como Executar o Projeto

### Opção 1: Via Docker Compose (Recomendado — Um Único Comando)

Com o Docker e Docker Compose instalados na máquina:

```bash
# Na raiz do projeto, construa as imagens e inicialize todos os contêineres:
docker compose up --build
```

Os 3 serviços estarão imediatamente acessíveis:
- **Frontend SPA:** [http://localhost:3000](http://localhost:3000)
- **API de Produtos:** [http://localhost:3001](http://localhost:3001) (Health: `/health`)
- **API de Pedidos:** [http://localhost:3002](http://localhost:3002) (Health: `/health`)

Para parar os serviços mantendo a persistência dos dados:
```bash
docker compose down
```

---

### Opção 2: Execução Local Tradicional (Node.js)

#### 1. Instalar Dependências
```bash
cd ms-produtos && npm install && cp .env.example .env
cd ../ms-pedidos && npm install && cp .env.example .env
cd ../frontend && npm install
```

#### 2. Sincronizar Bancos de Dados SQLite (Prisma)
```bash
# Em ms-produtos:
cd ms-produtos
npx prisma generate
npx prisma db push

# Em ms-pedidos:
cd ../ms-pedidos
npx prisma generate
npx prisma db push
```

#### 3. Iniciar os Serviços (3 Terminais)
```bash
# Terminal 1 — ms-produtos
cd ms-produtos && npm run dev    # Roda em http://localhost:3001

# Terminal 2 — ms-pedidos
cd ms-pedidos && npm run dev     # Roda em http://localhost:3002

# Terminal 3 — Frontend
cd frontend && npm run dev       # Roda em http://localhost:3000
```

---

## 6. Roteiro para Apresentação Prática e Arguição Técnica

Para as bancas avaliativas dos **Momentos 2 e 4**, utilize o roteiro prático abaixo:

### Teste 1: Demonstração do Snapshot Pattern
1. Acesse o Frontend em `http://localhost:3000` (Aba **Catálogo**).
2. Cadastre um novo produto com preço **R$ 100,00** e estoque **10**.
3. Vá para a aba **Fazer Pedido**, selecione o produto criado e compre **2 unidades**.
4. Acesse a aba **Histórico de Pedidos** e comprove que o pedido está gravado a **R$ 100,00 cada** (Total: R$ 200,00).
5. Retorne ao Catálogo, clique no botão de **Editar** do produto e mude o preço dele para **R$ 250,00**.
6. Volte à aba **Histórico de Pedidos**: o pedido anterior continuará exatamente com o preço unitário congelado em **R$ 100,00**!

### Teste 2: Cancelamento de Pedido e Recomposição de Estoque
1. No **Histórico de Pedidos**, localize o pedido ativo e clique no botão **Cancelar**.
2. O pedido mudará o status para `CANCELADO`.
3. Verifique o **Catálogo de Produtos**: as 2 unidades compradas retornaram imediatamente ao estoque disponível.

### Teste 3: Cenários de Erro (Estoque Insuficiente e 404)
1. Tente realizar um pedido com quantidade superior ao estoque atual. A interface exibirá validação local e, se forçado via API, responderá `HTTP 400` com a mensagem orientativa de quantidade disponível.
2. Tente consultar um UUID inexistente via Postman: retorno `HTTP 404`.

### Teste 4: Tolerância a Falhas e Desacoplamento Temporal ao Vivo (Event Broker & Cache Replicado)
1. Com todos os serviços rodando, abra o **Monitor do Event Broker** em `http://localhost:3003` para ver as mensagens trafegadas e a fila em tempo real.
2. No terminal do Docker, derrube o `ms-produtos`:
   ```bash
   docker stop ms-produtos
   ```
3. Observe o **Monitor de Serviços** no topo do frontend: a badge do `ms-produtos :3001` ficará vermelha, mas o sistema avisa que o **Modo Resiliente com Cache Local** está ativo.
4. Vá para a aba **Fazer Compra**: os produtos continuam listados a partir do cache local!
5. **Realize um pedido normalmente:** O `ms-pedidos` consulta seu próprio `ProdutoCache` independente, **aprova o pedido imediatamente (HTTP 201 Created)** e congela o snapshot, **sem cair e sem rejeitar o cliente**!
6. Olhe no painel do **Event Broker** (`http://localhost:3003`): o evento de baixa de estoque `PEDIDO_CRIADO` estará na fila (`QUEUED` / `RETRYING`), retido com garantia de entrega.
7. Agora religue o serviço de produtos no terminal:
   ```bash
   docker start ms-produtos
   ```
8. Em segundos, o Broker entrega a mensagem pendente (`DELIVERED`) e o estoque oficial no SQLite do `ms-produtos` é atualizado retroativamente! A resiliência é completa e autônoma.

---

## 7. Coleção de Testes do Postman / Insomnia

O repositório disponibiliza na raiz o arquivo **[`dsw3-postman-collection.json`](./dsw3-postman-collection.json)**.
Ele inclui requisições pré-configuradas com variáveis de ambiente para:
- `POST /produtos` (Cadastro)
- `GET /produtos` (Listagem)
- `GET /produtos/:id` (Busca por ID)
- `PUT /produtos/:id` (Edição completa)
- `DELETE /produtos/:id` (Exclusão)
- `POST /pedidos` (Sucesso 201 com Snapshot)
- `POST /pedidos` (Erro 400 — Estoque insuficiente)
- `POST /pedidos` (Erro 404 — Produto inexistente)
- `GET /pedidos` (Listagem com snapshots)
- `GET /pedidos/:id` (Detalhes)
- `PATCH /pedidos/:id/cancelar` (Cancelamento e estorno)
- `GET /health` (Health check em ambos os serviços)
