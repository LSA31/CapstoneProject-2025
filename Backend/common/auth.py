from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status
from firebase_admin import auth
from dataclasses import dataclass

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/users/login", scheme_name="firebase_auth"
)


@dataclass
class CurrentUser:
    uid: str
    email: str


def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    try:
        decoded = auth.verify_id_token(token)
        return CurrentUser(
            uid=decoded.get("uid"),
            email=decoded.get("email"),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase ID token",
        )
