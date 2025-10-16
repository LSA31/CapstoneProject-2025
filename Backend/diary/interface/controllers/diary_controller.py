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
def list_diaries(
    date: str | None = None,
    service: DiaryService = Depends(Provide[Container.diary_service]),
):
    current = user_context.get()
    if current == "Anonymous":
        raise HTTPException(status_code=401, detail="Unauthorized")

    if date:  # 날짜가 들어오면 특정 날짜 다이어리 조회
        diary = service.find_by_date(current.uid, date)
        if not diary:
            raise HTTPException(status_code=404, detail="Diary not found for this date")
        return diary.__dict__

    # 날짜가 없으면 400 에러
    raise HTTPException(status_code=400, detail="Date query parameter is required")
