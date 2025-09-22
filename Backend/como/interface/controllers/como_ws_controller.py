from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from common.logger import logger
from como.application.como_service import ComoService
from containers import Container

router = APIRouter(prefix="/ws", tags=["como-ws"])


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
