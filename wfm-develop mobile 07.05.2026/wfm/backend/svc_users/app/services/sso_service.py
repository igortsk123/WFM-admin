import sys
from pathlib import Path

# Добавляем shared модуль в путь
# В контейнере: /app/app/services/sso_service.py -> /app (где лежит /app/shared/)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import httpx
import logging
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.domain.models import UserSSOCache
from shared import ServiceUnavailableException

logger = logging.getLogger(__name__)


class SSOService:
    """Сервис для работы с SSO API Beyond Violet с кэшированием"""

    def __init__(self):
        self.base_url = settings.SSO_BASE_URL
        self.timeout = settings.SSO_TIMEOUT
        self.cache_ttl = settings.SSO_CACHE_TTL

    async def get_user_info(self, user_id: int, token: str, db: Session) -> UserSSOCache:
        """
        Получить информацию о пользователе из SSO с кэшированием.

        Логика работы:
        1. Проверить кэш - если свежий (< 24 часов), вернуть из кэша
        2. Если кэш устарел или отсутствует - запрос к SSO API
        3. При успешном ответе - обновить кэш
        4. При ошибке SSO:
           - Если есть устаревший кэш - залогировать warning и вернуть его
           - Если кэша нет - вернуть ошибку SERVICE_UNAVAILABLE

        Args:
            user_id: UUID пользователя
            token: Bearer токен для авторизации в SSO
            db: Сессия БД

        Returns:
            UserSSOCache: Данные пользователя из кэша

        Raises:
            ServiceUnavailableException: SSO недоступен и кэша нет
        """
        logger.info(f"🔍 get_user_info called for user_id={user_id}")

        # 1. Проверить кэш
        cache = db.query(UserSSOCache).filter(
            UserSSOCache.user_id == user_id
        ).first()

        cache_is_fresh = False
        if cache:
            # Проверить, не устарел ли кэш (24 часа)
            cache_age = datetime.utcnow() - cache.cached_at
            cache_age_seconds = cache_age.total_seconds()
            cache_is_fresh = cache_age_seconds < self.cache_ttl

            logger.info(f"💾 Cache found: age={cache_age_seconds:.0f}s, ttl={self.cache_ttl}s, fresh={cache_is_fresh}")

            if cache_is_fresh:
                logger.info(f"✅ Returning fresh cache for user {user_id}")
                return cache  # Вернуть свежий кэш
        else:
            logger.info(f"❌ No cache found for user {user_id}")

        # 2. Если кэш отсутствует или устарел — попытка запроса к SSO
        sso_url = f"{self.base_url}/users/self/"
        logger.info(f"📤 SSO request: GET {sso_url}")

        try:
            headers = {"Authorization": f"Bearer {token[:20]}..."}  # Логируем только начало токена
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    sso_url,
                    headers={"Authorization": f"Bearer {token}"},  # Полный токен в запрос
                    timeout=self.timeout
                )

                logger.info(f"📥 SSO response: {response.status_code} from {sso_url}")

                response.raise_for_status()

            # 3. Обновить кэш свежими данными из SSO
            sso_response = response.json()
            logger.info(f"✅ SSO data received for user {user_id}: {sso_response}")

            # Извлекаем данные из структуры Beyond Violet API
            data = sso_response.get("data", {})
            personal = data.get("personal", {})
            contact = data.get("contact", {})
            img = personal.get("img", {})

            # Формируем photo_url из path
            photo_path = img.get("path")
            photo_url = f"https://image.beyondviolet.com/{photo_path}" if photo_path else None

            if cache:
                # Обновить существующую запись
                cache.first_name = personal.get("first_name")
                cache.last_name = personal.get("last_name")
                cache.middle_name = personal.get("middle_name")
                cache.email = contact.get("email")
                cache.phone = contact.get("phone")
                cache.photo_url = photo_url
                cache.gender = personal.get("gender")
                cache.birth_date = personal.get("birth_date")
                cache.cached_at = datetime.utcnow()
                logger.info(f"Updated SSO cache for user {user_id}")
            else:
                # Создать новую запись
                cache = UserSSOCache(
                    user_id=user_id,
                    first_name=personal.get("first_name"),
                    last_name=personal.get("last_name"),
                    middle_name=personal.get("middle_name"),
                    email=contact.get("email"),
                    phone=contact.get("phone"),
                    photo_url=photo_url,
                    gender=personal.get("gender"),
                    birth_date=personal.get("birth_date"),
                    cached_at=datetime.utcnow()
                )
                db.add(cache)
                logger.info(f"Created SSO cache for user {user_id}")

            try:
                db.commit()
                db.refresh(cache)
            except IntegrityError:
                # Конкурентный запрос уже создал запись — откатываем и читаем её
                db.rollback()
                cache = db.query(UserSSOCache).filter(UserSSOCache.user_id == user_id).first()
                logger.info(f"SSO cache conflict resolved for user {user_id}: re-fetched existing record")
            return cache

        except httpx.TimeoutException as e:
            logger.error(f"❌ SSO timeout for user {user_id}: {str(e)}")
            if cache:
                cache_age_seconds = (datetime.utcnow() - cache.cached_at).total_seconds()
                logger.warning(f"⚠️ Returning stale cache (age: {cache_age_seconds}s)")
                return cache
            else:
                logger.error(f"💥 No cache available, returning SERVICE_UNAVAILABLE")
                raise ServiceUnavailableException("SSO service timeout and no cached data")

        except httpx.HTTPError as e:
            error_details = f"Status: {getattr(e.response, 'status_code', 'N/A')}"
            try:
                error_body = e.response.text if hasattr(e.response, 'text') else str(e)
                error_details += f", Body: {error_body[:200]}"
            except:
                pass

            logger.error(f"❌ SSO HTTP error for user {user_id}: {error_details}")

            if cache:
                cache_age_seconds = (datetime.utcnow() - cache.cached_at).total_seconds()
                logger.warning(f"⚠️ Returning stale cache (age: {cache_age_seconds}s)")
                return cache
            else:
                logger.error(f"💥 No cache available, returning SERVICE_UNAVAILABLE")
                raise ServiceUnavailableException("SSO service unavailable and no cached data")

        except Exception as e:
            logger.error(f"❌ SSO unexpected error for user {user_id}: {type(e).__name__}: {str(e)}")
            if cache:
                cache_age_seconds = (datetime.utcnow() - cache.cached_at).total_seconds()
                logger.warning(f"⚠️ Returning stale cache (age: {cache_age_seconds}s)")
                return cache
            else:
                logger.error(f"💥 No cache available, returning SERVICE_UNAVAILABLE")
                raise ServiceUnavailableException("SSO service error and no cached data")


def get_sso_service() -> SSOService:
    """Dependency для получения экземпляра SSOService"""
    return SSOService()
