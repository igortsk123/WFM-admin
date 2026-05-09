# Стандарт служебных endpoints для backend сервисов

Все backend микросервисы должны реализовывать стандартные endpoints для мониторинга и идентификации.

## Health Endpoint

**URL:** `GET /health`

**Назначение:** Проверка доступности сервиса для мониторинга и load balancer'ов.

**Требования:**
- Не требует авторизации
- Должен отвечать быстро (без тяжёлых проверок)
- Роутер health.py должен подключаться **первым**, чтобы пути вида `/{id}` не перехватывали `/health`

**Формат ответа:**
```json
{
  "status": "healthy",
  "service": "svc_xxx"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `status` | string | Всегда `"healthy"` если сервис работает |
| `service` | string | Имя сервиса (svc_tasks, svc_users, svc_shifts) |

**Пример реализации** (`app/api/health.py`):
```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/health")
def health_check():
    """Health check endpoint для проверки доступности сервиса"""
    return {"status": "healthy", "service": "svc_xxx"}
```

---

## Root Endpoint

**URL:** `GET /`

**Назначение:** Информация о сервисе для отладки и идентификации версии.

**Требования:**
- Не требует авторизации
- Содержит версию API и build для отслеживания деплоев

**Формат ответа:**
```json
{
  "service": "svc_xxx",
  "version": "0.1.0",
  "status": "running",
  "build": "v0.1.1"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `service` | string | Имя сервиса (svc_tasks, svc_users, svc_shifts) |
| `version` | string | Версия API (semver) |
| `status` | string | Всегда `"running"` если сервис работает |
| `build` | string | Версия сборки/тег релиза (обновляется при деплое) |

**Пример реализации** (`app/main.py`):
```python
@app.get("/")
def root():
    """Root endpoint с информацией о сервисе"""
    return {
        "service": "svc_xxx",
        "version": "0.1.0",
        "status": "running",
        "build": "v0.1.1"
    }
```

---

## Порядок подключения роутеров

В `main.py` роутеры должны подключаться в определённом порядке:

```python
# ВАЖНО: health.router должен быть первым, чтобы /{id} не перехватывал /health
app.include_router(health.router)
app.include_router(other_routers...)
```

**Причина:** FastAPI проверяет роуты в порядке регистрации. Если роут `/{id}` зарегистрирован раньше `/health`, то запрос к `/health` будет обработан как `/{id}` с `id="health"`, что вызовет ошибку валидации или требование авторизации.

---

## Сервисы и их endpoints

| Сервис | Health URL | Root URL | Swagger |
|--------|------------|----------|---------|
| svc_tasks | `/tasks/health` | `/tasks/` | `/tasks/docs` |
| svc_users | `/users/health` | `/users/` | `/users/docs` |
| svc_shifts | `/shifts/health` | `/shifts/` | `/shifts/docs` |
