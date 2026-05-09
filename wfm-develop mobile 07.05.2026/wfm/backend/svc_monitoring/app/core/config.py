from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Semetrics
    SEMETRICS_API_KEY: str = ""
    SEMETRICS_ENDPOINT: str = "https://semetrics.ru/events"

    # Идентификация хоста
    SERVER_NAME: str = "server"

    # Сбор метрик
    METRICS_INTERVAL: int = 60
    HOST_DISK_PATH: str = "/hostfs"  # корневая ФС хоста, примонтированная в контейнер

    # API устройства
    DEVICE_TOKEN: str = ""  # пустой токен ⇒ авторизация всегда отказывает (защита от misconfig)

    # WebSocket
    WS_BROADCAST_INTERVAL: int = 30  # как часто рассылать state по WS
    WS_PING_TIMEOUT: int = 30  # макс. ожидание сообщения от устройства (учитывает 15с пинг)

    # Алерты
    ALERT_POLL_INTERVAL: int = 5
    ERROR_SPIKE_COUNT: int = 5
    ERROR_SPIKE_WINDOW_SEC: int = 300
    ERROR_ALERT_COOLDOWN_SEC: int = 300

    # Buffers
    ERRORS_BUFFER_MAXLEN: int = 10_000


settings = Settings()
