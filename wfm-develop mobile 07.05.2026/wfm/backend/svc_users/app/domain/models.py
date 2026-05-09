from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base


class Partner(Base):
    """Модель партнёра (пространство имён для магазинов без LAMA)"""

    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    stores = relationship("Store", back_populates="partner")

    def __repr__(self):
        return f"<Partner(id={self.id}, name={self.name})>"


class Store(Base):
    """Модель магазина (справочник)"""

    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=True)
    external_code = Column(String(50), nullable=True, unique=True)  # shop_code из LAMA
    partner_id = Column(Integer, ForeignKey("partners.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    partner = relationship("Partner", back_populates="stores")
    assignments = relationship("Assignment", back_populates="store")

    def __repr__(self):
        return f"<Store(id={self.id}, name={self.name})>"


class Role(Base):
    """Модель роли пользователя (справочник)"""

    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Relationships
    positions = relationship("Position", back_populates="role")

    def __repr__(self):
        return f"<Role(id={self.id}, code={self.code}, name={self.name})>"


class EmployeeType(Base):
    """Модель типа сотрудника (справочник)"""

    __tablename__ = "employee_types"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Relationships
    users = relationship("User", back_populates="employee_type")

    def __repr__(self):
        return f"<EmployeeType(id={self.id}, code={self.code}, name={self.name})>"


class Position(Base):
    """Модель должности сотрудника (справочник)"""

    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False, server_default="1")

    # Relationships
    role = relationship("Role", back_populates="positions")
    assignments = relationship("Assignment", back_populates="position")

    def __repr__(self):
        return f"<Position(id={self.id}, code={self.code}, name={self.name})>"


class Rank(Base):
    """Модель разряда сотрудника (справочник)"""

    __tablename__ = "ranks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(50), nullable=False, unique=True)
    name = Column(String(255), nullable=False)

    # Relationships
    assignments = relationship("Assignment", back_populates="rank")

    def __repr__(self):
        return f"<Rank(id={self.id}, code={self.code}, name={self.name})>"


class User(Base):
    """Модель пользователя в базе данных"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)  # internal integer PK
    sso_id = Column(UUID(as_uuid=True), nullable=True, unique=True)  # UUID из SSO/JWT (поле 'u'); NULL для пользователей, созданных через LAMA batch-sync
    phone = Column(String(50), nullable=True, unique=True)  # телефон; для ручного добавления и merge при логине
    external_id = Column(Integer, nullable=True)  # employee_id из LAMA
    first_name = Column(String(255), nullable=True)  # ФИО — локальный источник для партнёров (приоритет между LAMA и SSO)
    last_name = Column(String(255), nullable=True)
    middle_name = Column(String(255), nullable=True)
    type_id = Column(Integer, ForeignKey("employee_types.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by = Column(Integer, nullable=True)  # integer ID обновившего пользователя

    # Relationships
    employee_type = relationship("EmployeeType", back_populates="users")
    permissions = relationship("Permission", back_populates="user", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, sso_id={self.sso_id}, external_id={self.external_id})>"


class Assignment(Base):
    """Модель назначения сотрудника (связь с LAMA)"""

    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    external_id = Column(Integer, nullable=True, unique=True)  # employee_in_shop_id из LAMA
    company_name = Column(String(255), nullable=True)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=True)
    rank_id = Column(Integer, ForeignKey("ranks.id"), nullable=True)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    date_start = Column(Date, nullable=True)
    date_end = Column(Date, nullable=True)

    # Relationships
    user = relationship("User", back_populates="assignments")
    position = relationship("Position", back_populates="assignments")
    rank = relationship("Rank", back_populates="assignments")
    store = relationship("Store", back_populates="assignments")

    def __repr__(self):
        return f"<Assignment(id={self.id}, user_id={self.user_id}, external_id={self.external_id})>"


class Permission(Base):
    """Модель привилегии пользователя в базе данных"""

    __tablename__ = "permissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission = Column(String(50), nullable=False)  # CASHIER, SALES_FLOOR, SELF_CHECKOUT, WAREHOUSE
    granted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    granted_by = Column(Integer, nullable=False)  # integer ID менеджера
    revoked_at = Column(DateTime, nullable=True)  # Soft delete

    # Relationship
    user = relationship("User", back_populates="permissions")

    def __repr__(self):
        return f"<Permission(id={self.id}, user_id={self.user_id}, permission={self.permission})>"


class UserSSOCache(Base):
    """Модель для кэширования данных из SSO (24 часа)"""

    __tablename__ = "user_sso_cache"

    user_id = Column(Integer, primary_key=True)  # integer FK на users.id
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    middle_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    photo_url = Column(Text, nullable=True)
    gender = Column(String(10), nullable=True)
    birth_date = Column(Date, nullable=True)
    cached_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<UserSSOCache(user_id={self.user_id}, cached_at={self.cached_at})>"


class UserLamaCache(Base):
    """Модель для кэширования синхронизации с LAMA (1 час)"""

    __tablename__ = "user_lama_cache"

    user_id = Column(Integer, primary_key=True)  # integer FK на users.id
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    middle_name = Column(String(255), nullable=True)
    cached_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<UserLamaCache(user_id={self.user_id}, cached_at={self.cached_at})>"
