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
    last_touch_at: Optional[datetime] = None
    last_talk_at: Optional[datetime] = None
    state: ComoState = ComoState.BASIC
