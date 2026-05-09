import sys
from pathlib import Path

# Добавляем shared модуль в путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core import analytics
from app.api import notifications, health, internal, websocket
from app.services.fcm_client import init_fcm
from app.services.hms_client import init_hms
from shared import (
    register_exception_handlers,
    init_monitoring_client,
    get_monitoring_client,
    shutdown_monitoring_client,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_fcm(settings.FIREBASE_CREDENTIALS_JSON)
    init_hms(settings.HMS_APP_ID, settings.HMS_CLIENT_SECRET, settings.HMS_OAUTH_URL, settings.HMS_PUSH_URL)
    analytics.init()
    init_monitoring_client(
        service_name="svc_notifications",
        base_url=settings.MONITORING_SERVICE_URL,
        timeout=settings.MONITORING_SERVICE_TIMEOUT,
    )
    yield
    await shutdown_monitoring_client()
    analytics.shutdown()


app = FastAPI(
    title="WFM Notifications Service",
    description="Сервис доставки уведомлений через WebSocket и Push",
    version="0.1.0",
    root_path="/notifications",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

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
                "service": "svc_notifications",
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
                "service": "svc_notifications",
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Подключение роутеров
app.include_router(health.router)
app.include_router(internal.router)      # /internal/* — без JWT
app.include_router(websocket.router)     # /ws — WebSocket
app.include_router(notifications.router) # / — public API


@app.get("/")
def root():
    return {
        "service": "svc_notifications",
        "version": "0.1.0",
        "status": "running",
    }
