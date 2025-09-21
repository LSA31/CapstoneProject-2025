from abc import ABC, abstractmethod


class AuthService(ABC):
    @abstractmethod
    def create_user(self, email: str, password: str, display_name: str) -> str:
        """유저를 생성하고 uid 반환"""
        pass

    @abstractmethod
    def verify_token(self, id_token: str) -> str:
        """토큰 검증 후 uid 반환"""
        pass
