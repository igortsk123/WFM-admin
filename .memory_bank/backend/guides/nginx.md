# Nginx: Управление конфигурацией

## Обзор

Nginx используется как reverse proxy для всех backend сервисов WFM. Конфигурация хранится в репозитории и применяется вручную на сервере.

## Структура конфигурации

```
backend/nginx/
├── sites-available/
│   └── default           # Основная конфигурация сервера
└── services/
    ├── tasks.conf        # Прокси для svc_tasks
    ├── users.conf        # Прокси для svc_users
    └── shifts.conf       # Прокси для svc_shifts
```

### sites-available/default

Главный конфигурационный файл содержит:
- SSL сертификаты (Certbot)
- Редирект HTTP → HTTPS
- Проксирование на n8n (корневой путь `/`)
- Подключение конфигураций сервисов через `include /etc/nginx/services/*.conf`

### services/*.conf

Каждый микросервис имеет свой конфигурационный файл с настройками прокси:
- **tasks.conf**: `/tasks/` → `http://localhost:8000/` (без префикса — FastAPI обрабатывает с `root_path="/tasks"`)
- **users.conf**: `/users/` → `http://localhost:8001/`
- **shifts.conf**: `/shifts/` → `http://localhost:8000/shifts/` (**с префиксом** — смены обслуживает svc_tasks)

> **Важно для shifts.conf:** `proxy_pass` указывает `http://localhost:8000/shifts/` (с сохранением префикса `/shifts/`), а не `http://localhost:8000/`. Это необходимо, так как `svc_tasks` регистрирует роутер смен с `prefix="/shifts"`.

## Маппинг сервисов

| URL Path | Backend Service | Port | Swagger |
|----------|----------------|------|---------|
| `/` | n8n | 5678 | - |
| `/tasks/` | svc_tasks | 8000 | `/tasks/docs` |
| `/users/` | svc_users | 8001 | `/users/docs` |
| `/shifts/` | svc_tasks | 8000 | `/tasks/docs` (раздел shifts) |
| `/download` | nginx (редирект) | — | — |

## Редирект в магазины приложений

`GET /download` — универсальная ссылка для распространения приложения. Nginx определяет платформу по `User-Agent` и перенаправляет:

- **Android** → Google Play (`com.beyondviolet.wfm`)
- **iOS** → App Store (`id6759591058`)
- **Остальные** → `https://wfm.beyondviolet.com/`

Конфигурация: `backend/nginx/services/download.conf`. Реализовано через серверный `302`-редирект без загрузки страницы.

## Добавление нового сервиса

1. Создайте файл конфигурации в `backend/nginx/services/`:

```nginx
# backend/nginx/services/new_service.conf

# ВАЖНО: блок /internal/ должен быть ВЫШЕ общего location
location /new_service/internal/ {
    deny all;
    return 404;
}

location /new_service/ {
    proxy_pass http://localhost:PORT/;

    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;

    proxy_read_timeout 300;
    proxy_connect_timeout 300;
}
```

2. Укажите в FastAPI сервисе `root_path`:

```python
app = FastAPI(
    title="New Service",
    root_path="/new_service",
)
```

3. Закоммитьте изменения в ветку `develop`:

```bash
git add backend/nginx/services/new_service.conf
git commit -m "Добавлена nginx конфигурация для new_service"
git push origin develop
```

4. Скопируйте конфигурацию на сервер и перезагрузите nginx (см. "Ручное управление")

## Ручное управление (на сервере)

### Копирование конфигурации

```bash
# Обновить репозиторий
cd /srv/wfm && git pull origin develop

# Скопировать конфигурацию
cp backend/nginx/sites-available/default /etc/nginx/sites-available/default
cp backend/nginx/services/* /etc/nginx/services/
```

### Проверка конфигурации

```bash
nginx -t
```

### Перезагрузка nginx

```bash
systemctl reload nginx
```

### Просмотр логов

```bash
# Логи доступа
tail -f /var/log/nginx/access.log

# Логи ошибок
tail -f /var/log/nginx/error.log
```

### Проверка статуса

```bash
systemctl status nginx
```

## Особенности конфигурации

### WebSocket поддержка (n8n)

Для n8n включена поддержка WebSocket:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 36000s;
```

### Таймауты

Для API сервисов установлены таймауты:
- `proxy_read_timeout 300` (5 минут)
- `proxy_connect_timeout 300` (5 минут)

Если операция занимает больше времени, увеличьте таймауты.

### SSL сертификаты

Сертификаты управляются через Certbot:
- Автоматическое обновление через systemd timer
- Путь: `/etc/letsencrypt/live/dev.wfm.beyondviolet.com/`

Не изменяйте строки с комментарием `# managed by Certbot`.

## Troubleshooting

### 502 Bad Gateway

Проверьте, что backend сервис запущен:

```bash
docker ps | grep wfm
```

### Конфигурация не применяется

Убедитесь, что файлы скопированы:

```bash
ls -la /etc/nginx/services/
```

Проверьте синтаксис:

```bash
nginx -t
```

### Логи nginx

```bash
journalctl -u nginx -n 50
```

## Безопасность

- Все соединения через HTTPS (автоматический редирект с HTTP)
- SSL сертификаты от Let's Encrypt
- Заголовки `X-Real-IP` и `X-Forwarded-For` для логирования
- `X-Forwarded-Proto` для определения схемы подключения

### Блокировка внутренних эндпоинтов

Эндпоинты с префиксом `/internal/` предназначены **только для межсервисного взаимодействия внутри Docker-сети** и не должны быть доступны извне.

Каждый `services/*.conf` должен содержать блок `deny all` для `/internal/` **до** общего `location`. Nginx применяет более специфичный `location` первым:

```nginx
# Блокировать /internal/ снаружи
location /users/internal/ {
    deny all;
    return 404;
}

# Общий прокси
location /users/ {
    proxy_pass http://localhost:8001/;
    ...
}
```

Межсервисные запросы внутри Docker-сети идут напрямую (`http://svc_users:8000`), минуя nginx — блокировка их не затрагивает.

## Связанные документы

- `.memory_bank/backend/services/svc_tasks.md` — описание сервиса задач (включает смены)
- `.memory_bank/backend/services/svc_users.md` — описание сервиса пользователей
- `.memory_bank/backend/apis/api_tasks.md` — API endpoints задач
- `.memory_bank/backend/apis/api_users.md` — API endpoints пользователей
- `.memory_bank/backend/apis/api_shifts.md` — API endpoints смен
