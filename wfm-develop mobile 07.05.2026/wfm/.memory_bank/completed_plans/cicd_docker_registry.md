# План: CI/CD для WFM с Docker Registry + Watchtower

**Статус:** Выполнено ✅
**Создан:** 2026-02-04
**Завершён:** 2026-02-08

## Цель

Организовать процесс сборки и деплоя сервисов WFM с использованием Docker Registry и Watchtower для автоматического обновления контейнеров.

## Архитектура

```
┌─────────────────────────────────────────────────────┐
│                 GitVerse Repository                   │
├─────────────────────────────────────────────────────┤
│  develop ветка              │  тег v*.*.*             │
│         │                   │         │               │
│         ▼                   │         ▼               │
│  ┌───────────┐              │  ┌───────────┐          │
│  │ CI: Build │              │  │ CI: Build │          │
│  │ Push :dev │              │  │ Push :v1.0│          │
│  └─────┬─────┘              │  │ Push :lat │          │
│        │                    │  └─────┬─────┘          │
│        ▼                    │        ▼                │
│        registry.beyondviolet.com/wfm/svc_*            │
└─────────────────────────────────────────────────────┘
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌──────────────────┐
│  DEV сервер      │          │  PROD сервер     │
│  147.45.147.5    │          │  185.177.219.196 │
├──────────────────┤          ├──────────────────┤
│ dev.wfm.bv.com   │          │ wfm.bv.com       │
│                  │          │                  │
│ Watchtower       │          │ Watchtower       │
│ следит за :dev   │          │ следит за :latest│
│                  │          │                  │
│ tasks  :8000     │          │ tasks  :8000     │
│ users  :8001     │          │ users  :8001     │
│ n8n    :5678     │          │ n8n    :5678     │
└──────────────────┘          └──────────────────┘
```

## Серверы

| Окружение | IP | Домен | Compose файлы |
|-----------|-----|-------|---------------|
| LOCAL | localhost | — | docker-compose.yml + override (auto) |
| DEV | 147.45.147.5 | dev.wfm.beyondviolet.com | docker-compose.yml + dev.yml |
| PROD | 185.177.219.196 | wfm.beyondviolet.com | docker-compose.yml + prod.yml |

## Задачи

### Фаза 1: Docker Compose и Dockerfile

- [x] 1.1 Реструктурировать docker-compose файлы
- [x] 1.2 Оптимизировать Dockerfile
- [x] 1.3 Вынести секреты в .env файлы

### Фаза 2: CI Workflows

- [x] 2.1 Создать `backend_build_dev.yaml`
- [x] 2.2 Создать `backend_build_prod.yaml`

### Фаза 3: Настройка серверов

- [x] 3.1 Создать пользователя в registry.beyondviolet.com для CI
- [x] 3.2 DEV сервер (147.45.147.5)
- [x] 3.3 PROD сервер (185.177.219.196)

### Фаза 4: Секреты GitVerse

- [x] 4.1 Добавить секреты в GitVerse

### Фаза 5: Документация

- [x] 5.1 Создать `.memory_bank/backend/cicd.md`

## Лог выполнения

### 2026-02-05
- Создан план
- Выбран Watchtower вместо SSH деплоя

### 2026-02-08
- Настроен CI workflow с act-runner на GitVerse
- Исправлены проблемы:
  - Добавлен container с catthehacker/ubuntu:act-latest
  - ALLOWED_ORIGINS: default `[]` вместо пустой строки
  - Watchtower: добавлен DOCKER_API_VERSION=1.44
- DEV сервер работает
- PROD сервер работает
- Создан первый релиз v0.1.0, затем v0.1.1
- Полный CI/CD pipeline функционирует
