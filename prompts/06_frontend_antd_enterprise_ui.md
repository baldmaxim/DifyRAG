# Prompt 6 — frontend Ant Design: современный enterprise-интерфейс

Реализуй frontend приложения **Document Knowledge Portal** на React + Vite + TypeScript + Ant Design 5.

UI должен быть современным, интерактивным, аккуратным, похожим на enterprise-систему управления документами и RAG-индексацией, а не на технический прототип.

Dify является главным RAG-движком. Frontend показывает статусы Dify, dataset mappings, processing jobs и результаты поиска, но не получает Dify/Qdrant/S3/LM Studio secrets.

## Технологии frontend

Используй:

```text
React
Vite
TypeScript
Ant Design 5
Ant Design ProComponents
TanStack Query
Zustand
React Router
Axios
dayjs
```

Не используй секреты во frontend bundle.

## Общий layout

Создай:

1. Login page.
2. Protected app layout:
   - header;
   - sidebar;
   - breadcrumbs;
   - user menu;
   - global search;
   - notifications.
3. Menu:
   - Dashboard;
   - Projects;
   - Search;
   - Company / Departments;
   - Documents;
   - Processing Jobs;
   - Dify Datasets;
   - Integrations;
   - API Keys;
   - Audit Logs;
   - Settings.

## Auth UI

Реализуй:

1. Login page.
2. JWT session handling.
3. Refresh token flow.
4. Logout.
5. Protected routes.
6. Role-based menu items.
7. Friendly error messages.

## Dashboard

Страница `/dashboard`:

Показать widgets:

1. Количество проектов.
2. Количество документов.
3. Документы по статусам:
   - active;
   - uploading;
   - queued;
   - processing;
   - indexed;
   - error;
   - deleted.
4. Последние загруженные документы.
5. Ошибки обработки Dify.
6. Документы без metadata.
7. Последние audit events.
8. КС-2 по проектам:
   - customer ks2 count;
   - subcontractor ks2 count.
9. Материалы:
   - последние УПД;
   - последние ТТН.
10. Гарантийные обращения:
   - open;
   - overdue;
   - closed.
11. Судебные дела:
   - active cases;
   - recent updates.

Используй AntD:

- Card;
- Statistic;
- Table;
- Tabs;
- responsive grid;
- Skeleton;
- Empty states.

## Projects UI

Страницы:

```text
/projects
/projects/:projectId
```

`/projects`:

1. Таблица проектов.
2. Поиск по code/name/customer.
3. Drawer создания/редактирования проекта.
4. Status tags.
5. Кнопка archive.

`/projects/:projectId`:

1. Project header/card.
2. Слева дерево папок.
3. Справа таблица документов выбранной папки.
4. Upload button.
5. Drag-and-drop upload zone.
6. Breadcrumb выбранной папки.
7. Быстрые фильтры:
   - document_type;
   - status;
   - counterparty;
   - date range;
   - confidentiality;
   - Dify indexing status.

Компоненты:

```text
ProjectTree
ProjectHeader
DocumentsTable
DocumentFilters
UploadDocumentDrawer
DocumentDrawer
VersionHistoryDrawer
ProcessingStatusTag
DifyIndexingTimeline
```

## Documents UI

Таблица документов:

Колонки:

- title;
- document_type;
- counterparty;
- document_date;
- status;
- RAG/Dify status;
- confidentiality;
- current version;
- updated_at;
- actions.

Actions:

- открыть карточку;
- скачать;
- заменить файл;
- изменить metadata;
- удалить;
- восстановить;
- reindex;
- открыть версии.

Карточка документа в Drawer:

Tabs:

1. Overview.
2. Metadata.
3. File versions.
4. Dify indexing.
5. Audit timeline.

Вкладка Dify indexing:

- Dify dataset name;
- Dify dataset id;
- Dify document id;
- batch id;
- indexing status;
- completed_segments / total_segments;
- last_polled_at;
- error_message;
- Retry/Reindex button.

## Upload UI

Реализуй upload flow:

1. Пользователь выбирает папку.
2. Нажимает upload или drag-and-drop.
3. Открывается Drawer metadata:
   - title;
   - document_type;
   - document_date;
   - counterparty;
   - confidentiality;
   - metadata fields.
4. `POST /documents`.
5. `POST /documents/:id/upload-url`.
6. PUT file directly to S3 presigned URL.
7. `POST /documents/:id/commit-upload`.
8. UI показывает live pipeline:
   - metadata saved;
   - uploading to S3;
   - S3 stored;
   - queued for Dify;
   - sent to Dify;
   - waiting;
   - parsing;
   - cleaning;
   - splitting;
   - indexing;
   - indexed.
9. Poll status каждые 3–5 секунд.
10. При error показать details и кнопку retry.

Используй:

- Upload.Dragger;
- Progress;
- Steps;
- Result;
- Alert;
- notification/message.

## Dynamic metadata forms

Добавь dynamic forms по document_type.

Типы и поля:

### ks2

- period;
- party_role: customer | subcontractor;
- counterparty;
- contract_number;
- amount_without_vat;
- vat_amount;
- amount_with_vat;
- signed_status.

### material_payment_allocation_letter

- contractor;
- supplier;
- material_name;
- amount;
- payment_due_date;
- project_area.

### upd

- supplier;
- buyer;
- document_number;
- document_date;
- amount;
- material_name;
- vehicle_number.

### ttn

- supplier;
- vehicle_number;
- driver_name;
- delivery_date;
- material_name;
- quantity.

### working_documentation_remark

- discipline;
- drawing_number;
- remark_text;
- severity;
- status;
- responsible_party;
- due_date.

### court_claim

- court_name;
- case_number;
- claim_amount;
- opponent;
- status.

### warranty_request

- request_number;
- object_area;
- defect_description;
- request_date;
- due_date;
- status.

### additional_work_calculation

- work_name;
- reason;
- amount;
- approval_status;
- linked_estimate.

Хранить дополнительные поля в `documents.metadata`.

## Search UI

Страница `/search`:

1. Большая search input.
2. Выбор scope:
   - project;
   - company;
   - people public;
   - reference;
   - templates.
3. Выбор проекта.
4. Выбор folder_path через TreeSelect.
5. Выбор document_type.
6. Выбор режима:
   - chunks;
   - answer.
7. top_k и score_threshold в advanced settings.
8. Результаты:
   - cards с chunk content;
   - score;
   - project;
   - folder;
   - document title;
   - кнопка открыть документ;
   - кнопка скачать, если есть права.
9. Если `answer_mode_not_configured`, показать warning.
10. Если Dify dataset не настроен, показать setup_required с ссылкой на Integrations.

## Departments UI

Страница `/company/departments`:

1. Cards по отделам.
2. Страница отдела:
   - описание;
   - skills markdown editor;
   - связанные папки;
   - документы отдела;
   - linked Dify dataset mapping.
3. Markdown editor для skills.
4. Сохранение через API.

## Dify Datasets UI

Страница `/dify-datasets`:

Таблица mappings:

- project;
- scope;
- folder_group;
- Dify dataset name;
- Dify dataset id;
- status;
- documents count;
- error_message;
- updated_at;
- actions.

Actions:

- create missing dataset;
- retry failed mapping;
- open documents;
- reindex dataset.

## Integrations UI

Страница `/integrations`:

Cards:

1. Dify.
2. LM Studio.
3. Qdrant.
4. S3 Cloud.ru.

Для каждой card:

- status: ok/degraded/down/setup_required;
- latency;
- last checked;
- details;
- кнопка check now.

Qdrant card должна показывать warning:

```text
Qdrant управляется Dify. Приложение не пишет в Qdrant напрямую.
```

LM Studio card:

- base URL без секретов;
- embedding model;
- expected dimension;
- detected dimension;
- status.

## API Keys UI

Страница `/api-keys`:

1. Таблица API keys.
2. Создать key.
3. Выбрать scopes.
4. Показать secret только один раз.
5. Скопировать key.
6. Revoke.
7. last_used_at.

## Processing Jobs UI

Страница `/processing-jobs`:

Таблица:

- job type;
- document;
- version;
- status;
- attempts;
- error;
- created_at;
- updated_at;
- actions retry.

## Audit Logs UI

Страница `/audit-logs`:

1. Таблица audit logs.
2. Фильтры:
   - actor;
   - action;
   - resource_type;
   - date range.
3. Drawer details before/after json.

## UX требования

1. Использовать Skeleton loaders.
2. Использовать Empty states.
3. Использовать optimistic UI только там, где безопасно.
4. Ошибки показывать понятным языком.
5. Не показывать stack traces пользователю.
6. Все destructive actions через Popconfirm/Modal.
7. Soft delete пояснять пользователю: файл остаётся в защищённом S3, документ скрывается из поиска.
8. Сделать responsive layout.
9. Использовать consistent status colors через AntD Tag.

## Проверки

Запусти:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Исправь ошибки.
