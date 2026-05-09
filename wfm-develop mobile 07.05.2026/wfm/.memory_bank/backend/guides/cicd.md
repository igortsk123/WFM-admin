# CI/CD Pipeline для WFM Backend

## Quick Reference — Деплой

```bash
# Только DEV (автоматически после push в develop)
git add . && git commit -m "feat: Описание" && git push origin develop

# DEV + PROD (создать релиз)
git add . && git commit -m "feat: Описание" && git push origin develop && git tag v0.1.2 && git push origin v0.1.2
```

**Что происходит:**
| Действие | CI билдит | Обновляется |
|----------|-----------|-------------|
| `push develop` | `:dev` | DEV сервер |
| `push tag v*.*.*` | `:vX.Y.Z` + `:latest` | PROD сервер |

**Версионирование (SemVer):**
- Патч (багфикс): `v0.1.2` → `v0.1.3`
- Минор (новая фича): `v0.1.3` → `v0.2.0`
- Мажор (breaking changes): `v0.2.0` → `v1.0.0`

---

## Обзор

WFM использует CI/CD pipeline на базе GitVerse (act-runner) + Docker Registry + Watchtower для автоматического деплоя.

```
Push → CI Build → Registry → Watchtower → Container Restart
```

**Преимущества:**
- CI не имеет SSH доступа к серверам (безопасность)
- Автоматическое обновление контейнеров (Watchtower)
- Единый registry для всех окружений

## Архитектура

| Компонент | Описание |
|-----------|----------|
| **GitVerse CI** | Сборка Docker образов |
| **registry.beyondviolet.com** | Private Docker Registry |
| **Watchtower** | Автообновление контейнеров на серверах |

### Серверы

| Окружение | IP | Домен | Тег образа |
|-----------|-----|-------|------------|
| DEV | 147.45.147.5 | dev.wfm.beyondviolet.com | `:dev` |
| PROD | 185.177.219.196 | wfm.beyondviolet.com | `:latest` |

## Настройка GitVerse Runner

### 1. Запуск act-runner

```bash
docker run -d \
  --name wfm_runner \
  --restart unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /usr/bin/docker:/usr/bin/docker \
  -e INSTANCE_URL=https://gitverse.ru/sc/ \
  -e RUNNER_REGISTRATION_TOKEN=<TOKEN> \
  -e RUNNER_NAME=wfm_runner \
  gitverse.ru/gitverse/act-runner:latest
```

**Важно:**
- `-v /var/run/docker.sock` — доступ к Docker daemon
- `-v /usr/bin/docker` — Docker CLI внутри контейнера
- Token получить в GitVerse: Settings → Actions → Runners

### 2. Секреты в GitVerse

Добавить в Settings → Secrets:
- `REGISTRY_USERNAME` — логин в registry.beyondviolet.com
- `REGISTRY_PASSWORD` — пароль

## Workflow файлы

### DEV: `.gitverse/workflows/backend_build_dev.yaml`

```yaml
name: Build Dev Images

on:
  push:
    branches:
      - develop
    paths:
      - "backend/**"

jobs:
  build-and-push:
    runs-on: self-hosted
    container:
      image: catthehacker/ubuntu:act-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Login to Registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | \
          docker login registry.beyondviolet.com \
            -u ${{ secrets.REGISTRY_USERNAME }} --password-stdin

      - name: Build and Push svc_tasks
        run: |
          docker build \
            -t registry.beyondviolet.com/wfm/svc_tasks:dev \
            -f backend/svc_tasks/Dockerfile backend/
          docker push registry.beyondviolet.com/wfm/svc_tasks:dev

      - name: Build and Push svc_users
        run: |
          docker build \
            -t registry.beyondviolet.com/wfm/svc_users:dev \
            -f backend/svc_users/Dockerfile backend/
          docker push registry.beyondviolet.com/wfm/svc_users:dev

      - name: Build and Push svc_notifications
        run: |
          docker build \
            -t registry.beyondviolet.com/wfm/svc_notifications:dev \
            -f backend/svc_notifications/Dockerfile backend/
          docker push registry.beyondviolet.com/wfm/svc_notifications:dev

      - name: Logout from Registry
        if: always()
        run: docker logout registry.beyondviolet.com
```

### PROD: `.gitverse/workflows/backend_build_prod.yaml`

```yaml
name: Build Prod Images

on:
  push:
    tags:
      - "v*.*.*"

jobs:
  build-and-push:
    runs-on: self-hosted
    container:
      image: catthehacker/ubuntu:act-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Get version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/}" >> $GITHUB_OUTPUT

      - name: Login to Registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | \
          docker login registry.beyondviolet.com \
            -u ${{ secrets.REGISTRY_USERNAME }} --password-stdin

      - name: Build and Push svc_tasks
        run: |
          docker build \
            -t registry.beyondviolet.com/wfm/svc_tasks:${{ steps.version.outputs.VERSION }} \
            -t registry.beyondviolet.com/wfm/svc_tasks:latest \
            -f backend/svc_tasks/Dockerfile backend/
          docker push registry.beyondviolet.com/wfm/svc_tasks:${{ steps.version.outputs.VERSION }}
          docker push registry.beyondviolet.com/wfm/svc_tasks:latest

      - name: Build and Push svc_users
        run: |
          docker build \
            -t registry.beyondviolet.com/wfm/svc_users:${{ steps.version.outputs.VERSION }} \
            -t registry.beyondviolet.com/wfm/svc_users:latest \
            -f backend/svc_users/Dockerfile backend/
          docker push registry.beyondviolet.com/wfm/svc_users:${{ steps.version.outputs.VERSION }}
          docker push registry.beyondviolet.com/wfm/svc_users:latest

      - name: Build and Push svc_notifications
        run: |
          docker build \
            -t registry.beyondviolet.com/wfm/svc_notifications:${{ steps.version.outputs.VERSION }} \
            -t registry.beyondviolet.com/wfm/svc_notifications:latest \
            -f backend/svc_notifications/Dockerfile backend/
          docker push registry.beyondviolet.com/wfm/svc_notifications:${{ steps.version.outputs.VERSION }}
          docker push registry.beyondviolet.com/wfm/svc_notifications:latest

      - name: Logout from Registry
        if: always()
        run: docker logout registry.beyondviolet.com
```

## Настройка серверов

### DEV сервер (147.45.147.5)

```bash
# 1. Авторизация в registry
docker login registry.beyondviolet.com

# 2. Клонировать репозиторий
cd /srv
git clone git@gitverse.ru:beyondviolet/wfm.git
cd wfm/backend

# 3. Создать .env
cp .env.example .env
nano .env
```

**КРИТИЧЕСКИ ВАЖНО**: Добавьте публичный ключ RS256 в `.env`:

```bash
# Опция 1 (рекомендуется): Многострочный формат
BV_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA3iIO+7nH/fNh9xbgQxg9
1AdldkkwPM2imO2ld0OfrvePZCBuFBvrA47OG0Iu6n8EsfxDc2ZDyKSTh6rXU27l
FwIDAQAB
-----END PUBLIC KEY-----"

# Опция 2: Однострочный формат (заменить переносы на \n)
# BV_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----"
```

```bash
# 4. Запустить сервисы
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 5. Проверить логи
docker logs backend-watchtower-1 -f

# 6. Проверить JWT аутентификацию
docker logs backend-svc_tasks-1 | grep "Публичный ключ"
docker logs backend-svc_users-1 | grep "Публичный ключ"
```

**Ожидаемый вывод**: `Публичный ключ загружен из переменной окружения BV_PUBLIC_KEY`

### PROD сервер (185.177.219.196)

```bash
# Аналогично DEV, но с prod.yml
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

**Не забудьте добавить `BV_PUBLIC_KEY` в `.env`** (см. DEV сервер)

## Watchtower

Watchtower автоматически проверяет registry и обновляет контейнеры.

### Конфигурация

```yaml
watchtower:
  image: containrrr/watchtower:latest
  restart: unless-stopped
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - /root/.docker/config.json:/config.json:ro
  environment:
    - DOCKER_API_VERSION=1.44
    - WATCHTOWER_CLEANUP=true
    - WATCHTOWER_POLL_INTERVAL=30   # DEV: 30 сек, PROD: 60 сек
    - WATCHTOWER_LABEL_ENABLE=true
```

### Labels для сервисов

Только сервисы с label будут обновляться:

```yaml
svc_tasks:
  labels:
    - "com.centurylinklabs.watchtower.enable=true"
```

## Работа с тегами

```bash
# Создать тег
git tag v0.1.2

# Запушить тег
git push origin v0.1.2

# Список тегов
git tag

# Удалить тег локально и на remote
git tag -d v0.1.2
git push origin --delete v0.1.2
```

## Проверка работы

```bash
# Проверить образы в registry
curl -u "USER:PASS" https://registry.beyondviolet.com/v2/_catalog
curl -u "USER:PASS" https://registry.beyondviolet.com/v2/wfm/svc_tasks/tags/list

# Логи Watchtower
docker logs backend-watchtower-1 -f

# Проверить сервис
curl http://localhost:8000/tasks/health
```

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| CI: "docker: command not found" | Добавить `container: catthehacker/ubuntu:act-latest` в workflow |
| Watchtower: "API version too old" | Добавить `DOCKER_API_VERSION=1.44` в environment |
| Сервис: "error parsing ALLOWED_ORIGINS" | Изменить default на `${ALLOWED_ORIGINS:-[]}` |
| Watchtower не обновляет | Проверить `/root/.docker/config.json` и labels |
| JWT: "Публичный ключ не найден" | Добавить `BV_PUBLIC_KEY` в `.env` файл на сервере (см. раздел "Настройка серверов") |
| JWT: "Невалидный токен" | Проверить, что `BV_PUBLIC_KEY` в `.env` соответствует приватному ключу Beyond Violet |

## Первый деплой svc_notifications (one-time setup)

`svc_notifications` требует ручных шагов при первом запуске на сервере, так как база данных и Firebase-ключ не создаются автоматически.

```bash
# 1. Создать базу данных (Postgres уже запущен, init-скрипт не перезапустится)
docker exec -it $(docker compose ps -q postgres) psql -U postgres -c "
  CREATE USER wfm_notifications_user WITH PASSWORD 'wfm_notifications_password';
  CREATE DATABASE wfm_notifications OWNER wfm_notifications_user;
"

# 2. Добавить FIREBASE_CREDENTIALS_JSON в .env на сервере
# Firebase Console → Project Settings → Service Accounts → Generate new private key
# Значение — содержимое JSON файла в одну строку
echo 'FIREBASE_CREDENTIALS_JSON={"type":"service_account",...}' >> .env

# 3. Поднять сервисы (образ уже в registry после CI)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d   # DEV
# или
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d  # PROD

# 4. Применить миграции
docker exec -it $(docker compose ps -q svc_notifications) alembic upgrade head

# 5. Проверить
curl http://localhost:8003/notifications/health
```

## Добавление нового сервиса

1. Создать `backend/svc_новый/Dockerfile`
2. Добавить в `docker-compose.yml` (базовая конфигурация)
3. Добавить в `docker-compose.dev.yml` и `docker-compose.prod.yml`:
   - image с тегом `:dev` / `:latest`
   - ports
   - labels для Watchtower
4. Добавить build/push шаги в оба workflow файла
5. При наличии новой БД — создать вручную при первом деплое (init-скрипт запускается только при инициализации Postgres)
