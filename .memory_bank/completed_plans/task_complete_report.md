# План: Отчёт при завершении задачи (report_text + фото через S3)

**Статус:** Выполнено
**Создан:** 2026-03-02
**Последнее обновление:** 2026-03-02

---

## Цель

Добавить в endpoint `POST /tasks/{id}/complete` возможность передать текстовый комментарий и одну фотографию — одним `multipart/form-data` запросом. API сам загружает фото в S3 и сохраняет URL вместе с текстом в задаче.

### Архитектура

```
Client → POST /tasks/{id}/complete   Content-Type: multipart/form-data
         fields: report_text (text, optional)
                 report_image (file, optional)

API → S3: PUT object → получает public URL
API → DB: сохраняет report_text + report_image_url → переводит задачу в COMPLETED
API → Client: TaskResponse с report_text и report_image_url
```

Формат тела запроса — `multipart/form-data`. JSON-body (текущий подход без репорта) заменяется на form fields.

### S3 настройки (RegRU)

| Параметр | Значение |
|---|---|
| S3 API Endpoint | `https://s3.regru.cloud` |
| Bucket | `wfm-images` |
| Public URL prefix | `https://wfm-images.website.regru.cloud/` |
| Path-style URL prefix | `https://s3.regru.cloud/wfm-images/` |
| Access Key | `aa7fc107-af5f-44c1-9849-2cb7f1a696c4` |
| Secret Key | env var `S3_SECRET_KEY` (только через env, не в коде) |
| Ключ объекта | `tasks/{task_id}/{uuid}.{ext}` |

### Бизнес-правила

- `report_text` — всегда опционален (UX ввода пока нет)
- `report_image` — опционален, если только на задаче не установлен флаг `requires_photo = true`
- Если `task.requires_photo = true` и фото не передано → 400 Validation Error
- Только один файл изображения (image/jpeg, image/png, image/webp, image/heic)
- После загрузки в S3 URL сохраняется в `report_image_url: str | null`
- `requires_photo` по умолчанию `false`; управляется при создании (`POST /`) и редактировании (`PATCH /{id}`) задачи
- Текущая логика `acceptance_policy` (AUTO/MANUAL) не меняется

---

## Задачи

### 1. База данных (svc_tasks)

- [x] Написать миграцию `010_add_report_fields.py` — добавить в таблицу `tasks`:
  - `report_text` — `TEXT, nullable`
  - `report_image_url` — `VARCHAR(500), nullable`
  - `requires_photo` — `BOOLEAN, NOT NULL, DEFAULT false`
- [x] Добавить поля в SQLAlchemy-модель `Task` (`models.py`)

### 2. S3-клиент

- [x] Добавить `boto3` и `python-multipart` в `requirements.txt`
- [x] Создать `app/services/s3_client.py` с функцией `upload_task_image(file, task_id) → public_url`
  - Генерирует ключ `tasks/{task_id}/{uuid}.{ext}`
  - Загружает через `boto3.client('s3').put_object()`
  - Возвращает `https://wfm-images.website.regru.cloud/{key}`
- [x] Добавить env-переменные в `app/core/config.py`:
  - `S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_NAME`, `S3_PUBLIC_URL_PREFIX`

### 3. Endpoint complete (обновление)

- [x] Обновить `complete_task` в `api/tasks.py` — multipart/form-data, валидация requires_photo, загрузка в S3
- [x] Добавить метод `save_report(task_id, report_text, report_image_url)` в `TaskRepository`
- [x] Событие COMPLETE: `comment = report_text`, `meta = {"image_url": "..."}` — без новых столбцов
- [x] Добавить в `TaskCreate` и `TaskUpdate` поле `requires_photo: bool = False`
- [x] Добавить в `TaskResponse` поля: `requires_photo`, `report_text`, `report_image_url`
- [x] Обновить OpenAPI-примеры

### 4. Документация

- [x] Обновить `.memory_bank/backend/apis/api_tasks.md`
- [x] Обновить `.memory_bank/backend/services/svc_tasks.md` (s3_client.py, поля таблицы, секция S3)
- [x] Обновить `.memory_bank/domain/task_model.md`
- [x] Обновить `CLAUDE.md`

---

## Лог выполнения

### 2026-03-02
- Создан план
- Проверено: поля `report_text`/`report_images` отсутствуют в SQLAlchemy-модели, схемах и endpoint — нужна полная реализация
- Выбран подход: `multipart/form-data` одним запросом (вместо presigned URL), одно фото
- Реализовано: миграция 010, SQLAlchemy-модель, s3_client.py, config.py, task_repository.py, schemas.py, api/tasks.py, документация Memory Bank + CLAUDE.md
