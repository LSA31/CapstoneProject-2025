from datetime import datetime
from typing import Optional

from como.domain.como import Como
from como.domain.repository.como_repo import ComoRepository


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

    # 하드웨어 이벤트 처리
    def process_event(self, device_id: str, event_type: str) -> Optional[Como]:
        como = self.repo.get_by_device_id(device_id)
        if not como:
            return None

        now = datetime.utcnow()

        if event_type == "TOUCH":
            como.experience += 2
            como.last_touch_at = now  # 필드 추가 필요
        elif event_type == "TALK":
            como.experience += 2
            como.last_talk_at = now  # 필드 추가 필요

        self._check_level_up(como)
        return self.repo.save(como)

    def _check_level_up(self, como: Como):
        """레벨업 로직"""
        thresholds = [10]
        inc = 15
        for i in range(2, 50):
            thresholds.append(thresholds[-1] + inc)
            inc += 5

        while (
            como.level < len(thresholds)
            and como.experience >= thresholds[como.level - 1]
        ):
            como.level += 1
