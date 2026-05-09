import sys
from pathlib import Path

# Добавляем shared модуль в путь
# В контейнере: /app/app/main.py -> /app (где лежит /app/shared/)
sys.path.insert(0, str(Path(__file__).parent.parent))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

# Первым делом настраиваем логирование
from app.core.config import settings
from app.core.logging_config import setup_logging

setup_logging(settings.LOG_LEVEL, settings.HTTPX_LOG_LEVEL)

# Затем импортируем остальное
from app.core import analytics
from app.api import users, stores, health, internal
from shared import (
    register_exception_handlers,
    init_monitoring_client,
    get_monitoring_client,
    shutdown_monitoring_client,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Порядок инициализации: analytics (Semetrics) → monitoring_client (svc_monitoring),
    # на shutdown — в обратном порядке.
    analytics.init()
    init_monitoring_client(
        service_name="svc_users",
        base_url=settings.MONITORING_SERVICE_URL,
        timeout=settings.MONITORING_SERVICE_TIMEOUT,
    )
    yield
    await shutdown_monitoring_client()
    analytics.shutdown()


app = FastAPI(
    title="WFM Users Service",
    description="Сервис управления пользователями WFM",
    version="0.3.0",
    root_path="/users",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Регистрация обработчиков исключений (формат Beyond Violet)
register_exception_handlers(app)

# Middleware: трекинг 5xx ошибок
@app.middleware("http")
async def track_5xx_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
    except Exception:
        analytics.track(
            "api_error",
            user_id="system",
            properties={
                "service": "svc_users",
                "status_code": 500,
                "path": request.url.path,
                "method": request.method,
            },
        )
        if (mc := get_monitoring_client()) is not None:
            mc.report_error(
                status_code=500,
                path=request.url.path,
                method=request.method,
            )
        raise
    if response.status_code >= 500:
        analytics.track(
            "api_error",
            user_id="system",
            properties={
                "service": "svc_users",
                "status_code": response.status_code,
                "path": request.url.path,
                "method": request.method,
            },
        )
        if (mc := get_monitoring_client()) is not None:
            mc.report_error(
                status_code=response.status_code,
                path=request.url.path,
                method=request.method,
            )
    return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение роутеров
# ВАЖНО: health.router должен быть первым, чтобы /{user_id} не перехватывал /health
app.include_router(health.router)
app.include_router(internal.router)
app.include_router(stores.router)
app.include_router(users.router)


@app.get("/")
def root():
    """Root endpoint с информацией о сервисе"""
    return {
        "service": "svc_users",
        "version": "0.3.0",
        "status": "running",
        "build": "v0.3.0"
    }
