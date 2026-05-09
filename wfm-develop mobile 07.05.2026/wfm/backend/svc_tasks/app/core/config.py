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
    DATABASE_URL: str = "postgresql://wfm_user:wfm_password@localhost:5432/wfm_tasks"

    # Application
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # CORS — хранится как строка, парсится в список
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # LAMA Integration
    LAMA_API_BASE_URL: str = "https://wfm-smart.lama70.ru/api"
    LAMA_API_TIMEOUT: int = 5
    LAMA_API_ENABLED: bool = True
    LAMA_WEBHOOK_SECRET: str = ""  # Если задан — проверяется query-параметр ?secret= в webhook
    LAMA_PARTNER_ID: int = 2  # ID партнёра LAMA в таблице partners

    # Semetrics Analytics
    SEMETRICS_API_KEY: str = ""
    SEMETRICS_ENDPOINT: str = "https://semetrics.ru/events"
    SERVER_NAME: str = "server"

    # Inter-service communication
    USERS_SERVICE_URL: str = "http://svc_users:8000"
    USERS_SERVICE_TIMEOUT: float = 5.0
    NOTIFICATIONS_SERVICE_URL: str = "http://svc_notifications:8000"
    NOTIFICATIONS_SERVICE_TIMEOUT: float = 3.0
    MONITORING_SERVICE_URL: str = "http://svc_monitoring:8000"
    MONITORING_SERVICE_TIMEOUT: float = 1.0

    # S3 (RegRU, бакет wfm-images)
    S3_ENDPOINT_URL: str = "https://s3.regru.cloud"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET_NAME: str = "wfm-images"
    S3_PUBLIC_URL_PREFIX: str = "https://wfm-images.website.regru.cloud"

    @property
    def allowed_origins_list(self) -> List[str]:
        """Получить ALLOWED_ORIGINS как список"""
        if not self.ALLOWED_ORIGINS:
            return []
        if self.ALLOWED_ORIGINS.startswith("["):
            return json.loads(self.ALLOWED_ORIGINS)
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
