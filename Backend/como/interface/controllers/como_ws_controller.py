from dependency_injector.wiring import Provide, inject
from pydantic import BaseModel
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from enum import Enum

from common.logger import logger
from como.application.como_service import ComoService
from containers import Container

router = APIRouter(prefix="/ws", tags=["como-ws"])


class HardwareEvent(str, Enum):
    START = "START"
    STOP = "STOP"
    TALK = "TALK"
    TALK_STOP = "TALK_STOP"


class SendEventRequest(BaseModel):
    device_id: str
    event: HardwareEvent


# 연결된 하드웨어 클라이언트 저장소 (deviceId -> WebSocket)
connected_clients = {}


@router.websocket("/hardware")
@inject
async def hardware_ws(
    websocket: WebSocket,
    service: ComoService = Depends(Provide[Container.como_service]),
):
    await websocket.accept()
    logger.info("하드웨어 연결됨")

    try:
        while True:
            data = await websocket.receive_json()
            device_id = data.get("deviceId")
            event_type = data.get("event")  # "TOUCH" / "TALK"

            if not device_id or not event_type:
                await websocket.send_json({"error": "deviceId and event required"})
                continue

            # 이벤트 처리
            como = service.process_event(device_id, event_type)

            if not como:
                await websocket.send_json({"error": "device not found"})
                continue

            logger.info(f"device_id={device_id}, event={event_type} 처리됨")
            await websocket.send_json(
                {
                    "status": "ok",
                    "event": event_type,
                }
            )

    except WebSocketDisconnect:
        logger.warning("하드웨어 연결 끊김")

        for k, v in list(connected_clients.items()):
            if v == websocket:
                del connected_clients[k]


# 서버에서 하드웨어로 이벤트 push (REST API 엔드포인트)
# 프론트가 바로 사용가능
@router.post("/send")
async def send_event(req: SendEventRequest):
    websocket = connected_clients.get(req.device_id)
    if websocket:
        try:
            await websocket.send_json({"event": req.event, "fromServer": True})
            logger.info(f"서버 → {req.device_id} 로 이벤트 전송: {req.event}")
            return {"status": "sent", "deviceId": req.device_id, "event": req.event}
        except Exception as e:
            logger.error(f"전송 실패: {e}")
            return {"error": "send failed", "detail": str(e)}
    else:
        return {"error": "device not connected"}
