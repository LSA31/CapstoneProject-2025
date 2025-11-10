import os
import ulid
from datetime import datetime, timezone
from typing import List, Optional

from google.cloud import firestore
from google.oauth2 import service_account

from diary.domain.diary import Diary
from diary.domain.repository.diary_repo import DiaryRepository


class FirebaseDiaryRepository(DiaryRepository):
    def __init__(self):
        cred_path = os.getenv("FIREBASE_CREDENTIALS")
        if not cred_path:
            raise RuntimeError("FIREBASE_CREDENTIALS env var not set")
        credentials = service_account.Credentials.from_service_account_file(cred_path)
        self.db = firestore.Client(credentials=credentials)

    def _collection(self, author_id: str):
        return self.db.collection("user").document(author_id).collection("diary")

    def save(self, diary: Diary) -> Diary:
        self._collection(diary.author_id).document(diary.diary_id).set(
            {
                "diaryId": diary.diary_id,
                "authorId": diary.author_id,
                "dialog": diary.dialog or [],
                "content": diary.content,
                "advice": diary.advice,
                "audioUrl": diary.audio_url,
                "emoTag": diary.emo_tag,
                "createdAt": diary.created_at.isoformat(),
                "date": diary.date,
            },
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
            dialog=data.get("dialog", []),
            content=data.get("content", ""),
            advice=data.get("advice"),
            audio_url=data.get("audioUrl", []),
            emo_tag=data.get("emoTag", []),
            created_at=datetime.fromisoformat(data["createdAt"]),
        )

    def list(self, author_id: str) -> List[Diary]:
        docs = self._collection(author_id).stream()
        return [
            Diary(
                diary_id=doc.id,
                author_id=author_id,
                dialog=data.get("dialog", []),
                content=data.get("content", ""),
                advice=data.get("advice"),
                audio_url=data.get("audioUrl", []),
                emo_tag=data.get("emoTag", []),
                created_at=datetime.fromisoformat(data["createdAt"]),
                date=data.get("date", ""),
            )
            for doc in docs
            if (data := doc.to_dict())
        ]

    def delete(self, author_id: str, diary_id: str) -> None:
        self._collection(author_id).document(diary_id).delete()

    def find_by_date(self, author_id: str, date: str) -> Optional[Diary]:
        docs = self._collection(author_id).where("date", "==", date).stream()

        for doc in docs:
            data = doc.to_dict()
            return Diary(
                diary_id=doc.id,
                author_id=author_id,
                dialog=data.get("dialog", []),
                content=data.get("content", ""),
                advice=data.get("advice"),
                audio_url=data.get("audioUrl", []),
                emo_tag=data.get("emoTag", []),
                created_at=datetime.fromisoformat(data["createdAt"]),
                date=data["date"],
            )

        return None

    def append_dialog(self, author_id: str, date: str, lines: List[str]):
        """Diary 문서의 dialog 필드에 한 턴(user+assistant)을 누적 저장"""
        existing = self.find_by_date(author_id, date)
        if existing:
            ref = self._collection(author_id).document(existing.diary_id)
        else:
            ref = self._collection(author_id).document(str(ulid.new()))

        # 문서가 없으면 새로 생성
        if not ref.get().exists:
            ref.set(
                {
                    "authorId": author_id,
                    "date": date,
                    "dialog": [],
                    "content": "",
                    "advice": None,
                    "audioUrl": [],
                    "emoTag": [],
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                }
            )

        # Firestore ArrayUnion으로 append
        ref.update({"dialog": firestore.ArrayUnion(lines)})
