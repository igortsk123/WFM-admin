"""
Стриминг Docker events через unix-сокет.
Доставка событий мгновенная: flush() вызывается после каждого track().
Дополнительно обновляется state_store — он держит in-memory snapshot для /api/state.
"""
import asyncio
import json
import logging

import httpx
from semetrics import Semetrics

from app.core.config import settings
from app.domain.schemas import CRITICAL_CONTAINERS, ContainerStatus
from app.services.state_store import state_store

logger = logging.getLogger(__name__)

TRACKED_ACTIONS = {"start", "stop", "die", "restart", "health_status"}


async def stream(semetrics: Semetrics | None, stop_event: asyncio.Event) -> None:
    """Запускает стрим Docker events, переподключается при обрыве."""
    while not stop_event.is_set():
        try:
            await _connect_and_stream(semetrics, stop_event)
        except asyncio.CancelledError:
            break
        except Exception:
            logger.exception("Ошибка Docker events стрима, переподключение через 5 сек")
            try:
                await asyncio.wait_for(asyncio.shield(stop_event.wait()), timeout=5)
            except asyncio.TimeoutError:
                pass


async def warmup_from_docker(client: httpx.AsyncClient) -> None:
    """
    Один запрос к /containers/json при старте — заполняет state_store текущими статусами,
    чтобы устройство сразу видело что-то осмысленное, а не unknown × N.
    """
    try:
        resp = await client.get("/containers/json", params={"all": "true"})
        resp.raise_for_status()
        containers = resp.json()
    except Exception:
        logger.exception("Не удалось прогреть state_store из /containers/json")
        return

    statuses: dict[str, ContainerStatus] = {}
    for c in containers:
        # Имена приходят как "/svc_tasks", срезаем ведущий слеш
        names = [n.lstrip("/") for n in c.get("Names", [])]
        for name in names:
            if name not in CRITICAL_CONTAINERS:
                continue
            state = (c.get("State") or "").lower()  # "running" / "exited" / "created" / ...
            health = ((c.get("Status") or "").lower())  # "Up 5 minutes (healthy)"
            if state == "running":
                if "(healthy)" in health:
                    statuses[name] = "healthy"
                elif "(unhealthy)" in health:
                    statuses[name] = "unhealthy"
                elif "(starting)" in health or "(health: starting)" in health:
                    statuses[name] = "starting"
                else:
                    # нет healthcheck → считаем healthy (контейнер запущен)
                    statuses[name] = "healthy"
            else:
                statuses[name] = "stopped"

    if statuses:
        await state_store.warmup_containers(statuses)
        logger.info("state_store прогрет: %s", statuses)


async def _connect_and_stream(
    semetrics: Semetrics | None,
    stop_event: asyncio.Event,
) -> None:
    transport = httpx.AsyncHTTPTransport(uds="/var/run/docker.sock")
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://localhost",
        timeout=None,
    ) as client:
        logger.info("Docker events: подключение к /var/run/docker.sock")
        await warmup_from_docker(client)
        async with client.stream(
            "GET",
            "/events",
            params={"filters": '{"type":["container"]}'},
        ) as response:
            async for line in response.aiter_lines():
                if stop_event.is_set():
                    break
                if not line:
                    continue
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue

                action = event.get("Action", "")
                # Docker health events: Action = "health_status: healthy" (статус встроен в строку)
                base_action = action.split(":")[0].strip()
                if base_action not in TRACKED_ACTIONS:
                    continue

                actor = event.get("Actor", {})
                attributes = actor.get("Attributes", {})

                container_name = attributes.get("name", "unknown")
                health_status: str | None = None

                props = {
                    "server": settings.SERVER_NAME,
                    "action": base_action,
                    "container_name": container_name,
                    "image": attributes.get("image", event.get("from", "unknown")),
                }
                if base_action == "die":
                    exit_code_str = attributes.get("exitCode", "")
                    if exit_code_str.isdigit():
                        props["exit_code"] = int(exit_code_str)
                if base_action == "health_status":
                    parts = action.split(": ", 1)
                    health_status = parts[1] if len(parts) > 1 else "unknown"
                    props["health_status"] = health_status

                # 1) Обновляем in-memory snapshot. Падение тут не должно ломать Semetrics.
                try:
                    await state_store.set_container_status(
                        name=container_name,
                        action=base_action,
                        health_status=health_status,
                    )
                except Exception:
                    logger.exception("state_store.set_container_status упал")

                # 2) Шлём в Semetrics (исторический ряд). Сохраняем существующий контракт.
                if semetrics is not None:
                    try:
                        semetrics.track(
                            event_name="docker_container_event",
                            user_id="system",
                            properties=props,
                        )
                        semetrics.flush()
                    except Exception:
                        logger.exception("semetrics.track упал для docker_container_event")

                logger.info(
                    "docker_container_event: action=%s container=%s",
                    base_action,
                    container_name,
                )
