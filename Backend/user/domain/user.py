from dataclasses import dataclass
from datetime import datetime


@dataclass
class User:
    user_id: str
    name: str
    email: str
    created_at: datetime | None
    password: str | None = None  # 사실상 안 쓰지만 Auth 동기화용
