from dataclasses import dataclass
from enum import Enum
from datetime import datetime


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
    state: ComoState = ComoState.BASIC
