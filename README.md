# Monitor de Alertas em Tempo Real

Aplicação web full-stack de monitoramento e alertas em tempo real. Os eventos entram por um broker de mensagens (RabbitMQ), são validados com Zod, gravados no PostgreSQL via Prisma, enviados ao dashboard por WebSocket e, quando críticos, disparam uma notificação push no ntfy.

**Trabalho Final de Programação Multiplataforma**
**Integrantes:** Arthur Gomes e Felipe Souza
**Professor:** Dr. Alexandre Galvani
**Repositório:** `COLE_AQUI_O_LINK_DO_GITHUB`

---

## Sumário

1. [Arquitetura](#arquitetura)
2. [Tecnologias](#tecnologias)
3. [Estrutura do repositório](#estrutura-do-repositório)
4. [Como executar com Docker Compose](#como-executar-com-docker-compose)
5. [Desenvolvimento local](#desenvolvimento-local)
6. [Variáveis de ambiente](#variáveis-de-ambiente)
7. [Notificações com ntfy](#notificações-com-ntfy)
8. [Documentação das rotas](#documentação-das-rotas)
9. [Modelagem de dados](#modelagem-de-dados)
10. [Como testar](#como-testar)
11. [Critérios de aceite](#critérios-de-aceite)

---

## Arquitetura

```
                         ┌──────────────────────────────────────────┐
                         │               Backend (Node)             │
POST /events ──► RabbitMQ ──► Consumidor                            │
(ou simulador)   (fila       │   ├─ valida o payload (Zod)          │
                  "events")  │   ├─ grava no PostgreSQL (Prisma)    │
                         │   │    └─ idempotente por externalId     │
                         │   ├─ broadcast via WebSocket ──► Dashboard React
                         │   └─ se CRITICAL ──► ntfy (push no celular)
                         │          └─ registra status em NotificationLog
                         └──────────────────────────────────────────┘
```

Fluxo resumido:

1. Um evento é publicado na fila `events` do RabbitMQ (pela rota `POST /events` ou pelo simulador).
2. O consumidor valida o JSON com Zod e tenta gravar o evento. Se o `externalId` já existir, a mensagem é descartada sem duplicar (idempotência).
3. O evento gravado é enviado imediatamente a todos os clientes WebSocket autenticados.
4. Se a severidade for `CRITICAL`, o dispatcher envia um push ao tópico do dispositivo no ntfy e grava o resultado (`SENT` ou `FAILED`) na tabela `NotificationLog`.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | Node.js, TypeScript, Fastify |
| Banco de dados | PostgreSQL 16 + Prisma ORM 6 |
| Broker | RabbitMQ 3 (`amqplib`) |
| Validação | Zod |
| Tempo real | WebSocket (`ws`) com autenticação JWT |
| Push | ntfy (ntfy.sh) |
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Infraestrutura | Docker e Docker Compose |

## Estrutura do repositório

```
projeto/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # modelagem declarativa
│   │   ├── migrations/          # migrações versionadas
│   │   └── seed.ts              # usuário e dispositivos de teste
│   ├── src/
│   │   ├── config/env.ts        # variáveis de ambiente validadas com Zod
│   │   ├── broker/              # conexão, publisher e consumidor idempotente
│   │   ├── ntfy/dispatcher.ts   # envio de push e registro do status
│   │   ├── ws/gateway.ts        # gateway WebSocket (JWT + heartbeat)
│   │   ├── routes/              # auth, events, metrics
│   │   ├── schemas.ts           # contrato do evento (Zod)
│   │   ├── simulate.ts          # simulador de eventos
│   │   └── server.ts
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── hooks/useAlertSocket.ts   # reconexão, backoff e heartbeat
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   └── App.tsx
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Como executar com Docker Compose

**Pré-requisito:** Docker Desktop instalado e em execução (status "Engine running").

1. Copie o arquivo de variáveis e, se quiser, ajuste o `JWT_SECRET`:

   ```bash
   # Linux / macOS
   cp .env.example .env

   # Windows (cmd)
   copy .env.example .env
   ```

2. Suba todos os serviços:

   ```bash
   docker compose up --build
   ```

   A primeira execução leva alguns minutos. O sistema está pronto quando o terminal exibir `Consumidor pronto, aguardando eventos...`.

3. Acesse:

   | Serviço | URL |
   |---|---|
   | Dashboard | http://localhost:8080 |
   | API | http://localhost:3000 |
   | Painel do RabbitMQ | http://localhost:15672 (usuário `guest`, senha `guest`) |

4. Faça login no dashboard com o usuário de teste criado pelo seed:

   - **E-mail:** `teste@monitor.com`
   - **Senha:** `123456`

As migrações do Prisma e o seed são executados automaticamente quando o container do backend inicia (`prisma migrate deploy` e `prisma db seed`). O seed usa `upsert`, então não duplica dados se for executado de novo.

Para encerrar:

```bash
docker compose down        # mantém os dados do banco
docker compose down -v     # remove também o volume do banco
```

## Desenvolvimento local

Para rodar o backend e o frontend fora do Docker (com hot reload), suba só o banco e o broker:

```bash
docker compose up -d db rabbitmq
```

**Backend** (em `backend/`):

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev                # http://localhost:3000
```

**Frontend** (em `frontend/`):

```bash
npm install
npm run dev                # http://localhost:5173
```

**Simulador de eventos** (em `backend/`, com a API no ar):

```bash
npm run simulate
```

O simulador publica um evento aleatório a cada 4 segundos (60% INFO, 25% WARNING, 15% CRITICAL). Cada evento crítico gera um push real no ntfy.

**Prisma Studio** (visualizar o banco):

```bash
npx prisma studio          # http://localhost:5555
```

> No Windows, se o PowerShell bloquear o `npm` por política de execução de scripts, use o `cmd` ou rode `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

## Variáveis de ambiente

### Backend

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | String de conexão do PostgreSQL | obrigatória |
| `RABBITMQ_URL` | String de conexão AMQP | `amqp://guest:guest@localhost:5672` |
| `JWT_SECRET` | Segredo usado para assinar os tokens JWT | `troque-este-segredo` |
| `NTFY_URL` | Servidor ntfy (público ou auto-hospedado) | `https://ntfy.sh` |
| `APP_URL` | URL do dashboard, usada no link da notificação | `http://localhost:5173` |
| `PORT` | Porta da API | `3000` |

No Docker Compose, `DATABASE_URL`, `RABBITMQ_URL`, `APP_URL` e `PORT` já são definidos no `docker-compose.yml`. Só `JWT_SECRET` e `NTFY_URL` vêm do arquivo `.env` da raiz.

### Frontend

| Variável | Descrição | Padrão |
|---|---|---|
| `VITE_API_URL` | URL da API acessada pelo navegador | `http://localhost:3000` |

## Notificações com ntfy

Cada dispositivo possui um tópico próprio no ntfy. Os dispositivos criados pelo seed são:

| Dispositivo | Tópico ntfy |
|---|---|
| Servidor Web | `monitor-servidor-issofunciona` |
| Banco de Dados | `monitor-banco-issofunciona` |
| Sensor de Temperatura | `monitor-sensor-issofunciona` |

Para receber os alertas:

1. Instale o app **ntfy** (Android ou iOS) ou abra https://ntfy.sh/app no navegador.
2. Assine o tópico do dispositivo que vai testar, com o nome exato da tabela acima.
3. Publique um evento `CRITICAL` para esse dispositivo (veja [Como testar](#como-testar)).

O dispatcher envia o push com cabeçalhos de controle do ntfy: `Title` (título), `Priority: 5` (urgente), `Tags` (emojis de alerta) e `Click` (URL aberta ao tocar na notificação).

> Os tópicos do ntfy.sh são públicos: qualquer pessoa que souber o nome consegue ler as mensagens. Por isso o sufixo do tópico é configurável em `backend/prisma/seed.ts`.

## Documentação das rotas

Base URL: `http://localhost:3000`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Status da API e do banco de dados |
| POST | `/auth/login` | Autentica e retorna um JWT |
| GET | `/devices` | Lista os dispositivos cadastrados |
| POST | `/events` | Valida e publica um evento no broker (resposta `202`) |
| GET | `/events` | Últimos 50 eventos, com dispositivo e notificações |
| GET | `/notifications` | Últimos 50 registros de envio de notificação |
| GET | `/metrics` | Totais: eventos, críticos, push enviados e push com falha |
| WS | `/ws?token=<JWT>` | Canal de eventos em tempo real |

### `POST /auth/login`

Requisição:

```json
{ "email": "teste@monitor.com", "password": "123456" }
```

Resposta `200`:

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "...", "name": "Usuário Teste", "email": "teste@monitor.com" }
}
```

Erros: `400` (payload inválido) e `401` (credenciais inválidas).

### `POST /events`

Requisição:

```json
{
  "type": "servidor_fora",
  "severity": "CRITICAL",
  "deviceId": "ID_DO_DISPOSITIVO",
  "payload": { "msg": "Servidor nao responde" }
}
```

| Campo | Tipo | Observação |
|---|---|---|
| `type` | string | obrigatório |
| `severity` | `INFO`, `WARNING` ou `CRITICAL` | obrigatório |
| `deviceId` | string | obrigatório, deve ser o `id` de um dispositivo existente |
| `payload` | objeto | obrigatório, conteúdo livre |
| `externalId` | string | opcional, gerado se omitido. É a chave de idempotência |
| `publishedAt` | string ISO 8601 | opcional, gerado se omitido. Usado para medir a latência |

Resposta `202`:

```json
{ "accepted": true, "externalId": "074b54e1-4b3a-4f7b-946a-..." }
```

Erro `400`: payload não passou na validação do Zod. Reenviar o mesmo `externalId` não cria um segundo evento.

### `GET /metrics`

```json
{ "total": 6, "critical": 4, "sent": 3, "failed": 1 }
```

### WebSocket `/ws`

- O cliente conecta em `ws://localhost:3000/ws?token=<JWT>`.
- O servidor valida o JWT logo após o handshake. Se for inválido, encerra a conexão com o código **4401**.
- Após conectar, o servidor envia `{"type":"hello"}`.
- A cada novo evento gravado, o servidor envia `{"type":"event","event":{...}}`.
- **Heartbeat:** o servidor envia `ping` a cada 30 s e derruba conexões que não respondem. O cliente envia `{"type":"ping"}` a cada 20 s e espera `{"type":"pong"}`.
- **Reconexão:** o cliente tenta reconectar automaticamente com backoff exponencial (1 s, 2 s, 4 s... até 30 s).

## Modelagem de dados

O schema completo está em `backend/prisma/schema.prisma`, com migrações versionadas em `backend/prisma/migrations/`.

| Modelo | Descrição | Índices |
|---|---|---|
| `User` | Usuários da plataforma (senha com hash bcrypt) | `email` único |
| `Device` | Dispositivos/tópicos, vinculados a um usuário | `userId`, `ntfyTopic` único |
| `BusinessEvent` | Eventos de negócio recebidos pelo broker | `externalId` único, `createdAt`, `(severity, createdAt)`, `deviceId` |
| `NotificationLog` | Histórico e status de entrega de cada push | `(status, createdAt)`, `eventId` |

Relações: `User 1─N Device 1─N BusinessEvent 1─N NotificationLog`.

Boas práticas aplicadas:

- Relações explícitas com chaves estrangeiras.
- Índices nos campos de consulta frequente (data/hora, severidade e status de entrega).
- Consultas com `include`/`select` em uma única query, sem N+1 (por exemplo, `GET /events` traz dispositivo e notificações de uma vez).
- Tipagem estática ponta a ponta com o cliente gerado `@prisma/client`.

## Como testar

Pegue o `id` de um dispositivo em http://localhost:3000/devices e substitua `ID_DO_DISPOSITIVO` nos comandos abaixo (exemplos para o `cmd` do Windows).

**Evento INFO** (aparece no dashboard, sem push):

```cmd
curl -X POST http://localhost:3000/events -H "Content-Type: application/json" -d "{\"type\":\"cpu_alta\",\"severity\":\"INFO\",\"deviceId\":\"ID_DO_DISPOSITIVO\",\"payload\":{\"cpu\":72}}"
```

**Evento CRITICAL** (toast no dashboard e push no ntfy):

```cmd
curl -X POST http://localhost:3000/events -H "Content-Type: application/json" -d "{\"type\":\"servidor_fora\",\"severity\":\"CRITICAL\",\"deviceId\":\"ID_DO_DISPOSITIVO\",\"payload\":{\"msg\":\"Servidor nao responde\"}}"
```

**Idempotência** (rode duas vezes; a segunda é descartada):

```cmd
curl -X POST http://localhost:3000/events -H "Content-Type: application/json" -d "{\"externalId\":\"teste-123\",\"type\":\"cpu_alta\",\"severity\":\"WARNING\",\"deviceId\":\"ID_DO_DISPOSITIVO\",\"payload\":{\"cpu\":85}}"
```

O log do backend mostra `Duplicado ignorado: teste-123` e o banco mantém um único registro.

**Autenticação do WebSocket** (Console do navegador, F12):

```js
const ws = new WebSocket("ws://localhost:3000/ws?token=falso");
ws.onclose = (e) => console.log("fechado com código:", e.code, e.reason);
// resultado esperado: fechado com código: 4401 Token inválido
```

**Resiliência da conexão:** com o dashboard aberto, pare o backend (`docker compose stop backend`). O indicador muda para "Reconectando...". Ao subir de novo (`docker compose start backend`), volta para "Conectado" sozinho.

**Falha de entrega:** defina `NTFY_URL=http://localhost:9999` no `.env`, reinicie o backend e envie um evento CRITICAL. O `NotificationLog` registra `FAILED` com o erro.

## Critérios de aceite

| # | Critério | Como é atendido |
|---|---|---|
| 1 | Persistência confiável | Todo evento é gravado em `BusinessEvent`, e cada push gera um `NotificationLog` com status (`PENDING`, `SENT` ou `FAILED`), tentativas e timestamps. |
| 2 | Latência de alerta (até 500 ms) | O broadcast WebSocket ocorre antes da chamada ao ntfy. O dashboard exibe a latência de cada evento (`Date.now() - publishedAt`). Nos testes, ficou entre 12 ms e 36 ms. |
| 3 | Disparo externo | Eventos `CRITICAL` disparam push no ntfy com prioridade 5, tags e link de ação, recebido no dispositivo inscrito no tópico. |
| 4 | Resiliência da conexão | O hook `useAlertSocket` reconecta automaticamente com backoff exponencial e heartbeat, sem travar a interface. |
| 5 | Responsividade | Layout mobile-first com Grid e Tailwind, validado sem overflow horizontal em 360 px, 768 px, 1024 px e 1920 px. |

**Acessibilidade:** alertas com `role="alert"`, ícone e texto além da cor, contraste elevado, áreas de toque de no mínimo 44 px e rótulos associados nos formulários.
