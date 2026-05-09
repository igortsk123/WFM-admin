"""
S3-клиент для загрузки фотоотчётов задач.

Использует RegRU S3-совместимое хранилище.
Бакет: wfm-images
Public URL: https://wfm-images.website.regru.cloud/{key}
"""

import uuid
import logging

import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import UploadFile

from app.core.config import settings

logger = logging.getLogger(__name__)

# Маппинг content-type → расширение файла
_CONTENT_TYPE_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
}

ALLOWED_CONTENT_TYPES = set(_CONTENT_TYPE_TO_EXT.keys())


def _remove_expect_header(request, **kwargs):
    """Убрать Expect: 100-continue — nginx RegRU обрабатывает его некорректно."""
    request.headers.pop("Expect", None)


def _get_s3_client():
    client = boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        config=Config(
            signature_version="s3v4",
            s3={
                "addressing_style": "path",
                "payload_signing_enabled": True,
            },
        ),
        region_name="us-east-1",
    )
    client.meta.events.register("before-send.s3.PutObject", _remove_expect_header)
    return client


async def upload_task_image(file: UploadFile, task_id: str) -> str:
    """Загрузить фото задачи в S3 и вернуть публичный URL.

    Args:
        file: Загружаемый файл (FastAPI UploadFile)
        task_id: UUID задачи — используется как папка в бакете

    Returns:
        Публичный URL загруженного файла

    Raises:
        ValueError: Если тип файла не поддерживается
        RuntimeError: Если загрузка в S3 завершилась ошибкой
    """
    content_type = file.content_type or ""
    ext = _CONTENT_TYPE_TO_EXT.get(content_type)
    if not ext:
        raise ValueError(
            f"Неподдерживаемый тип файла: {content_type}. "
            f"Допустимые: {', '.join(ALLOWED_CONTENT_TYPES)}"
        )

    key = f"tasks/{task_id}/{uuid.uuid4()}.{ext}"
    file_bytes = await file.read()

    try:
        client = _get_s3_client()
        client.put_object(
            Bucket=settings.S3_BUCKET_NAME,
            Key=key,
            Body=file_bytes,
            ContentType=content_type,
        )
    except ClientError as e:
        logger.error(f"Ошибка загрузки в S3: {e}")
        raise RuntimeError(f"Не удалось загрузить фото в S3: {e}")
    except BotoCoreError as e:
        logger.error(f"Ошибка загрузки в S3 (BotoCore): {e}")
        raise RuntimeError(f"Не удалось загрузить фото в S3: {e}")

    public_url = f"{settings.S3_PUBLIC_URL_PREFIX.rstrip('/')}/{key}"
    logger.info(f"Загружено фото задачи {task_id}: {public_url}")
    return public_url
