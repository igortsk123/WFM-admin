"""
Конфигурация логирования для приложения.
Этот модуль должен импортироваться первым для правильной настройки логов.
"""
import logging
import sys


def setup_logging(log_level: str = "INFO", httpx_log_level: str = "WARNING"):
    """
    Настройка логирования для приложения.

    Args:
        log_level: Уровень логирования (DEBUG, INFO, WARNING, ERROR)
        httpx_log_level: Уровень логирования для httpx (DEBUG для детальных HTTP логов)
    """
    # Получаем корневой логгер
    root_logger = logging.getLogger()

    # Очищаем существующие хендлеры
    root_logger.handlers.clear()

    # Создаем хендлер для stdout
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level)

    # Форматтер с эмодзи и временем
    formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)

    # Добавляем хендлер к корневому логгеру
    root_logger.addHandler(handler)
    root_logger.setLevel(log_level)

    # Отключаем SQL логи SQLAlchemy (слишком много шума)
    sqlalchemy_loggers = [
        'sqlalchemy.engine',
        'sqlalchemy.engine.Engine',
        'sqlalchemy.pool',
        'sqlalchemy.dialects',
        'sqlalchemy.orm'
    ]

    for logger_name in sqlalchemy_loggers:
        sql_logger = logging.getLogger(logger_name)
        sql_logger.setLevel(logging.ERROR)  # Показываем только ошибки
        sql_logger.propagate = False  # Не пропагируем в корневой логгер
        sql_logger.handlers.clear()  # Удаляем все хендлеры

    # Явно включаем логи нашего приложения
    logging.getLogger('app').setLevel(logging.INFO)
    logging.getLogger('app.services.sso_service').setLevel(logging.INFO)
    logging.getLogger('app.api.users').setLevel(logging.INFO)

    # Uvicorn логи оставляем на INFO
    logging.getLogger('uvicorn').setLevel(logging.INFO)
    logging.getLogger('uvicorn.access').setLevel(logging.INFO)
    logging.getLogger('uvicorn.error').setLevel(logging.INFO)

    # Настройка httpx логов (управляется через HTTPX_LOG_LEVEL)
    # DEBUG покажет: URL, методы, headers, status codes, response body
    httpx_level = getattr(logging, httpx_log_level.upper(), logging.WARNING)
    logging.getLogger('httpx').setLevel(httpx_level)
    logging.getLogger('httpcore').setLevel(httpx_level)  # Низкоуровневые HTTP детали

    if httpx_level == logging.DEBUG:
        logging.info(f"🔍 HTTPX logging set to DEBUG - detailed HTTP logs enabled")

    logging.info("✅ Logging configured successfully")
