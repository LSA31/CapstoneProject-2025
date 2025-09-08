import firebase_admin
from firebase_admin import auth, credentials


class FirebaseAuthService:
    def __init__(self, cred_path: str):
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)

    def create_user(self, email: str, password: str, display_name: str) -> str:
        user = auth.create_user(
            email=email,
            password=password,
            display_name=display_name,
        )
        return user.uid  # Firebase UID 반환

    def verify_token(self, id_token: str) -> str:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token["uid"]
