"""
svc_monitoring — мониторинг хоста и Docker, push-канал для физического устройства.

Запуск: uvicorn app.main:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from semetrics import Semetrics

from app.api import health, internal, state, ws
from app.core.config import settings
from app.services import docker_events, metrics_loop
from app.services.alert_detector import alert_detector
from app.services.connection_manager import connection_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def _broadcast_state_loop(stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        try:
            await asyncio.wait_for(
                asyncio.shield(stop_event.wait()),
                timeout=settings.WS_BROADCAST_INTERVAL,
            )
            return  # stop_event сработал
        except asyncio.TimeoutError:
            pass

        if not connection_manager.has_clients:
            continue

        try:
            from app.api.ws import _build_state_message  # внутренний импорт против circular
            message = await _build_state_message()
            await connection_manager.broadcast(message)
        except Exception:
            logger.exception("Ошибка в state broadcast loop")


async def _alert_check_loop(stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        try:
            await asyncio.wait_for(
                asyncio.shield(stop_event.wait()),
                timeout=settings.ALERT_POLL_INTERVAL,
            )
            return
        except asyncio.TimeoutError:
            pass

        try:
            alerts = await alert_detector.check()
            for alert in alerts:
                logger.warning("alert: %s", alert)
                # broadcast вернётся пустым если клиентов нет — не страшно
                await connection_manager.broadcast(alert)
        except Exception:
            logger.exception("Ошибка в alert check loop")


def _init_semetrics() -> Semetrics | None:
    if not settings.SEMETRICS_API_KEY:
        logger.info(
            "SEMETRICS_API_KEY не задан — отправка событий в Semetrics отключена. "
            "Остальные функции сервиса (метрики, Docker events, /api/state, WS, /internal/errors) продолжают работать."
        )
        return None
    try:
        return Semetrics(
            api_key=settings.SEMETRICS_API_KEY,
            endpoint=settings.SEMETRICS_ENDPOINT,
        )
    except Exception:
        logger.exception(
            "Не удалось инициализировать Semetrics — отправка событий отключена. "
            "Сервис продолжает работать без аналитического канала."
        )
        return None


@asynccontextmanager
async def lifespan(_: FastAPI):
    semetrics = _init_semetrics()
    stop_event = asyncio.Event()

    tasks: list[asyncio.Task] = [
        asyncio.create_task(metrics_loop.run(semetrics, stop_event), name="metrics_loop"),
        asyncio.create_task(docker_events.stream(semetrics, stop_event), name="docker_events"),
        asyncio.create_task(_broadcast_state_loop(stop_event), name="state_broadcast"),
        asyncio.create_task(_alert_check_loop(stop_event), name="alert_check"),
    ]

    logger.info(
        "svc_monitoring запущен: server=%s, metrics_interval=%ds, semetrics=%s",
        settings.SERVER_NAME,
        settings.METRICS_INTERVAL,
        "on" if semetrics else "off",
    )

    try:
        yield
    finally:
        logger.info("svc_monitoring останавливается")
        stop_event.set()
        await asyncio.gather(*tasks, return_exceptions=True)
        if semetrics is not None:
            try:
                semetrics.shutdown()
            except Exception:
                logger.exception("Ошибка при semetrics.shutdown()")


app = FastAPI(
    title="svc_monitoring",
    description="Хост-метрики, Docker events и push-канал к ESP32-устройству.",
    version="2.0.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(state.router)
app.include_router(ws.router)
app.include_router(internal.router)


@app.get("/")
def root() -> dict:
    return {"service": "svc_monitoring", "status": "running"}
