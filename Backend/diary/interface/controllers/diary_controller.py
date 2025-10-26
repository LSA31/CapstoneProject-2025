from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone

from common.context_vars import user_context
from containers import Container
from diary.application.diary_service import DiaryService

router = APIRouter(prefix="/diaries", tags=["diaries"])


class DiaryCreateRequest(BaseModel):
    content: str
    advice: str | None = None
    audio_url: list[str] = []
    emo_tag: list[str] = []


@router.post("")
@inject
def create_diary(
    req: DiaryCreateRequest,
    service: DiaryService = Depends(Provide[Container.diary_service]),
):
    current = user_context.get()
    if current == "Anonymous":
        raise HTTPException(status_code=401, detail="Unauthorized")
    diary = service.create(
        author_id=current.uid,
        content=req.content,
        advice=req.advice,
        audio_url=req.audio_url,
        emo_tag=req.emo_tag,
    )
    return diary.__dict__


@router.get("")
@inject
def list_all_diaries(
    service: DiaryService = Depends(Provide[Container.diary_service]),
):
    current = user_context.get()
    if current == "Anonymous":
        raise HTTPException(status_code=401, detail="Unauthorized")

    diaries = service.list(current.uid)
    return [d.__dict__ for d in diaries]


@router.get("/today")
@inject
def get_today_diary(
    date: str | None = None,
    service: DiaryService = Depends(Provide[Container.diary_service]),
):
    current = user_context.get()
    if current == "Anonymous":
        raise HTTPException(status_code=401, detail="Unauthorized")

    # date 파라미터 없으면 오늘 날짜로 기본 설정
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    diary = service.find_by_date(current.uid, target_date)
    if not diary:
        raise HTTPException(status_code=404, detail="Diary not found for this date")

    return diary.__dict__
