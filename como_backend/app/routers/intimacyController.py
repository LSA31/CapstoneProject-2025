
from fastapi import FastAPI, APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import app.models as models, app.schemas as schemas
from app.database import get_db

app = FastAPI()

# 라우터 설정 
router = APIRouter(
    prefix = "/api/intimacy", 
    tags = ["intimacy"],
    responses={404 : {"description": "Not found"}},
)

# 앱 친밀도 (놀아주기/ 밥주기)
@router.put("/app/{xp}/{user_id}", response_model=schemas.UserResponse)  # response_model은 실제 스키마로 변경하세요
def update_intimacy_app(user_id: int, xp:int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # intimacy 증가 (기존 intimacy가 None일 경우 0으로 처리)
    user.intimacy = (user.intimacy or 0) + xp
    
    db.commit()
    db.refresh(user)
    return user


__all__ = ["router"]