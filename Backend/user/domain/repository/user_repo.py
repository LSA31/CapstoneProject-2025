from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID
from user.domain.user import User


class UserRepository(ABC):
    @abstractmethod
    def get(self, user_id: str) -> Optional[User]:
        """user_id로 유저 조회"""
        raise NotImplementedError

    @abstractmethod
    def find_by_email(self, email: str) -> Optional[User]:
        """이메일로 유저 조회"""
        raise NotImplementedError

    @abstractmethod
    def save(self, user: User) -> User:
        """유저 저장"""
        raise NotImplementedError
