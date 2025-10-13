import os
import requests
import firebase_admin
from firebase_admin import auth, credentials

from user.domain.service.auth_service import AuthService


class FirebaseAuthService(AuthService):
    def __init__(self, cred_path: str):
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        self.api_key = os.getenv("FIREBASE_API_KEY")

    def create_user(self, email: str, password: str, display_name: str) -> str:
        user = auth.create_user(
            email=email,
            password=password,
            display_name=display_name,
        )
        return user.uid

    def verify_token(self, id_token: str) -> str:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token["uid"]

    def verify_user(self, email: str, password: str) -> str | None:
        """
        Firebase REST API 호출해서 이메일/비밀번호 로그인 후 id_token 반환
        """
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={self.api_key}"
        payload = {"email": email, "password": password, "returnSecureToken": True}
        res = requests.post(url, json=payload)

        if res.status_code == 200:
            return res.json()["idToken"]
        return None

    def delete_user(self, user_id: str) -> None:
        auth.delete_user(user_id)
