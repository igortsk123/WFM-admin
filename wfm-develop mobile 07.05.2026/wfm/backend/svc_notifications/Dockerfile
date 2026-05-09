FROM python:3.12-slim-bookworm

# Установка русского зеркала
RUN echo "deb http://mirror.yandex.ru/debian bookworm main" > /etc/apt/sources.list \
 && echo "deb http://mirror.yandex.ru/debian bookworm-updates main" >> /etc/apt/sources.list \
 && echo "deb http://mirror.yandex.ru/debian-security bookworm-security main" >> /etc/apt/sources.list

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Копирование зависимостей
COPY svc_notifications/requirements.txt .

# Установка Python зависимостей
RUN pip install --no-cache-dir -r requirements.txt

# Копирование shared модуля (общий код для всех сервисов)
COPY shared/ /app/shared/

# Копирование кода приложения
COPY svc_notifications/app /app/app
COPY svc_notifications/alembic /app/alembic
COPY svc_notifications/alembic.ini /app/alembic.ini
COPY svc_notifications/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Открываем порт
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Миграции выполняются автоматически при старте контейнера
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
