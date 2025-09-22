import os
from typing import Optional

from google.cloud import firestore
from google.oauth2 import service_account

from user.domain.repository.user_repo import UserRepository
from user.domain.user import User


class FirebaseUserRepository(UserRepository):
    def __init__(self):
        cred_path = os.getenv("FIREBASE_CREDENTIALS")  # .env에서 불러오기
        if not cred_path:
            raise RuntimeError("FIREBASE_CREDENTIALS env var not set")
        credentials = service_account.Credentials.from_service_account_file(cred_path)
        self.db = firestore.Client(credentials=credentials)
        self.collection = self.db.collection("user")

    def save(self, user: User) -> User:
        doc_ref = self.collection.document(user.user_id)
        doc_ref.set(
            {
                "userId": user.user_id,
                "name": user.name,
                "email": user.email,
                "createdAt": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
        return user

    def get(self, user_id: str) -> Optional[User]:
        doc = self.collection.document(user_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        return User(
            user_id=data["userId"],
            name=data["name"],
            email=data["email"],
            created_at=data.get("createdAt"),
        )

    def find_by_email(self, email: str) -> Optional[User]:
        query = self.collection.where("email", "==", email).limit(1).get()
        if not query:
            return None
        data = query[0].to_dict()
        return User(
            user_id=data["userId"],
            name=data["name"],
            email=data["email"],
            created_at=data.get("createdAt"),
        )
