from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    """Конфигурация приложения"""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        env_parse_none_str="null",
    )

    # Database
    DATABASE_URL: str = "postgresql://wfm_user:wfm_password@localhost:5433/wfm_users"

    # Application
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    HTTPX_LOG_LEVEL: str = "WARNING"  # DEBUG для детальных HTTP логов (запросы, ответы, headers)

    # CORS — хранится как строка, парсится в список
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Semetrics Analytics
    SEMETRICS_API_KEY: str = ""
    SEMETRICS_ENDPOINT: str = "https://semetrics.ru/events"
    SERVER_NAME: str = "server"

    # SSO Integration (Beyond Violet)
    SSO_BASE_URL: str = "https://api.beyondviolet.com/sys/v1"
    SSO_TIMEOUT: int = 5  # Таймаут запросов к SSO в секундах
    SSO_CACHE_TTL: int = 86400  # Время жизни кэша SSO данных (24 часа)

    # Account deletion (Beyond Violet Shopping API)
    ACCOUNT_DELETE_URL: str = "https://shopping.beyondviolet.com/api/account/"
    ACCOUNT_DELETE_TIMEOUT: int = 10  # Таймаут удаления аккаунта в секундах

    # LAMA Integration
    LAMA_API_BASE_URL: str = "https://wfm-smart.lama70.ru/api"
    LAMA_API_TIMEOUT: int = 5  # Таймаут запросов к LAMA в секундах
    LAMA_API_ENABLED: bool = True  # Включение/отключение интеграции
    LAMA_CACHE_TTL: int = 3600  # Время жизни кэша LAMA данных (1 час)
    LAMA_PARTNER_ID: int = 2  # ID партнёра LAMA в таблице partners

    # Inter-service: svc_monitoring (real-time error reporting)
    MONITORING_SERVICE_URL: str = "http://svc_monitoring:8000"
    MONITORING_SERVICE_TIMEOUT: float = 1.0


    @property
    def allowed_origins_list(self) -> List[str]:
        """Получить ALLOWED_ORIGINS как список"""
        if not self.ALLOWED_ORIGINS:
            return []
        if self.ALLOWED_ORIGINS.startswith("["):
            return json.loads(self.ALLOWED_ORIGINS)
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
