# План реализации

Реализация ведётся по 7 промтам строго по порядку. После каждого этапа —
`pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

| Этап | Промт | Результат | Статус |
|---|---|---|---|
| 1 | `01_architecture_and_monorepo` | Docs + pnpm-monorepo (`apps/api`, `apps/web`, `packages/shared`), env, toolchain | ✅ выполнено |
| 2 | `02_infra_...` | `infra/{dify,qdrant,lmstudio,platform}` + deployment docs | ⏳ |
| 3 | `03_backend_core_...` | Prisma schema, auth (JWT+argon2), API keys, S3 StorageService, CRUD, seed | ⏳ |
| 4 | `04_dify_ingestion_...` | Dify/LM Studio/Qdrant integrations, processing worker, mappings, poller | ⏳ |
| 5 | `05_search_external_api_...` | `/search`, external API, RBAC, rate limit | ⏳ |
| 6 | `06_frontend_antd_...` | Полный UI на Ant Design 5 | ⏳ |
| 7 | `07_tests_security_deploy_...` | Hardening, тесты, Docker, CI, final review | ⏳ |

## Фазы окружения (локально → сервер)

1. **Authoring** — генерация кода в монорепо (mock-тесты, живой Dify не нужен).
2. **Runtime-валидация на GPU-ПК** — поднять Dify + Qdrant + LM Studio (`Qwen3-Embedding-8B`),
   проверить связку вручную, затем e2e через портал (upload → index → search).
3. **Миграция на удалённый GPU-сервер** — тот же стек, отличия только в `.env`, повтор e2e.

Подробности запуска RAG-среды — [END_TO_END_RAG_DEPLOYMENT.md](END_TO_END_RAG_DEPLOYMENT.md)
(создаётся в промте 02).

## Инварианты, проверяемые автоматически (промты 04/07)

- В Qdrant-клиенте нет write-методов (`upsert`/`deletePoints`/`updateVectors`/`overwritePayload`).
- В `StorageService` нет physical delete (или бросает `ForbiddenByPolicy`).
- Все delete — soft delete + audit log.
- Секреты только на backend; не попадают во frontend bundle и в logs.

## Текущее состояние монорепо (после промта 01)

```text
apps/api   NestJS: ConfigModule + typed configuration + /api/v1/health + Swagger
apps/web   Vite+React+AntD5: скелет landing + QueryClient/ConfigProvider
packages/shared  9 наборов enums/типов
docs/      8 архитектурных документов
```

Проверки `install / build / typecheck / lint / test` — зелёные.
