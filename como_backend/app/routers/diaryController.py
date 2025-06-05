
from fastapi import FastAPI, APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import app.models as models, app.schemas as schemas
from app.database import get_db

app = FastAPI()

# 라우터 설정 
router = APIRouter(
    prefix = "/api/diary", 
    tags = ["diary"],
    responses={404 : {"description": "Not found"}},
)

# 사용자 id를 경로에서 받아서 다이어리를 작성함. 
@router.post("/{user_id}", response_model=schemas.DiaryResponse)
def create_diary(user_id: int, diary: schemas.DiaryCreate, db: Session = Depends(get_db)):
    db_diary = models.Diary(**diary.dict(), user_id=user_id)
    db.add(db_diary)
    db.commit()
    db.refresh(db_diary)
    return db_diary


@router.get("/{user_id}", response_model=schemas.UserWithDiaries)
def get_user_with_diaries(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user  # Pydantic이 자동으로 diaries까지 직렬화


__all__ = ["router"]