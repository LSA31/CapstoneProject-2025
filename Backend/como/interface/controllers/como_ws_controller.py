from dependency_injector.wiring import Provide, inject
from pydantic import BaseModel
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Request
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
    BACK = "BACK"


class SendEventRequest(BaseModel):
    device_id: str
    event: HardwareEvent


class AnswerRequest(BaseModel):
    device_id: str
    answer: str


# 연결된 하드웨어 클라이언트 저장소 (deviceId -> WebSocket)
connected_clients = {}


@router.websocket("/hardware")
async def hardware_ws(websocket: WebSocket):
    container = Container()
    service = container.como_service()

    await websocket.accept()
    logger.info("하드웨어 연결됨")

    try:
        while True:
            data = await websocket.receive_json()
            device_id = data.get("deviceId")
            event_type = data.get("event")  # "REGISTER", "TOUCH" / "TALK"

            if not device_id or not event_type:
                await websocket.send_json({"error": "deviceId and event required"})
                continue

            # REGISTER 이벤트인 경우: user_id를 찾아서 하드웨어로 전송
            if event_type == "REGISTER":
                como = service.repo.get_by_device_id(device_id)
                if como:
                    user_id = como.owner_id
                    connected_clients[device_id] = websocket
                    logger.info(f"REGISTER 성공: {device_id} → {user_id}")

                    await websocket.send_json(
                        {
                            "status": "ok",
                            "event": "REGISTER",
                            "userId": user_id,
                        }
                    )
                else:
                    logger.warning(f"REGISTER 실패: {device_id}에 해당하는 유저 없음")
                    await websocket.send_json(
                        {
                            "status": "error",
                            "message": "unknown device_id",
                        }
                    )
                continue

            # 그 외 이벤트(TALK, TOUCH 등)는 기존 로직 그대로 처리
            if device_id not in connected_clients:
                connected_clients[device_id] = websocket
                logger.info(f"하드웨어 등록됨: {device_id}")
                logger.info(f"현재 등록된 클라이언트: {list(connected_clients.keys())}")

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
async def send_event(req: SendEventRequest, request: Request):
    body = await request.body()
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


@router.post("/answer")
async def send_answer(req: AnswerRequest):
    """AI 서버에서 하드웨어로 음성 답변을 전송"""
    websocket = connected_clients.get(req.device_id)

    if websocket:
        try:
            # 하드웨어로 답변 전송
            await websocket.send_json(
                {
                    "event": "ANSWER",
                    "data": req.answer,
                    "fromServer": True,
                }
            )
            logger.info(f"AI 응답 전송 성공 → {req.device_id}: {req.answer}")
            return {"status": "sent", "device_id": req.device_id}
        except Exception as e:
            logger.error(f"AI 응답 전송 실패: {e}")
            return {"error": "send failed", "detail": str(e)}
    else:
        logger.warning(f"AI 응답 전송 실패: {req.device_id} 하드웨어 미연결 상태")
        return {"error": "device not connected"}
