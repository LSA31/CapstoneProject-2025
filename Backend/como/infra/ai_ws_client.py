import asyncio
import json
import websockets
import os


class AIWebSocketClient:
    def __init__(self, url: str | None = None):
        # 환경변수에서 불러오기, 없으면 기본값
        self.url = url or os.getenv("AI_WS_URL", "ws://localhost:8000/ws")
        self.conn = None

    async def connect(self):
        if not self.conn or self.conn.closed:
            self.conn = await websockets.connect(self.url)

    async def send_event(self, data: dict):
        try:
            await self.connect()
            await self.conn.send(json.dumps(data))
        except Exception as e:
            # 최소한의 예외 처리 (로깅 추가 가능)
            print(f"[AI WS] send_event 실패: {e}")
