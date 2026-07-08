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

## Блокер: WSL2/Docker на №1 мёртв (HCS `0x80070569`) — ремонт (есть админ)

Причина `0x80070569`: у аккаунта `NT VIRTUAL MACHINE\Virtual Machines` (SID `S-1-5-83-0`) отобрано
право **«Log on as a service»** (частый побочный эффект CIS/security-baseline). Из-за этого не
стартуют ни WSL2, ни Hyper-V-VM → ни Docker Desktop, ни Docker-in-WSL, ни Podman. Чиним право +
включаем фичи + обновляем WSL (всё под админом):

```powershell
# 1) Вернуть право "Log on as a service" аккаунту Virtual Machines (SID S-1-5-83-0)
secedit /export /cfg "$env:TEMP\sec.cfg"
$c = Get-Content "$env:TEMP\sec.cfg"
$c = $c -replace '^(SeServiceLogonRight = .*)$', '$1,*S-1-5-83-0'
Set-Content "$env:TEMP\sec.cfg" $c
secedit /configure /db "$env:TEMP\sec.sdb" /cfg "$env:TEMP\sec.cfg" /areas USER_RIGHTS
#   (Альтернатива вручную: secpol.msc → Local Policies → User Rights Assignment →
#    Log on as a service → добавить NT VIRTUAL MACHINE\Virtual Machines)

# 2) Включить фичи виртуализации
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

```powershell
# 3) ПЕРЕЗАГРУЗКА, затем:
wsl --update
wsl --set-default-version 2
wsl --install -d Ubuntu
wsl --status ; wsl -l -v          # должно быть здорово, дистрибутив Version 2
```

Затем запустить Docker Desktop (WSL2 backend) и проверить `docker run hello-world`.
Если Docker Desktop капризничает — поставить **Docker Engine прямо в Ubuntu-WSL** (`apt install docker.io docker-compose-plugin`) и запускать Dify оттуда.

> **Если право «Log on as a service» откатывается** после ребута/`gpupdate` — оно навязано доменной
> GPO; тогда даже с локальным админом нужно, чтобы IT добавил `NT VIRTUAL MACHINE\Virtual Machines`
> в саму GPO. Проверить: `gpresult /r`.

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
