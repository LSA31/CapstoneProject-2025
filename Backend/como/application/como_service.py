from como.domain.como import Como
from como.domain.repository.como_repo import ComoRepository
from typing import Optional
from datetime import datetime
import uuid


class ComoService:
    def __init__(self, repo: ComoRepository):
        self.repo = repo

    def create(self, device_id: str, owner_id: str, name: str) -> Como:
        como = Como(
            device_id=device_id,
            owner_id=owner_id,
            name=name,
            state="BASIC",
            level=1,
            experience=0,
            feeding_count_today=0,
            last_connected_at=datetime.utcnow(),
        )
        return self.repo.save(como)

    def get(self, owner_id: str) -> Optional[Como]:
        return self.repo.get_by_owner(owner_id)

    def delete(self, owner_id: str) -> None:
        self.repo.delete_by_owner(owner_id)
