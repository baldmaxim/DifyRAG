# Runbook: Dify-стек на GPU-хосте

Целевая схема: **Dify UI — главная система**. На хосте работают Dify + Qdrant + LM Studio;
наружу публикуется только Dify UI.

```text
GPU-хост
  Dify (официальный docker compose)  ── LM Studio (:1234, embeddings + LLM)
    └→ Qdrant (VECTOR_STORE=qdrant, 127.0.0.1:6333)
```

## Чек-лист подъёма

1. LM Studio запущен, загружены embedding-модель (`Qwen3-Embedding-8B`, dim 4096 на проде)
   и LLM для ответов.
2. Qdrant поднят (`infra/platform/docker-compose.prod.yml`), `QDRANT_API_KEY` задан.
3. Dify поднят с `VECTOR_STORE=qdrant` + override (`infra/dify/docker-compose.override.example.yml`):
   общая сеть с Qdrant, `extra_hosts: host.docker.internal:host-gateway`.
4. В Dify добавлен провайдер LM Studio ([LM_STUDIO_DIFY_PROVIDER_SETUP.md](LM_STUDIO_DIFY_PROVIDER_SETUP.md)).
5. e2e: Knowledge Base → загрузка документа → индексация `completed` → retrieval-тест
   возвращает чанки → коллекция в Qdrant с dim = размерности модели.

> Важно: коллекция Qdrant создаётся под фиксированную размерность. KB, собранную на модели
> с другой размерностью (например bge-m3/1024), нельзя переиспользовать с 4096 — создавать
> свежие Knowledge Bases.

## Если на Windows-хосте мёртв WSL2/Docker (HCS `0x80070569`)

Причина: у аккаунта `NT VIRTUAL MACHINE\Virtual Machines` (SID `S-1-5-83-0`) отобрано право
**«Log on as a service»** (частый побочный эффект CIS/security-baseline). Из-за этого не
стартуют ни WSL2, ни Hyper-V-VM → ни Docker Desktop, ни Docker-in-WSL. Ремонт (под админом):

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
wsl --status ; wsl -l -v          # дистрибутив должен быть Version 2
```

Затем Docker Desktop (WSL2 backend) и `docker run hello-world`. Если Docker Desktop
капризничает — поставить Docker Engine прямо в Ubuntu-WSL (`apt install docker.io
docker-compose-plugin`) и запускать Dify оттуда.

> **Если право «Log on as a service» откатывается** после ребута/`gpupdate` — оно навязано
> доменной GPO; нужно, чтобы IT добавил `NT VIRTUAL MACHINE\Virtual Machines` в саму GPO.
> Проверить: `gpresult /r`.
