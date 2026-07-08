# Prompt 2 — инфраструктура Dify + Qdrant + LM Studio + Cloud.ru S3

Подготовь инфраструктурную конфигурацию для **Dify-first RAG stack**.

Главное правило: Dify — главный RAG-движок. Qdrant используется как vector store Dify. LM Studio используется как OpenAI-compatible model provider для embeddings и LLM. Cloud.ru S3 используется для хранения оригиналов файлов приложения и может использоваться Dify для storage, если self-hosted Dify настраивается на S3.

Не копируй исходный код Dify в наш репозиторий. Предполагаем, что Dify установлен отдельно официальным способом. Наша задача — подготовить env, docker-compose examples, health checks и документацию.

## Создай структуру

```text
infra/
  dify/
    .env.qdrant.s3.lmstudio.example
    docker-compose.override.example.yml
    README.md
  qdrant/
    docker-compose.qdrant.yml
    qdrant.env.example
    README.md
  lmstudio/
    README.md
    systemd-lmstudio.example.service
  platform/
    docker-compose.platform.example.yml
    README.md

docs/
  DIFY_SETUP.md
  LM_STUDIO_DIFY_PROVIDER_SETUP.md
  QDRANT_DIFY_MODE.md
  S3_CLOUD_RU_SETUP.md
  END_TO_END_RAG_DEPLOYMENT.md
```

## infra/dify/.env.qdrant.s3.lmstudio.example

Добавь пример env для Dify:

```text
# Vector store
VECTOR_STORE=qdrant
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=change-me
QDRANT_CLIENT_TIMEOUT=20
QDRANT_GRPC_ENABLED=true
QDRANT_GRPC_PORT=6334
QDRANT_REPLICATION_FACTOR=1

# File storage
STORAGE_TYPE=s3
S3_ENDPOINT=
S3_REGION=ru-central-1
S3_BUCKET_NAME=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_ADDRESS_STYLE=path

# Dify common
SECRET_KEY=
INIT_PASSWORD=
CONSOLE_WEB_URL=
CONSOLE_API_URL=
SERVICE_API_URL=
APP_WEB_URL=
APP_API_URL=
FILES_URL=
INTERNAL_FILES_URL=

# CORS
WEB_API_CORS_ALLOW_ORIGINS=
CONSOLE_CORS_ALLOW_ORIGINS=
```

## infra/qdrant/docker-compose.qdrant.yml

Создай Qdrant compose:

1. Service `qdrant`.
2. Порты:
   - `6333:6333` REST;
   - `6334:6334` gRPC.
3. Volume:
   - `qdrant_storage:/qdrant/storage`.
4. API key через env.
5. Healthcheck.
6. Комментарий: не публиковать Qdrant в интернет без firewall/VPN.

## infra/lmstudio/README.md

Опиши:

1. Как запустить LM Studio Server.
2. Как загрузить `Qwen/Qwen3-Embedding-8B` или GGUF-вариант.
3. Рекомендации:
   - для качества использовать F16 или Q8_0;
   - не начинать production embeddings с Q4 без тестов качества.
4. Как проверить `/v1/models`.
5. Как проверить `/v1/embeddings`.
6. Как подключить LM Studio в Dify как OpenAI-compatible provider:
   - base URL: `http://host.docker.internal:1234/v1`, если Dify в Docker, а LM Studio на хосте;
   - model name: `qwen3-embedding-8b` или фактический identifier LM Studio;
   - API key: любое непустое значение, если LM Studio не требует ключ.
7. Как сделать systemd service.
8. Предупреждение: если bind `0.0.0.0`, закрыть порт firewall’ом.

## infra/platform/docker-compose.platform.example.yml

Подготовь пример запуска нашего приложения:

1. `api`.
2. `web` или `nginx`.
3. Без PostgreSQL container для production, так как используется Managed PostgreSQL через `DATABASE_URL`.
4. Подключение Cloud.ru S3 через env.
5. Подключение Dify через `DIFY_BASE_URL`.
6. Подключение LM Studio health через `LM_STUDIO_BASE_URL`.
7. Подключение Qdrant read-only health через `QDRANT_URL`.
8. Для Linux Docker добавить:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

## Документация

В `docs/END_TO_END_RAG_DEPLOYMENT.md` опиши порядок запуска:

1. Создать Cloud.ru S3 bucket.
2. Включить Versioning.
3. Включить Object Lock, если доступно.
4. Создать access keys без права физического удаления, если возможно.
5. Поднять Qdrant.
6. Запустить LM Studio и загрузить embedding model.
7. Поднять Dify с `VECTOR_STORE=qdrant`.
8. В Dify добавить LM Studio как model provider.
9. Создать Dify Knowledge API key.
10. Запустить наше приложение.
11. Проверить health checks.
12. Загрузить тестовый документ.
13. Убедиться, что Dify обработал документ.
14. Убедиться, что в Qdrant появилась collection.
15. Выполнить тестовый поиск через наше приложение.

Добавь troubleshooting:

- Dify не видит LM Studio.
- Dify не пишет в Qdrant.
- Indexing завис на parsing.
- Indexing error из-за embedding model.
- S3 permission denied.
- Docker container не видит `host.docker.internal`.
- Qdrant доступен извне — как закрыть.

## Проверки

После реализации проверь, что все markdown-файлы корректно оформлены, а docker-compose YAML валидный.
