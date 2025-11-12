from datetime import datetime, timedelta, timezone
from typing import Optional, Union

from como.domain.como import Como, ComoState
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
            last_connected_at=datetime.now(timezone.utc),
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
            return {"error": "Como not found"}

        now = datetime.now(timezone.utc)

        if event_type == "TOUCH":
            como.experience += 2
            como.last_touch_at = now
        elif event_type == "TALK":
            como.experience += 2
            como.last_talk_at = now

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

    # 앱 이벤트 처리
    def process_app_event(self, owner_id: str, event_type: str) -> Union[Como, dict]:
        como = self.repo.get_by_owner(owner_id)
        if not como:
            return None

        now = datetime.now(timezone.utc)
        previous_state = como.state
        was_hungry = previous_state == ComoState.HUNGRY

        if event_type in ("PLAY", "FEED"):
            if event_type == "FEED" and como.feeding_count_today < 3:
                como.experience += 5
                como.feeding_count_today += 1
                como.last_feed_at = now
            elif event_type == "PLAY":
                como.experience += 1
                como.last_play_at = now

            como.state = ComoState.HAPPY
            self._check_level_up(como)

            # 일시적으로 HAPPY 상태 응답용으로 내려보내기
            response_como = self.repo.save(como)
            response_como.was_hungry = was_hungry

            # 프론트에는 HAPPY 상태 전달 후 바로 복귀 상태로 DB에 저장
            como.state = (
                ComoState.BASIC
                if event_type == "FEED"
                else (
                    previous_state
                    if previous_state == ComoState.HUNGRY
                    else ComoState.BASIC
                )
            )
            # 이때 경험치, feeding_count_today 유지됨
            self.repo.save(como)

            return response_como

        elif event_type == "WALK_START":
            como.last_walk_at = now
            self.repo.save(como)
            return como

        # WALK_STOP → 산책 시간 검증
        elif event_type == "WALK_STOP":
            if not como.last_walk_at:
                return {"error": "WALK_START not initiated"}

            walk_duration = (now - como.last_walk_at).total_seconds()
            if walk_duration < 600:  # 10분 미만
                return {"error": "Walk duration too short"}

            # 10분 이상이면 산책 완료 처리
            como.experience += 5
            como.state = ComoState.WALK
            self._check_level_up(como)

            response_como = self.repo.save(como)

            # 복귀
            como.state = (
                previous_state
                if previous_state == ComoState.HUNGRY
                else ComoState.BASIC
            )
            self.repo.save(como)

            return response_como

        return {"error": f"Unsupported event type: {event_type}"}

    # 하루/주간 주기로 경험치 감소 적용
    def apply_decay(self, como: Como) -> Como:
        now = datetime.now(timezone.utc)

        # 하루 단위 체크
        if not como.last_talk_at or (now - como.last_talk_at) > timedelta(days=1):
            como.experience -= 5  # 하루에 대화 없으면 -5XP

        if not como.last_play_at or (now - como.last_play_at) > timedelta(days=1):
            como.experience -= 5  # 하루에 놀아주기 없으면 -5XP

        if not como.last_feed_at or (now - como.last_feed_at) > timedelta(days=1):
            como.experience -= 10  # 하루에 밥 안주면 -10XP
            como.feeding_count_today = 0

        # 주 단위 체크
        if not como.last_touch_at or (now - como.last_touch_at) > timedelta(days=7):
            como.experience -= 1  # 일주일간 터치 없으면 -1XP

        if not como.last_walk_at or (now - como.last_walk_at) > timedelta(days=7):
            como.experience -= 5  # 일주일간 산책 없으면 -5XP

        # 경험치는 최소 0 보장
        if como.experience < 0:
            como.experience = 0

        return self.repo.save(como)
