from typing import Optional

from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from common.context_vars import user_context

# 추가
from common.logger import logger
from containers import Container
from user.application.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


class UserRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
@inject
def register_user(
    req: UserRegisterRequest,
    service: UserService = Depends(Provide[Container.user_service]),
):
    logger.info("회원가입 요청 시작")
    user = service.register(
        name=req.name,
        email=req.email,
        password=req.password,
    )
    logger.info(f"회원가입 성공 uid={user.user_id}")
    return {"message": "회원 가입이 완료되었습니다."}


@router.post("/login")
@inject
def login_user(
    req: UserLoginRequest,
    service: UserService = Depends(Provide[Container.user_service]),
):
    logger.info("로그인 요청 시작")
    id_token = service.login(email=req.email, password=req.password)
    if not id_token:
        logger.warning("로그인 실패")
        raise HTTPException(status_code=401, detail="Invalid credentials")

    logger.info(f"로그인 성공 email={req.email}")
    return {"id_token": id_token}


@router.get("/me")
@inject
def get_current_user(
    service: UserService = Depends(Provide[Container.user_service]),
):
    current = user_context.get()
    if not current or current == "Anonymous":
        logger.warning("인증되지 않은 요청 /me 접근")
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = service.get(current.uid)
    if not user:
        logger.warning(f"유저 정보 없음 uid={current.uid}")
        raise HTTPException(status_code=404, detail="User not found")

    logger.info(f"현재 유저 정보 반환 uid={user.user_id}")
    return user.__dict__


@router.delete("/me")
@inject
def delete_current_user(
    service: UserService = Depends(Provide[Container.user_service]),
):
    current = user_context.get()
    if not current or current == "Anonymous":
        logger.warning("인증되지 않은 요청 /me 삭제 시도")
        raise HTTPException(status_code=401, detail="Unauthorized")

    service.delete(current.uid)
    logger.info(f"회원탈퇴 완료 uid={current.uid}")
    return {"message": "회원 탈퇴가 완료되었습니다."}
