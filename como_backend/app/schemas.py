# Pydantic schema
# 데이터베이스의 테이블 구조 정의
# 데이터를 검증하고 파시앟는데 사용됌
# ORM과 Pydantic 스키마는 다른 역햘을 가지고 있음. 따라서, 
# 이 두개의 모델은 변환을 해주어야 함. 
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

# 회원가입 스키마
class UserCreate(BaseModel):
    email: str
    password: Optional[str] = None 
    name: str
    intimacy: Optional[int] = 0
    level: Optional[int] = 1
    nickname : str = "como"
    
# 유저 정보 반환값
class UserResponse(UserCreate):
    id: int
    email: str
    name: str
    intimacy: int
    level: int
    nickname: str

    class Config:
        orm_mode = True

# 닉네임 업데이트
class NicknameUpdate(BaseModel):
    nickname: str

# diary 생성 ( 생성일 자동 생성 )
class DiaryCreate(BaseModel):
    content: str
    
# diary 조회     
class DiaryResponse(BaseModel):
    id: int
    content: str
    created_at: datetime

    class Config:
        orm_mode = True

# 유저의 다이어리 조회
class UserWithDiaries(UserResponse):
    diaries: List[DiaryResponse] = Field(default_factory=list)

    class Config:
        orm_mode = True
        
# 어플 로그인
class AppSignIn(BaseModel):
    email: str
    password: str

# wifi 로그인
