# Runbook: тест на GPU-хосте №1, затем перенос на сервер №2

Всё работает на **одной** удалённой GPU-машине **№1** (тест): PostgreSQL + портал (api+web) +
Dify + Qdrant + LM Studio. После валидации — перенос на **сервер №2** (prod) со свежими данными.

```text
Хост №1 (тест, Windows + GPU)                 →  Сервер №2 (prod)
  Native PostgreSQL  (наш DATABASE_URL)            свежие Postgres + Qdrant + Dify datasets
  Portal: apps/api (:3000) + apps/web (:5173)      LM Studio: Qwen3-Embedding-8B (4096)
  Dify  ── LM Studio (bge-m3 / 1024)               только .env отличается
  Qdrant (managed by Dify)
```

## Хост №1 — что уже есть и что нужно

| Компонент | Статус | Как |
|---|---|---|
| LM Studio (`text-embedding-bge-m3`, 1024) | ✅ работает | уже загружено |
| Qdrant (readyz ok) | ✅ работает | нативно (не через Docker) |
| PostgreSQL | ⬜ поставить | **нативный installer для Windows** (Docker недоступен) |
| Портал (api+web) | ⬜ запустить | `db:migrate` + `seed` + `pnpm dev` |
| **Dify** | ⛔ блокер | нужен Docker/WSL2 (см. ниже) |

### Postgres + портал (без Docker)

```sql
-- в psql под postgres:
CREATE USER dkp WITH PASSWORD 'dkp';
CREATE DATABASE document_portal OWNER dkp;
```
```env
# apps/api/.env
DATABASE_URL=postgresql://dkp:dkp@localhost:5432/document_portal?schema=public
LM_STUDIO_BASE_URL=http://localhost:1234/v1
LM_STUDIO_EMBEDDING_MODEL=text-embedding-bge-m3
LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION=1024
QDRANT_URL=http://localhost:6333
DIFY_BASE_URL=http://localhost           # заработает после подъёма Dify
DIFY_KNOWLEDGE_API_KEY=                   # из Dify, после создания
PROCESSING_WORKER_ENABLED=true
```
```bash
pnpm --filter @dkp/api db:migrate && pnpm --filter @dkp/api seed && pnpm dev
```
После этого работает весь портал, кроме живой индексации (она ждёт Dify).

## Блокер: Docker/WSL2 на №1 не стартует (HCS `0x80070569`)

Dify поставляется только как docker compose, поэтому нужен рабочий контейнерный рантайм.
На №1 Docker Desktop не стартует — первопричина в WSL2/Hyper-V (право «Log on as a service»
для `NT VIRTUAL MACHINE\Virtual Machines`). **Podman/Rancher не помогут — у них та же WSL2-основа.**

Что нужно (admin/IT):
1. `secpol.msc` → Local Policies → User Rights Assignment → **Log on as a service** → добавить
   `NT VIRTUAL MACHINE\Virtual Machines`. Если управляется доменной GPO — просить IT добавить в политику.
2. Включить Windows features: **Virtual Machine Platform** и **Windows Subsystem for Linux**
   (`dism /online /enable-feature`), затем `wsl --update`, `wsl --status`.
3. Рестарт служб `vmcompute`, `LxssManager` (или ребут), затем старт Docker Desktop.

Пока не починили — всё, кроме Dify, на №1 работает (Postgres native + портал + LM Studio + Qdrant).

### После подъёма Dify на №1
- Dify: `VECTOR_STORE=qdrant`, `QDRANT_URL` → уже поднятый на №1 Qdrant, override с
  `extra_hosts: host.docker.internal:host-gateway`.
- Провайдер LM Studio в Dify: `text-embedding-bge-m3`, Base URL `http://host.docker.internal:1234/v1`, dim 1024.
- Создать Knowledge API key → `DIFY_KNOWLEDGE_API_KEY`, перезапустить портал.
- e2e: проект → загрузка → `indexed` → `/search`.

## Перенос на сервер №2 (prod)

Меняется только `.env`; **данные не переносим** (на №2 — `Qwen3-Embedding-8B`/4096, другая
размерность → свежие Qdrant + Dify datasets, `ensureDataset` пере-создаст их). См.
[DEPLOYMENT.md](DEPLOYMENT.md) §7 и [END_TO_END_RAG_DEPLOYMENT.md](END_TO_END_RAG_DEPLOYMENT.md).
