from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

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
