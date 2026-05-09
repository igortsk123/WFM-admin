FROM python:3.12-slim-bookworm

# Установка русского зеркала
RUN echo "deb http://mirror.yandex.ru/debian bookworm main" > /etc/apt/sources.list \
 && echo "deb http://mirror.yandex.ru/debian bookworm-updates main" >> /etc/apt/sources.list \
 && echo "deb http://mirror.yandex.ru/debian-security bookworm-security main" >> /etc/apt/sources.list

WORKDIR /app

COPY svc_monitoring/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY svc_monitoring/app /app/app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health').getcode()==200 else 1)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
