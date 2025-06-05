from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from app.websocket_manager import ws_manager
from app.database import SessionLocal, engine, Base
from app.routers import authController
from app.routers import diaryController
from app.routers import intimacyController
from app.routers import socketController

app = FastAPI()
# 모듈화된 컨트롤러를 main에서 호출 
# 일단 회원가입, 로그인 먼저저
app.include_router(authController.router)
app.include_router(diaryController.router)
app.include_router(intimacyController.router)
app.include_router(socketController.router)

# 테이블 생성
Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"Hello" : "World"}
