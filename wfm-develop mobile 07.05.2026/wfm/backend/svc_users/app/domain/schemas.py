from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


# ========== Store Schemas ==========

class StoreResponse(BaseModel):
    """Схема ответа с данными магазина"""
    id: int
    name: str
    address: Optional[str] = None
    external_code: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class StoreCreate(BaseModel):
    """Схема для создания магазина"""
    name: str = Field(..., min_length=1, max_length=255)
    address: Optional[str] = None
    external_code: Optional[str] = None


class StoreUpdate(BaseModel):
    """Схема для обновления магазина"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = None
    external_code: Optional[str] = None


class StoreListResponse(BaseModel):
    """Схема ответа со списком магазинов"""
    stores: List[StoreResponse]


# ========== Enums ==========

class PermissionType(str, Enum):
    """Типы привилегий пользователей"""
    CASHIER = "CASHIER"
    SALES_FLOOR = "SALES_FLOOR"
    SELF_CHECKOUT = "SELF_CHECKOUT"
    WAREHOUSE = "WAREHOUSE"


# ========== Схемы для справочников ==========

class RoleResponse(BaseModel):
    """Схема ответа с ролью"""
    id: int
    code: str
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "code": "worker",
                "name": "Работник",
                "description": "Сотрудник торгового зала"
            }
        }


class EmployeeTypeResponse(BaseModel):
    """Схема ответа с типом сотрудника"""
    id: int
    code: str
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "code": "FULL_TIME",
                "name": "Штатный",
                "description": "Штатный сотрудник"
            }
        }


class PositionResponse(BaseModel):
    """Схема ответа с должностью"""
    id: int
    code: str
    name: str
    description: Optional[str] = None
    role: Optional[RoleResponse] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 3,
                "code": "cashier",
                "name": "Кассир",
                "description": None,
                "role": {"id": 1, "code": "worker", "name": "Работник", "description": None}
            }
        }


class RankResponse(BaseModel):
    """Схема ответа с разрядом"""
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {"id": 2, "code": "rank_2", "name": "2 разряд"}
        }


# ========== Схемы для Permission ==========

class PermissionResponse(BaseModel):
    """Схема ответа с привилегией"""
    id: UUID
    permission: PermissionType
    granted_at: datetime
    granted_by: int  # integer ID менеджера

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
                "permission": "CASHIER",
                "granted_at": "2026-01-15T10:00:00",
                "granted_by": 42
            }
        }


class PermissionsUpdate(BaseModel):
    """Схема для обновления списка привилегий пользователя"""
    permissions: List[PermissionType] = []

    model_config = {
        "json_schema_extra": {
            "example": {
                "permissions": ["CASHIER", "SALES_FLOOR"]
            }
        }
    }


# ========== Схемы для Assignment ==========

class AssignmentResponse(BaseModel):
    """Схема ответа с назначением сотрудника"""
    id: int
    external_id: Optional[int] = None
    company_name: Optional[str] = None
    position: Optional[PositionResponse] = None
    rank: Optional[RankResponse] = None
    store: Optional[StoreResponse] = None
    date_start: Optional[date] = None
    date_end: Optional[date] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 7,
                "external_id": 12345,
                "company_name": "Магазин у дома №5",
                "position": {"id": 3, "code": "cashier", "name": "Кассир", "description": None, "role": {"id": 1, "code": "worker", "name": "Работник", "description": None}},
                "rank": {"id": 2, "code": "rank_2", "name": "2 разряд"},
                "store": {"id": 5, "name": "Магазин у дома №5", "address": "ул. Ленина, 42", "external_code": "SHOP005", "created_at": "2025-06-01T12:00:00"},
                "date_start": "2025-01-01",
                "date_end": None
            }
        }


# ========== Схемы для User ==========

class UserCreate(BaseModel):
    """Схема для создания пользователя"""
    sso_id: UUID  # UUID из SSO/JWT
    external_id: Optional[int] = None
    type_id: Optional[int] = None


class UserUpdate(BaseModel):
    """Схема для обновления пользователя"""
    external_id: Optional[int] = None
    type_id: Optional[int] = None
    first_name: Optional[str] = Field(None, max_length=255)
    last_name: Optional[str] = Field(None, max_length=255)
    middle_name: Optional[str] = Field(None, max_length=255)

    model_config = {
        "json_schema_extra": {
            "example": {
                "external_id": 12345,
                "type_id": 1,
                "first_name": "Иван",
                "last_name": "Иванов",
                "middle_name": "Сергеевич"
            }
        }
    }


class UserResponse(BaseModel):
    """Схема ответа с пользователем"""
    id: int
    sso_id: UUID
    external_id: Optional[int] = None
    employee_type: Optional[EmployeeTypeResponse] = None
    permissions: List[PermissionResponse] = []
    assignments: List[AssignmentResponse] = []
    updated_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 42,
                "sso_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "external_id": 12345,
                "employee_type": {"id": 1, "code": "FULL_TIME", "name": "Штатный", "description": None},
                "permissions": [
                    {
                        "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
                        "permission": "CASHIER",
                        "granted_at": "2026-01-15T10:00:00",
                        "granted_by": 1
                    }
                ],
                "assignments": [
                    {
                        "id": 7,
                        "external_id": 12345,
                        "company_name": "Магазин у дома №5",
                        "position": {"id": 3, "code": "cashier", "name": "Кассир", "description": None, "role": {"id": 1, "code": "worker", "name": "Работник", "description": None}},
                        "rank": {"id": 2, "code": "rank_2", "name": "2 разряд"},
                        "store": {"id": 5, "name": "Магазин у дома №5", "address": "ул. Ленина, 42", "external_code": "SHOP005", "created_at": "2025-06-01T12:00:00"},
                        "date_start": "2025-01-01",
                        "date_end": None
                    }
                ],
                "updated_at": "2026-03-02T08:00:00"
            }
        }


class UserMeResponse(BaseModel):
    """Схема ответа для endpoint /users/me (локальные данные + SSO + LAMA)"""

    # Локальные данные из таблицы users
    id: int
    sso_id: UUID
    external_id: Optional[int] = None
    employee_type: Optional[EmployeeTypeResponse] = None
    permissions: List[PermissionResponse] = []
    assignments: List[AssignmentResponse] = []

    # Данные из SSO (кэшированные)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    middle_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[date] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 42,
                "sso_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "external_id": 12345,
                "employee_type": {"id": 1, "code": "FULL_TIME", "name": "Штатный", "description": None},
                "permissions": [
                    {
                        "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
                        "permission": "CASHIER",
                        "granted_at": "2026-01-15T10:00:00",
                        "granted_by": 1
                    }
                ],
                "assignments": [
                    {
                        "id": 7,
                        "external_id": 12345,
                        "company_name": "Магазин у дома №5",
                        "position": {"id": 3, "code": "cashier", "name": "Кассир", "description": None, "role": {"id": 1, "code": "worker", "name": "Работник", "description": None}},
                        "rank": {"id": 2, "code": "rank_2", "name": "2 разряд"},
                        "store": {"id": 5, "name": "Магазин у дома №5", "address": "ул. Ленина, 42", "external_code": "SHOP005", "created_at": "2025-06-01T12:00:00"},
                        "date_start": "2025-01-01",
                        "date_end": None
                    }
                ],
                "first_name": "Иван",
                "last_name": "Иванов",
                "middle_name": "Сергеевич",
                "email": "i.ivanov@example.com",
                "phone": "+79001234567",
                "photo_url": "https://cdn.example.com/photos/ivanov.jpg",
                "gender": "M",
                "birth_date": "1995-05-15"
            }
        }
