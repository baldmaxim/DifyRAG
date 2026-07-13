# DifyRAG

RAG-система строительной компании на базе **Dify**. Главная система — **Dify UI**:
документы загружаются в Dify Knowledge, поиск и чат — прямо в Dify.

> Собственный портал (NestJS + React) выведен из эксплуатации и удалён из репозитория —
> код доступен в истории git (до июля 2026). Данные его Postgres сохранены в volume
> `dkp_postgres_data` на сервере.

## Стек

```text
Dify (UI + RAG engine)  →  LM Studio (:1234, embeddings Qwen3-Embedding-8B dim 4096 + LLM)
        │
        └→ Qdrant (vector store, VECTOR_STORE=qdrant)
```

Всё работает на GPU-сервере. Наружу публикуется только Dify UI через host-прокси
(Caddy/nginx); Qdrant и LM Studio доступны только с хоста (127.0.0.1).

## Структура репозитория

```text
infra/
  platform/   docker-compose.prod.yml — Qdrant на проде (порты на 127.0.0.1)
  qdrant/     локальный Qdrant для экспериментов
  dify/       docker-compose.override.example.yml — override для официального compose Dify
scripts/      ssh-deploy.mjs / ssh-exec.mjs / ssh-exec.ps1 — управление сервером по SSH
docs/         настройка Dify, LM Studio, Qdrant, деплой, runbook
```

Dify разворачивается отдельно из официального репозитория
(`git clone langgenius/dify` → `docker/docker-compose.yaml` + override) — его исходники
в этот репозиторий не копируются.

## Документация

- [docs/DIFY_SETUP.md](docs/DIFY_SETUP.md) — установка и настройка Dify
- [docs/LM_STUDIO_DIFY_PROVIDER_SETUP.md](docs/LM_STUDIO_DIFY_PROVIDER_SETUP.md) — LM Studio как model provider
- [docs/QDRANT_DIFY_MODE.md](docs/QDRANT_DIFY_MODE.md) — Qdrant в режиме vector store для Dify
- [docs/END_TO_END_RAG_DEPLOYMENT.md](docs/END_TO_END_RAG_DEPLOYMENT.md) — сквозной запуск стека
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — деплой на GPU-сервер
- [docs/TEST_HOST_RUNBOOK.md](docs/TEST_HOST_RUNBOOK.md) — runbook тестового хоста
