import uuid
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
        audio_url: str | None,
        emo_tag: list[str],
    ) -> Diary:
        diary = Diary(
            diary_id=str(uuid.uuid4()),
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
