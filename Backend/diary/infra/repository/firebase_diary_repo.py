import os
from google.cloud import firestore
from google.oauth2 import service_account
from diary.domain.diary import Diary
from diary.domain.repository.diary_repo import DiaryRepository
from typing import Optional, List
from datetime import datetime


class FirebaseDiaryRepository(DiaryRepository):
    def __init__(self):
        cred_path = os.getenv("FIREBASE_CREDENTIALS")
        if not cred_path:
            raise RuntimeError("FIREBASE_CREDENTIALS env var not set")
        credentials = service_account.Credentials.from_service_account_file(cred_path)
        self.db = firestore.Client(credentials=credentials)

    def _collection(self, author_id: str):
        return self.db.collection("users").document(author_id).collection("diaries")

    def save(self, diary: Diary) -> Diary:
        self._collection(diary.author_id).document(diary.diary_id).set(
            {
                "diaryId": diary.diary_id,
                "authorId": diary.author_id,
                "content": diary.content,
                "advice": diary.advice,
                "audioUrl": diary.audio_url,
                "emoTag": diary.emo_tag,
                "createdAt": diary.created_at.isoformat(),
                "date": diary.date,
            }
        )
        return diary

    def get(self, author_id: str, diary_id: str) -> Optional[Diary]:
        doc = self._collection(author_id).document(diary_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        return Diary(
            diary_id=data["diaryId"],
            author_id=data["authorId"],
            content=data["content"],
            advice=data.get("advice"),
            audio_url=data.get("audioUrl"),
            emo_tag=data.get("emoTag", []),
            created_at=datetime.fromisoformat(data["createdAt"]),
        )

    def list(self, author_id: str) -> List[Diary]:
        docs = self._collection(author_id).stream()
        return [
            Diary(
                diary_id=doc.id,
                author_id=author_id,
                content=data["content"],
                advice=data.get("advice"),
                audio_url=data.get("audioUrl"),
                emo_tag=data.get("emoTag", []),
                created_at=datetime.fromisoformat(data["createdAt"]),
            )
            for doc in docs
            if (data := doc.to_dict())
        ]

    def delete(self, author_id: str, diary_id: str) -> None:
        self._collection(author_id).document(diary_id).delete()
