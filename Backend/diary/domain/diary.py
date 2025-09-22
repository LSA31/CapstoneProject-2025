from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Diary:
    diary_id: str
    author_id: str
    content: str
    advice: Optional[str]
    audio_url: Optional[str]
    emo_tag: list[str]
    created_at: datetime
    date: str
