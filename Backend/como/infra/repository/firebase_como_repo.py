import os
from typing import Optional

from google.cloud import firestore
from google.oauth2 import service_account

from como.domain.como import Como
from como.domain.repository.como_repo import ComoRepository


class FirebaseComoRepository(ComoRepository):
    def __init__(self):
        cred_path = os.getenv("FIREBASE_CREDENTIALS")
        if not cred_path:
            raise RuntimeError("FIREBASE_CREDENTIALS env var not set")
        credentials = service_account.Credentials.from_service_account_file(cred_path)
        self.db = firestore.Client(credentials=credentials)

    def _collection(self, owner_id: str):
        return self.db.collection("users").document(owner_id).collection("comos")

    def save(self, como: Como) -> Como:
        self._collection(como.owner_id).document(como.device_id).set(
            {
                "deviceId": como.device_id,
                "ownerId": como.owner_id,
                "name": como.name,
                "state": como.state,
                "level": como.level,
                "experience": como.experience,
                "feeding_count_today": como.feeding_count_today,
                "last_connected_at": como.last_connected_at,
                "last_touch_at": getattr(como, "last_touch_at", None),
                "last_talk_at": getattr(como, "last_talk_at", None),
            },
            merge=True,
        )
        return como

    def get_by_device_id(self, device_id: str) -> Optional[Como]:
        users_ref = self.db.collection("users").stream()

        for user_doc in users_ref:
            comos_ref = (
                user_doc.reference.collection("comos")
                .where("deviceId", "==", device_id)
                .limit(1)
                .stream()
            )
            for doc in comos_ref:
                data = doc.to_dict()
                return Como(
                    device_id=data["deviceId"],
                    owner_id=data["ownerId"],
                    name=data["name"],
                    state=data["state"],
                    level=data["level"],
                    experience=data["experience"],
                    feeding_count_today=data["feeding_count_today"],
                    last_connected_at=data.get("last_connected_at"),
                    last_touch_at=data.get("last_touch_at"),
                    last_talk_at=data.get("last_talk_at"),
                )
        return None

    def get_by_owner(self, owner_id: str) -> Optional[Como]:
        docs = self._collection(owner_id).limit(1).stream()
        for doc in docs:
            data = doc.to_dict()
            return Como(
                device_id=data["deviceId"],
                owner_id=data["ownerId"],
                name=data["name"],
                state=data["state"],
                level=data["level"],
                experience=data["experience"],
                feeding_count_today=data["feeding_count_today"],
                last_connected_at=data["last_connected_at"],
                last_touch_at=data.get("last_touch_at"),
                last_talk_at=data.get("last_talk_at"),
            )
        return None

    def delete_by_owner(self, owner_id: str) -> None:
        docs = self._collection(owner_id).stream()
        for doc in docs:
            doc.reference.delete()
