# CLAUDE.md — правила проекта для Claude Code

Ты работаешь над production-grade приложением **Document Knowledge Portal**.

## Главная цель

Создать веб-портал для хранения, классификации, версионирования, загрузки, изменения, удаления и автоматической RAG-индексации документов строительной компании.

У компании много проектов/ЖК. По каждому проекту есть:

- письма;
- договоры;
- субподряд;
- проектная документация;
- рабочая документация;
- выявленные замечания в РД;
- тендерная документация;
- сметы;
- КС-2/КС-3 по Заказчику и Подрядчикам;
- распредписьма подрядчикам на оплату материалов;
- поступление материалов на объекты: УПД, ТТН, фото машин с материалами;
- суды;
- гарантийные обращения;
- дополнительные работы;
- графики;
- протоколы;
- фото/видео.

Также есть общекорпоративные разделы:

- сотрудники;
- отделы;
- skills отделов;
- шаблоны;
- регламенты;
- контрагенты;
- справочники.

## Dify-first RAG architecture

Dify является главным RAG-движком.

Приложение Document Knowledge Portal является порталом управления:

- проектами;
- папками;
- документами;
- версиями файлов;
- metadata;
- правами доступа;
- S3-оригиналами;
- очередью обработки;
- статусами индексации;
- внешним API;
- audit logs.

Жёсткие архитектурные правила:

1. Приложение **не должно напрямую записывать embeddings в Qdrant**.
2. Приложение загружает оригинал файла в Cloud.ru S3 и отправляет файл в Dify Knowledge Base API.
3. Dify сам:
   - парсит документы;
   - делает cleaning;
   - делает splitting/chunking;
   - вызывает embedding-модель через LM Studio;
   - сохраняет embeddings в Qdrant;
   - выполняет retrieval.
4. Qdrant используется как vector store для Dify.
5. Прямой доступ приложения к Qdrant разрешён только для:
   - health check;
   - read-only diagnostics;
   - просмотра collections для админов;
   - запрещены любые write/upsert/delete point operations.
6. LM Studio используется как локальный OpenAI-compatible endpoint:
   - embeddings: Qwen/Qwen3-Embedding-8B;
   - LLM для генерации ответов, если включён answer mode через Dify App/Workflow.
7. Dify API key, Qdrant API key, S3 keys, LM Studio endpoint и все секреты хранятся только на backend.
8. Frontend никогда не должен получать секреты.
9. Удаление документа в портале:
   - всегда soft delete в PostgreSQL;
   - оригинал в S3 не удаляется;
   - документ в Dify нужно archive/disable, чтобы он пропал из поиска;
   - если archive/disable невозможен, использовать delete в Dify только как удаление из индекса, но не из S3.
10. Восстановление документа:
    - восстановить soft delete в PostgreSQL;
    - unarchive/enable в Dify, если возможно;
    - если Dify-документ был удалён, заново отправить текущую S3-версию в Dify.
11. Замена файла:
    - создать новую document_version в PostgreSQL;
    - отправить новую версию в Dify через update-by-file, если есть dify_document_id;
    - если update-by-file не сработал, создать новый Dify document и обновить mapping.
12. Поиск:
    - основной поиск идёт через Dify retrieve API или через Dify workflow/chat app API;
    - приложение должно уметь искать по project_code, folder_path, document_type, department, scope;
    - по всему проекту искать параллельно по Dify datasets проекта и объединять результаты.
13. Все статусы Dify должны отображаться пользователю:
    - queued;
    - uploading;
    - waiting;
    - parsing;
    - cleaning;
    - splitting;
    - indexing;
    - completed;
    - error;
    - archived;
    - disabled.
14. Любая интеграция должна иметь:
    - unit tests;
    - mocked integration tests;
    - health checks;
    - понятную документацию.

## Технологии

- Backend: NestJS + TypeScript.
- Frontend: React + Vite + TypeScript.
- UI: Ant Design 5 + Ant Design ProComponents.
- ORM: Prisma.
- Database: Managed Service for PostgreSQL.
- File storage: S3-compatible Cloud.ru Object Storage.
- Background jobs: pg-boss через PostgreSQL.
- Auth: JWT access/refresh tokens.
- External API: API keys with scoped permissions.
- Documentation: Swagger/OpenAPI.
- RAG engine: Dify.
- Vector DB: Qdrant, управляется Dify.
- Embedding provider: LM Studio OpenAI-compatible endpoint.
- Embedding model: Qwen/Qwen3-Embedding-8B, dimension 4096.
- Deployment: Docker Compose for local/dev, environment variables for production.

## Dataset strategy

Использовать стратегию `project_section`.

Не создавать один Dify dataset на каждую маленькую папку. Создавать datasets на проект + крупный раздел.

Для каждого проекта:

```text
project_{project_code}__project_card
project_{project_code}__contracts
project_{project_code}__correspondence
project_{project_code}__tender
project_{project_code}__design_docs
project_{project_code}__working_docs
project_{project_code}__estimates
project_{project_code}__finance
project_{project_code}__schedule
project_{project_code}__claims_risks
project_{project_code}__meetings
project_{project_code}__courts_litigation
project_{project_code}__warranty
project_{project_code}__materials_on_site
project_{project_code}__additional_works
project_{project_code}__photo_video
project_{project_code}__archive
```

Для компании:

```text
company__legal
company__commercial
company__finance
company__accounting
company__production
company__procurement
company__pto
company__design_review
company__hr_public
company__it
company__warranty
company__safety
company__templates
company__reference
company__contractors
company__people_public
company__people_private
```

`people_private` должен быть отдельным dataset с отдельными правами доступа.

## Стандартная структура проекта

При создании проекта автоматически создавать папки:

```text
00-project-card
01-contracts
02-correspondence
03-tender
04-design-docs
05-working-docs
  00-registers
  01-incoming-packages
  02-by-discipline
    AR
    KR
    KZh
    KM
    OV
    VK
    EOM
    SS
    APS
    POS
    PPR
  03-detected-remarks
  04-answers-from-designer
  05-closed-remarks
  98-old-versions
06-estimates
  01-contract-estimates
  02-tender-estimates
  03-subcontractor-estimates
  04-current-budget
  05-estimate-comparisons
07-finance
  01-advances-payments
  02-invoices
  03-ks2-ks3
    01-customer-ks2
    02-subcontractor-ks2
    03-ks2-performance-register
  04-taxes
  05-material-payment-allocation-letters
  06-budget-limits
08-schedule
09-claims-risks
10-meetings
11-courts-litigation
  01-pretrial-claims
  02-court-claims
  03-court-materials
  04-court-decisions
  05-enforcement
12-warranty
  01-warranty-requests
  02-inspection-reports
  03-defect-lists
  04-correction-evidence
  05-closed-requests
13-materials-on-site
  01-material-register
  02-upd
  03-ttn
  04-delivery-photos
  05-acceptance-discrepancies
  06-supplier-documents
14-additional-works
  01-requests
  02-calculations
  03-estimates
  04-approval
  05-ks2-closure
15-photo-video
98-old-versions
99-archive
```

## Основные требования к приложению

Пользователь должен уметь:

1. Создавать и редактировать проекты.
2. Видеть стандартное дерево папок проекта.
3. Создавать и редактировать отделы компании.
4. Вести `skills.md` / markdown-описание компетенций отделов.
5. Загружать документы.
6. Редактировать metadata документа.
7. Заменять файл новой версией.
8. Удалять документ только через soft delete.
9. Восстанавливать документ.
10. Смотреть историю версий.
11. Скачивать файл через presigned URL.
12. Видеть статус обработки в Dify.
13. Запускать retry/reindex.
14. Искать документы через Dify retrieval.
15. Управлять API-ключами.
16. Видеть health Dify, LM Studio, Qdrant, S3.

Внешние системы должны иметь API:

1. Создать документ.
2. Изменить metadata документа.
3. Получить presigned upload URL.
4. Подтвердить upload.
5. Удалить документ через soft delete.
6. Восстановить документ.
7. Запустить reindex.
8. Выполнить поиск по project_code/folder_path/document_type.

## Файлы и S3

1. Оригиналы файлов хранятся в Cloud.ru S3.
2. PostgreSQL хранит только metadata, версии, S3 keys, checksum, статусы, mappings и audit.
3. Физическое удаление объектов S3 запрещено.
4. При замене файла создаётся новая версия документа.
5. Нужно хранить:
   - s3_bucket;
   - s3_key;
   - s3_version_id;
   - checksum_sha256;
   - size_bytes;
   - mime_type;
   - original_file_name.
6. Для bucket рекомендуется включить Versioning и Object Lock.
7. Приложению не давать права на DeleteObject.

## Безопасность

1. Auth через JWT.
2. External API через API keys.
3. API keys хранить только hash.
4. Secret показывать только один раз при создании.
5. Все endpoint’ы защищены auth или API key auth.
6. Все критичные действия пишутся в audit_logs.
7. Нельзя логировать секреты, токены, S3 keys, Dify keys, Qdrant keys.
8. Нельзя отдавать пользователю приватные документы без проверки прав.
9. `people_private` доступен только ограниченным ролям.
10. Viewer не может создавать/изменять/удалять.

## Стиль кода

1. Чистый TypeScript.
2. Избегать `any`.
3. Все настройки через `.env`.
4. API versioning: `/api/v1`.
5. Swagger/OpenAPI обязателен.
6. Ошибки возвращать в едином формате.
7. Не оставлять TODO вместо реализации.
8. После каждого этапа запускать:
   - lint;
   - typecheck;
   - tests;
   - build, если применимо.

## Рабочий процесс Claude Code

Для каждого промта:

1. Сначала изучи текущую структуру проекта.
2. Сформируй краткий план.
3. Реализуй изменения.
4. Запусти проверки.
5. Исправь ошибки.
6. Кратко опиши, что изменено.

## КРАТКОСТЬ

- Отвечай максимально сжато. Без пояснений и предисловий.
- Код — только рабочие фрагменты в блоках, без текста.
- Изменения — *минимальный diff/patch* или *конкретные вставки*.
- Не перечисляй «что было сделано», если не попросили.
- Текст — не более 5 пунктов, каждый ≤ 12 слов.

## .env

- НИКОГДА не изменять `.env` файлы
- Ключи и URL добавляет только пользователь вручную

## Git

- Репозиторий: https://github.com/baldmaxim/DifyRAG (remote `origin`)
- Ветка по умолчанию: `main`
- Коммиты на русском, кратко (1-2 предложения)
- Без приписок "Generated with Claude Code" и "Co-Authored-By"
- Push в `origin` (свой репозиторий)

