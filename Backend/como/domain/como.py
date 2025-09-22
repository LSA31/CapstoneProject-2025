from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional


class ComoState(str, Enum):
    BASIC = "BASIC"
    FEED = "FEED"
    WALK = "WALK"
    HUNGRY = "HUNGRY"


@dataclass
class Como:
    device_id: str
    owner_id: str
    name: str
    level: int
    experience: int
    feeding_count_today: int
    last_connected_at: datetime

    # 증가 로직에서 쓰는 필드
    last_touch_at: Optional[datetime] = None
    last_talk_at: Optional[datetime] = None

    # 감소 로직에서 새로 추가
    last_feed_at: Optional[datetime] = None  # 앱에서 밥 준 시간
    last_play_at: Optional[datetime] = None  # 앱에서 놀아준 시간
    last_walk_at: Optional[datetime] = None  # 앱에서 산책한 시간
    state: ComoState = ComoState.BASIC
