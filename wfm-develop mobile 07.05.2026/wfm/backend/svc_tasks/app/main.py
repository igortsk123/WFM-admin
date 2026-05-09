import sys
import logging
from pathlib import Path

# Добавляем shared модуль в путь
# В контейнере: /app/app/main.py -> /app (где лежит /app/shared/)
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings

# Uvicorn настраивает только свои логгеры (uvicorn.*), root logger остаётся
# с уровнем WARNING и без handlers — basicConfig добавляет StreamHandler на root
# и выставляет уровень из LOG_LEVEL (.env), чтобы logger.info() из app.* работало
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core import analytics
from app.api import tasks, health, references, shifts, internal, webhook, hints, operations
from shared import (
    register_exception_handlers,
    init_monitoring_client,
    get_monitoring_client,
    shutdown_monitoring_client,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    analytics.init()
    init_monitoring_client(
        service_name="svc_tasks",
        base_url=settings.MONITORING_SERVICE_URL,
        timeout=settings.MONITORING_SERVICE_TIMEOUT,
    )
    yield
    await shutdown_monitoring_client()
    analytics.shutdown()


app = FastAPI(
    title="WFM Tasks Service",
    description="Сервис управления задачами сотрудников",
    version="0.3.0",
    root_path="/tasks",
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
                "service": "svc_tasks",
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
                "service": "svc_tasks",
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
# ВАЖНО: порядок важен — специфичные пути должны быть перед catch-all /{task_id}
app.include_router(health.router)
app.include_router(internal.router)  # /internal/* — до tasks.router
app.include_router(webhook.router)   # /webhook/* — публичный, без JWT
app.include_router(references.router)
app.include_router(hints.router)
app.include_router(operations.router)  # /operations — до tasks.router (catch-all)
# /shifts/* — должен быть зарегистрирован до tasks.router (у которого есть /{task_id})
app.include_router(shifts.router, prefix="/shifts")
app.include_router(tasks.router)


@app.get("/")
def root():
    """Root endpoint с информацией о сервисе"""
    return {
        "service": "svc_tasks",
        "version": "0.3.0",
        "status": "running",
        "build": "v0.3.0"
    }
