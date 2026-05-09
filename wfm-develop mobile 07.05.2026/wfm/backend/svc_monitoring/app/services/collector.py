import psutil

from app.core.config import settings


def _to_gb(value: int) -> float:
    return round(value / (1024 ** 3), 2)


def collect_metrics() -> dict:
    # CPU — блокирует на 1 секунду для получения точного значения
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_cores_logical = psutil.cpu_count(logical=True)
    cpu_cores_physical = psutil.cpu_count(logical=False)

    # Физическая память
    mem = psutil.virtual_memory()

    # Своп
    swap = psutil.swap_memory()

    # Диск хоста (примонтирован как /hostfs)
    try:
        disk = psutil.disk_usage(settings.HOST_DISK_PATH)
        disk_props = {
            "disk_total_gb": _to_gb(disk.total),
            "disk_used_gb": _to_gb(disk.used),
            "disk_free_gb": _to_gb(disk.free),
            "disk_percent": round(disk.percent, 1),
        }
    except Exception:
        disk_props = {}

    return {
        "server": settings.SERVER_NAME,

        "cpu_percent": round(cpu_percent, 1),
        "cpu_cores_logical": cpu_cores_logical,
        "cpu_cores_physical": cpu_cores_physical,

        "mem_total_gb": _to_gb(mem.total),
        "mem_used_gb": _to_gb(mem.used),
        "mem_free_gb": _to_gb(mem.available),
        "mem_percent": round(mem.percent, 1),

        "swap_total_gb": _to_gb(swap.total),
        "swap_used_gb": _to_gb(swap.used),
        "swap_free_gb": _to_gb(swap.free),
        "swap_percent": round(swap.percent, 1),

        **disk_props,
    }
