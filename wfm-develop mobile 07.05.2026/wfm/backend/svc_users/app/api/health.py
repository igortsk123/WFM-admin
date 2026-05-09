from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check():
    """Health check endpoint для проверки доступности сервиса"""
    return {"status": "healthy", "service": "svc_users"}
