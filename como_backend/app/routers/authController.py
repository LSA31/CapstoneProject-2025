from fastapi import FastAPI, APIRouter, Depends, HTTPException, Path, Body
from sqlalchemy.orm import Session
import app.models as models, app.schemas as schemas
from app.database import get_db


app = FastAPI()

# 라우터 설정 
router = APIRouter(
    prefix = "/api/auth", 
    tags = ["auth"],
    responses={404 : {"description": "Not found"}},
)

# 어플 로그인 
@router.post("/app/signin")
def appsignin(data: schemas.AppSignIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.password != data.password:
        raise HTTPException(status_code=401, detail="Incorrect password")

    return {
        "message": "Login successful",
        "user_id": user.id,
        "name": user.name,
        "nickname": user.nickname,
        "level" : user.level,
        "intimacy" : user.intimacy
    }
    
    
#회원가입
@router.post("/signup", response_model = schemas.UserResponse)
def singup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# 반려로봇 이름 변경
@router.put("/nickname/{user_id}")
def update_nickname( user_id: int = Path(...), data: schemas.NicknameUpdate = Body(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.nickname = data.nickname
    db.commit()
    
    return {"message": "Nickname updated"}

#로그아웃
@router.post("/logout")
def logout():
    return {}