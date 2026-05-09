from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    """Конфигурация svc_notifications"""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        env_parse_none_str="null",
    )

    # Database
    DATABASE_URL: str = "postgresql://wfm_notifications_user:wfm_notifications_password@localhost:5432/wfm_notifications"

    # Application
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # CORS — хранится как строка, парсится в список
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Semetrics Analytics
    SEMETRICS_API_KEY: str = ""
    SEMETRICS_ENDPOINT: str = "https://semetrics.ru/events"
    SERVER_NAME: str = "server"

    # Firebase Admin SDK — JSON-строка с содержимым serviceAccountKey.json
    # Если пустая строка — Firebase отключён (push уведомления не работают)
    FIREBASE_CREDENTIALS_JSON: str = ""

    # WebSocket ACK таймаут (секунды)
    WS_ACK_TIMEOUT: int = 5

    # Межсервисное взаимодействие
    USERS_SERVICE_URL: str = "http://svc_users:8000"
    USERS_SERVICE_TIMEOUT: float = 5.0
    MONITORING_SERVICE_URL: str = "http://svc_monitoring:8000"
    MONITORING_SERVICE_TIMEOUT: float = 1.0

    # Huawei Push Kit (HMS)
    HMS_APP_ID: str = ""
    HMS_CLIENT_SECRET: str = ""
    HMS_OAUTH_URL: str = "https://oauth-login.cloud.huawei.com/oauth2/v3/token"
    HMS_PUSH_URL: str = "https://push-api.cloud.huawei.com/v1"

    @property
    def hms_enabled(self) -> bool:
        return bool(self.HMS_APP_ID.strip() and self.HMS_CLIENT_SECRET.strip())

    @property
    def allowed_origins_list(self) -> List[str]:
        """Получить ALLOWED_ORIGINS как список"""
        if not self.ALLOWED_ORIGINS:
            return []
        if self.ALLOWED_ORIGINS.startswith("["):
            return json.loads(self.ALLOWED_ORIGINS)
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def firebase_enabled(self) -> bool:
        return bool(self.FIREBASE_CREDENTIALS_JSON.strip())


settings = Settings()
