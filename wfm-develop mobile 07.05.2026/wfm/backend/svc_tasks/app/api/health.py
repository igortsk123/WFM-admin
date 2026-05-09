from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from shared.auth import CurrentUser

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """Health check endpoint для проверки доступности сервиса"""
    return {"status": "healthy", "service": "svc_tasks"}


@router.get("/health/test-500")
async def test_500(current_user: CurrentUser = Depends(get_current_user)):
    """Намеренно бросает 500 для проверки мониторинга ошибок (требует авторизацию)"""
    raise RuntimeError("Test 500: намеренная ошибка для проверки мониторинга")
