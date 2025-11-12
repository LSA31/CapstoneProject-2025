import uuid
import ulid
from datetime import datetime, timezone
from typing import List, Optional

from diary.domain.diary import Diary
from diary.domain.repository.diary_repo import DiaryRepository


class DiaryService:
    def __init__(self, repo: DiaryRepository):
        self.repo = repo

    def create(
        self,
        author_id: str,
        content: Optional[str] = None,
        advice: Optional[str] = None,
        audio_url: Optional[list[str]] = None,
        emo_tag: Optional[list[str]] = None,
        date: Optional[str] = None,
    ) -> Diary:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # 이미 오늘 다이어리가 있는지 확인
        existing = self.repo.find_by_date(author_id, today)
        if existing:
            if content is not None:
                existing.content = content
            if advice is not None:
                existing.advice = advice
            if emo_tag:
                existing.emo_tag = emo_tag
            if audio_url:
                existing.audio_url += audio_url

            return self.repo.save(existing)

        diary = Diary(
            diary_id=str(ulid.new()),
            author_id=author_id,
            content=content,
            advice=advice,
            audio_url=audio_url,
            emo_tag=emo_tag,
            created_at=datetime.now(timezone.utc),
            date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        )
        return self.repo.save(diary)

    def get(self, author_id: str, diary_id: str) -> Optional[Diary]:
        return self.repo.get(author_id, diary_id)

    def list(self, author_id: str) -> List[Diary]:
        return self.repo.list(author_id)

    def delete(self, author_id: str, diary_id: str) -> None:
        self.repo.delete(author_id, diary_id)

    def find_by_date(self, author_id: str, date: str) -> Optional[Diary]:
        return self.repo.find_by_date(author_id, date)

    def append_dialog(
        self, author_id: str, date: str, user_text: str, assistant_text: str
    ):
        lines = [
            {"role": "user", "content": user_text},
            {"role": "assistant", "content": assistant_text},
        ]
        self.repo.append_dialog(author_id, date, lines)
