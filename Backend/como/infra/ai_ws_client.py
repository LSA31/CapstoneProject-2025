import asyncio
import json
import websockets
import os


class AIWebSocketClient:
    def __init__(self, url: str | None = None):
        self.url = url or os.getenv("AI_WS_URL", "ws://localhost:8000/ws")
        self.conn: websockets.WebSocketClientProtocol | None = None

    async def connect(self):
        # 연결이 없거나 이미 닫힌 경우 새로 연결
        if not self.conn or self.conn.closed:
            try:
                self.conn = await websockets.connect(self.url)
                print(f"[AI WS] Connected to {self.url}")
            except Exception as e:
                print(f"[AI WS] Connection failed: {e}")
                self.conn = None

    async def send_event(self, data: dict):
        try:
            await self.connect()

            if not self.conn:
                print("[AI WS] No active connection, cannot send event")
                return

            await self.conn.send(json.dumps(data))
            print(f"[AI WS] Sent event: {data}")
        except websockets.ConnectionClosed:
            print("[AI WS] Connection was closed, retrying...")
            self.conn = None
            await asyncio.sleep(1)
            await self.send_event(data)
        except Exception as e:
            print(f"[AI WS] send_event 실패: {e}")
