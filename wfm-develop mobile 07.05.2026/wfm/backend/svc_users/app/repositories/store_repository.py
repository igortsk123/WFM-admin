from sqlalchemy.orm import Session
from typing import Optional
from app.domain.models import Store


class StoreRepository:
    """Репозиторий для работы с магазинами"""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> list[Store]:
        """Получить все магазины"""
        return self.db.query(Store).order_by(Store.name).all()

    def get_by_id(self, store_id: int) -> Optional[Store]:
        """Получить магазин по ID"""
        return self.db.query(Store).filter(Store.id == store_id).first()

    def get_by_external_code(self, external_code: str) -> Optional[Store]:
        """Получить магазин по внешнему коду (без фильтра по партнёру)"""
        return self.db.query(Store).filter(Store.external_code == external_code).first()

    def get_by_external_code_and_partner(self, external_code: str, partner_id: int) -> Optional[Store]:
        """Получить магазин по паре (external_code, partner_id)"""
        return (
            self.db.query(Store)
            .filter(Store.external_code == external_code, Store.partner_id == partner_id)
            .first()
        )

    def create(self, name: str, address: Optional[str] = None, external_code: Optional[str] = None, partner_id: Optional[int] = None) -> Store:
        """Создать магазин"""
        store = Store(name=name, address=address, external_code=external_code, partner_id=partner_id)
        self.db.add(store)
        self.db.commit()
        self.db.refresh(store)
        return store

    def get_or_create(self, external_code: str, partner_id: int, name: Optional[str] = None) -> Store:
        """Получить магазин по паре (external_code, partner_id) или создать новый"""
        store = self.get_by_external_code_and_partner(external_code, partner_id)
        if not store:
            store = self.create(name=name or external_code, external_code=external_code, partner_id=partner_id)
        return store

    def update(self, store: Store, name: Optional[str] = None, address: Optional[str] = None, external_code: Optional[str] = None) -> Store:
        """Обновить магазин"""
        if name is not None:
            store.name = name
        if address is not None:
            store.address = address
        if external_code is not None:
            store.external_code = external_code
        self.db.commit()
        self.db.refresh(store)
        return store
