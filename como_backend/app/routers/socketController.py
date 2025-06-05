from app.websocket_manager import ws_manager
from fastapi import APIRouter, WebSocket, WebSocketDisconnect,Depends
from sqlalchemy.orm import Session
import app.models as models, app.schemas as schemas
from app.database import get_db

# 라우터 설정 
router = APIRouter(
    prefix = "/ws", 
    tags = ["ws"],
    responses={404 : {"description": "Not found"}},
)

@router.websocket("/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, db: Session = Depends(get_db)):
    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()

            if data == "login":
                # 로그인 로직 처리 (DB 등)
                await ws_manager.send_message(user_id, "📶 라즈베리파이 로그인 완료")

            elif data == "pet":
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if not user:
                    await ws_manager.send_message(user_id, "❌ User not found")
                    continue
                user.intimacy = (user.intimacy or 0) + 2
                db.commit()
                db.refresh(user)
                await ws_manager.send_message(user_id, f"🐾 교감 완료! 친밀도: {user.intimacy}")

            else:
                await ws_manager.send_message(user_id, f"❓ Unknown command: {data}")

    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)