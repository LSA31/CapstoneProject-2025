from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from datetime import datetime, timezone
from enum import Enum

from google.cloud import storage
from google.oauth2 import service_account
from datetime import timedelta
import uuid
import os

from common.context_vars import user_context
from como.application.como_service import ComoService
from diary.application.diary_service import DiaryService
from como.infra.ai_ws_client import AIWebSocketClient
from containers import Container

router = APIRouter(prefix="/como", tags=["como"])


class ComoCreateRequest(BaseModel):
    device_id: str
    name: str


class AppEvent(str, Enum):
    PLAY = "PLAY"
    FEED = "FEED"
    WALK_START = "WALK_START"
    WALK_STOP = "WALK_STOP"


class AppEventRequest(BaseModel):
    owner_id: str
    event_type: AppEvent


class DialogRequest(BaseModel):
    owner_id: str
    device_id: str
    user_text: str
    assistant_text: str


@router.post("")
@inject
def create_como(
    req: ComoCreateRequest,
    service: ComoService = Depends(Provide[Container.como_service]),
):
    current = user_context.get()
    if current == "Anonymous":
        raise HTTPException(status_code=401, detail="Unauthorized")

    como = service.create(
        owner_id=current.uid,
        device_id=req.device_id,
        name=req.name,
    )
    return como.__dict__


@router.get("")
@inject
def get_como(
    service: ComoService = Depends(Provide[Container.como_service]),
):
    current = user_context.get()
    if current == "Anonymous":
        raise HTTPException(status_code=401, detail="Unauthorized")

    como = service.get(current.uid)
    if not como:
        raise HTTPException(status_code=404, detail="Como not found")

    return como.__dict__


@router.post("/audio")
@inject
async def upload_como_audio(
    device_id: str = Form(...),
    file: UploadFile = File(...),
    como_service: ComoService = Depends(Provide[Container.como_service]),
    diary_service: DiaryService = Depends(Provide[Container.diary_service]),
    ai_client: AIWebSocketClient = Depends(Provide[Container.ai_ws_client]),
):
    # deviceId → ownerId(userId) 찾기
    como = como_service.repo.get_by_device_id(device_id)
    if not como:
        raise HTTPException(status_code=404, detail="Device not found")
    owner_id = como.owner_id

    creds_path = os.getenv("FIREBASE_CREDENTIALS")
    if not creds_path:
        raise HTTPException(status_code=500, detail="FIREBASE_CREDENTIALS not set")

    storage_client = storage.Client.from_service_account_json(creds_path)
    bucket_name = os.getenv("FIREBASE_STORAGE_BUCKET")
    if not bucket_name:
        raise HTTPException(status_code=500, detail="FIREBASE_STORAGE_BUCKET not set")
    bucket = storage_client.bucket(bucket_name)

    blob_path = f"voices/{uuid.uuid4()}-{file.filename}"
    blob = bucket.blob(blob_path)

    blob.upload_from_file(
        file.file, content_type=file.content_type or "application/octet-stream"
    )

    blob.patch()

    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=36),
        method="GET",
    )

    diary = diary_service.create(
        author_id=owner_id,
        content="",
        advice=None,
        audio_url=[signed_url],
        emo_tag=[],
    )

    await ai_client.send_event(
        {
            "diaryId": diary.diary_id,
            "audioUrl": signed_url,
        }
    )

    return diary.__dict__


@router.post("/event")
@inject
def handle_app_event(
    req: AppEventRequest,
    service: ComoService = Depends(Provide[Container.como_service]),
):
    result = service.process_app_event(req.owner_id, req.event_type)

    if isinstance(result, dict) and "error" in result:
        return result  # 에러 그대로 전달

    como = result

    return {
        "owner_id": como.owner_id,
        "experience": como.experience,
        "level": como.level,
        "state": como.state.value,
        "was_hungry": getattr(como, "was_hungry", False),
    }

@router.post("/dialog")
@inject
def save_dialog(
    req: DialogRequest,
    service: DiaryService = Depends(Provide[Container.diary_service]),
):
    """AI 대화 로그를 Diary 컬렉션의 dialog 필드에 누적 저장"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [
        f"user: {req.user_text}",
        f"assistant: {req.assistant_text}",
    ]
    service.append_dialog(req.owner_id, today, lines)
    return {"status": "saved", "date": today, "lines_added": len(lines)}
