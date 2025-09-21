from datetime import datetime
from typing import Optional
from user.domain.user import User
from user.domain.repository.user_repo import UserRepository
from user.domain.repository.auth_service import AuthService


class UserService:
    def __init__(self, repo: UserRepository, auth_service: AuthService):
        self.repo = repo
        self.auth_service = auth_service

    def register(
        self,
        name: str,
        email: str,
        password: str,
    ) -> User:

        firebase_uid = self.auth_service.create_user(
            email=email,
            password=password,
            display_name=name,
        )

        now = datetime.utcnow()
        user = User(
            user_id=firebase_uid,  # Firebase UID 사용
            name=name,
            email=email,
            created_at=now,
        )
        return self.repo.save(user)

    def login(self, id_token: str) -> Optional[User]:
        # 프론트에서 넘긴 Firebase ID 토큰 검증
        uid = self.auth_service.verify_token(id_token)
        return self.repo.get(uid)

    def get(self, user_id: str) -> Optional[User]:
        if not self.repo:
            return None
        return self.repo.get(user_id)
