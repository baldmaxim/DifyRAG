# Топология: портал локально + RAG-стек на удалённом сервере

Вариант для случая, когда локальный Docker недоступен. Портал (api+web) и его PostgreSQL —
на локальной машине; весь RAG-движок (Dify + Qdrant + LM Studio) — на удалённом GPU-сервере.

```text
Локальная машина                         Удалённый GPU-сервер (Docker + GPU)
  Native PostgreSQL (наш DATABASE_URL)      Dify  ── LM Studio (Qwen3-Embedding-8B, 4096)
  Portal: apps/api (:3000) + apps/web  ─────►  Dify Knowledge/Service API (HTTP)
                                              Qdrant  (управляется Dify)
```

Наш портал использует свой **нативный Postgres** локально; у Dify — свой отдельный Postgres/Redis
внутри его compose. Они не пересекаются.

## Часть A — Локально: нативный PostgreSQL + портал

1. Установить **PostgreSQL для Windows** (обычный installer, без Docker). Запомнить пароль
   суперпользователя `postgres`.
2. Создать БД и пользователя (в `psql` под `postgres`):

   ```sql
   CREATE USER dkp WITH PASSWORD 'dkp';
   CREATE DATABASE document_portal OWNER dkp;
   ```

3. В `apps/api/.env` выставить (порт 5432 — дефолтный для нативного Postgres):

   ```env
   DATABASE_URL=postgresql://dkp:dkp@localhost:5432/document_portal?schema=public
   ```

4. Применить миграции, засидить, запустить:

   ```bash
   pnpm --filter @dkp/api db:migrate     # prisma migrate deploy → 0001_init
   pnpm --filter @dkp/api seed           # super admin (SEED_ADMIN_*), doc types, departments
   pnpm dev                              # api :3000, web :5173
   ```

5. Зайти в UI под `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

На этом этапе работает весь портал (auth, проекты, папки, документы, upload, API). Живая
индексация появится, когда подключим Dify (Часть B/C).

## Часть B — Сервер: RAG-стек

На GPU-сервере (по [END_TO_END_RAG_DEPLOYMENT.md](END_TO_END_RAG_DEPLOYMENT.md),
[DIFY_SETUP.md](DIFY_SETUP.md), `infra/`):

1. **Qdrant** — `infra/qdrant/docker-compose.qdrant.yml` (bind `127.0.0.1`, задать `QDRANT_API_KEY`).
2. **LM Studio** на сервере — загрузить **`Qwen/Qwen3-Embedding-8B`** (dim 4096; сервер с GPU тянет
   продакшн-модель, поэтому миграции размерности потом не будет). Порт 1234 закрыть firewall.
3. **Dify** — `VECTOR_STORE=qdrant`, override с `extra_hosts: host.docker.internal:host-gateway`,
   чтобы Dify видел LM Studio на том же хосте.
4. В Dify добавить LM Studio как **OpenAI-compatible** провайдер:
   Model type `Text Embedding`, Model name `qwen3-embedding-8b`,
   Base URL `http://host.docker.internal:1234/v1`, dimension `4096`.
5. Создать **Knowledge API key** (и, опц., App API key для answer-mode).

> Если хотите более лёгкий первый тест — на сервере можно временно взять маленькую модель
> (например `text-embedding-bge-m3`, 1024) и указать её dim и в провайдере Dify, и в env портала.
> Но тогда при переходе на Qwen3-8B нужны свежие Dify datasets (см. DEPLOYMENT.md §7).

## Часть C — Портал → сервер

В `apps/api/.env` (портал локально) указать адреса сервера:

```env
DIFY_BASE_URL=http://<server-host>            # публичный/VPN адрес Dify
DIFY_API_PREFIX=/v1
DIFY_KNOWLEDGE_API_KEY=<из Dify>
DIFY_APP_API_KEY=                              # опц., для mode=answer

# Модель должна совпадать с той, что выбрана в Dify-провайдере:
LM_STUDIO_BASE_URL=http://<server-host>:1234/v1
LM_STUDIO_EMBEDDING_MODEL=qwen3-embedding-8b
LM_STUDIO_EXPECTED_EMBEDDING_DIMENSION=4096

QDRANT_URL=http://<server-host>:6333          # только read-only health
QDRANT_API_KEY=<как на сервере>

PROCESSING_WORKER_ENABLED=true                # чтобы портал слал документы в Dify
```

Перезапустить `pnpm dev`, затем e2e: создать проект → загрузить документ → дождаться `indexed` →
поиск через `/search`.

## Сеть и безопасность

- Порталу **строго нужен** доступ только к **Dify API** (`DIFY_BASE_URL`). Публиковать Dify —
  через **VPN** или IP-allowlist, не «в интернет».
- **Qdrant** и **LM Studio** порталу нужны только для health-диагностики. Их порты можно держать
  **закрытыми** (тогда health покажет `down`/`setup_required`, но ingestion/поиск работают через
  Dify). Qdrant/LM Studio должны быть доступны только самому Dify на том же хосте.
- Никогда не публиковать Qdrant/LM Studio в открытый интернет.

## Когда починят локальный Docker

Можно перейти на полностью-локальный стенд: поднять Dify+Qdrant локально, LM Studio с маленькой
моделью (`bge-m3`/1024) — тогда это отдельный стенд со своими datasets (данные с сервером не
смешивать).
