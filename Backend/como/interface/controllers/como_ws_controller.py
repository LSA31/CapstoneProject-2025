from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from dependency_injector.wiring import inject, Provide
from containers import Container
from como.application.como_service import ComoService
from common.logger import logger

router = APIRouter(prefix="/ws", tags=["como-ws"])


@router.websocket("/hardware/{owner_id}")
@inject
async def hardware_ws(
    websocket: WebSocket,
    owner_id: str,
    service: ComoService = Depends(Provide[Container.como_service]),
):
    await websocket.accept()
    logger.info(f"하드웨어 연결됨 owner_id={owner_id}")

    try:
        while True:
            data = await websocket.receive_json()
            # 예: {"deviceId": "abc123"}
            device_id = data.get("deviceId")

            if not device_id:
                await websocket.send_json({"error": "deviceId required"})
                continue

            # Firestore에 Como 문서 저장 (state, level 등은 기본값)
            como = service.create(
                owner_id=owner_id,
                name="Unknown",  # 프론트에서 추후 업데이트
                state="BASIC",
            )
            como.device_id = device_id
            service.repo.save(como)

            logger.info(
                f"owner_id={owner_id}, device_id={device_id} Firestore에 등록됨"
            )
            await websocket.send_json({"status": "ok", "deviceId": device_id})

    except WebSocketDisconnect:
        logger.warning(f"하드웨어 연결 끊김 owner_id={owner_id}")
