# CLAUDE.md — правила проекта для Claude Code

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **CLAUDE.md — главный и приоритетный свод правил проекта.** При конфликте с любыми другими инструкциями и документами (`docs/`, README) действуют правила из этого файла.

## Что это за репозиторий

Инфраструктура и документация RAG-системы строительной компании на базе **Dify**.

**Главная система — Dify UI.** Пользователи загружают документы, ведут базы знаний (Knowledge) и ищут/чатят прямо в Dify. Собственный портал (NestJS + React) выведен из эксплуатации и удалён из репозитория (история в git до июля 2026; данные его Postgres сохранены в volume `dkp_postgres_data` на сервере).

## Архитектура стека

- **Dify** — RAG-движок и основной UI: парсинг, chunking, индексация, retrieval, чат-приложения. Разворачивается отдельно из официального репозитория (`git clone langgenius/dify` → docker compose); в этот репозиторий исходники Dify не копируются. Override-пример: `infra/dify/docker-compose.override.example.yml`.
- **Qdrant** — vector store для Dify (`VECTOR_STORE=qdrant`). Прод-compose: `infra/platform/docker-compose.prod.yml` (только qdrant, порты на 127.0.0.1). Напрямую в Qdrant никто, кроме Dify, не пишет.
- **LM Studio** — локальный OpenAI-compatible endpoint на GPU-хосте (:1234): embeddings `Qwen/Qwen3-Embedding-8B` (dim 4096) и LLM для генерации ответов.
- Всё крутится на GPU-сервере; наружу публикуется только Dify UI через host-прокси (Caddy/nginx). Qdrant и LM Studio в интернет не открывать.

## Структура репозитория

- `infra/` — compose-файлы: `platform/docker-compose.prod.yml` (Qdrant на проде), `qdrant/` (локальный Qdrant), `dify/` (override-пример для Dify).
- `scripts/` — управление сервером по SSH: `ssh-deploy.mjs` (`exec`/`put`), `ssh-exec.mjs`, `ssh-exec.ps1`; конфиг в `scripts/.env`.
- `docs/` — настройка Dify, LM Studio-провайдера, Qdrant-режима, деплой, runbook.

## Безопасность и секреты

- НИКОГДА не изменять `.env` файлы — ключи и URL добавляет только пользователь вручную.
- Не выводить и не логировать секреты (Dify API keys, Qdrant API key, S3 keys, пароли); при необходимости ссылки — маскировать.
- Секреты сервера живут в `infra/platform/.deploy-secrets.env` и env-файлах Dify на сервере — в репо их нет.

## Правила ответов

- **Ответы на русском**: все объяснения, комментарии и коммиты — только на русском. Код и команды могут быть на английском.
- Отвечать сжато, без предисловий; изменения — минимальный diff или конкретные вставки.

## Git

- Репозиторий: https://github.com/baldmaxim/DifyRAG (remote `origin`), ветка `main`.
- Автор коммитов: `Maxim <baldmaxim@gmail.com>`.

### Формат сообщений коммитов

- Только на русском, живым языком, заголовок в прошедшем времени от первого лица: «Добавил…», «Поправил…», «Настроил…».
- Одна строка, без тела, без conventional-commit префиксов (`feat:` и т.п.).
- **Без** приписок «Generated with Claude Code» и «Co-Authored-By».
