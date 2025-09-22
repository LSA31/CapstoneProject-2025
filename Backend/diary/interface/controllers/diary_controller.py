from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from common.context_vars import user_context
from containers import Container
from diary.application.diary_service import DiaryService

router = APIRouter(prefix="/diaries", tags=["diaries"])


class DiaryCreateRequest(BaseModel):
    content: str
    advice: str | None = None
    audio_url: str | None = None
    emo_tag: list[str] = []
    date: str


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
        date=req.date,
    )
    return diary.__dict__


@router.get("")
@inject
def list_diaries(
    service: DiaryService = Depends(Provide[Container.diary_service]),
):
    current = user_context.get()
    if current == "Anonymous":
        raise HTTPException(status_code=401, detail="Unauthorized")
    diaries = service.list(current.uid)
    return [d.__dict__ for d in diaries]
