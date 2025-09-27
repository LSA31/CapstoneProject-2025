import uuid
import ulid
from datetime import datetime
from typing import List, Optional

from diary.domain.diary import Diary
from diary.domain.repository.diary_repo import DiaryRepository


class DiaryService:
    def __init__(self, repo: DiaryRepository):
        self.repo = repo

    def create(
        self,
        author_id: str,
        content: str,
        advice: str | None,
        audio_url: list[str],
        emo_tag: list[str],
    ) -> Diary:
        today = datetime.utcnow().strftime("%Y-%m-%d")

        # 이미 오늘 다이어리가 있는지 확인
        existing = self.repo.find_by_date(author_id, today)
        if existing:
            # audio_url만 append해서 업데이트
            updated_audio = existing.audio_url + audio_url
            existing.audio_url = updated_audio
            return self.repo.save(existing)

        diary = Diary(
            diary_id=str(ulid.new()),
            author_id=author_id,
            content=content,
            advice=advice,
            audio_url=audio_url,
            emo_tag=emo_tag,
            created_at=datetime.utcnow(),
            date=datetime.utcnow().strftime("%Y-%m-%d"),
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
