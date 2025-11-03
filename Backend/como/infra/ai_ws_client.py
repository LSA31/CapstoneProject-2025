import asyncio
import json
import websockets
import os


class AIWebSocketClient:
    def __init__(self, url: str | None = None):
        self.url = url or os.getenv("AI_WS_URL", "ws://localhost:8000/ws")
        self.conn = None

    async def is_closed(self):
        """websockets 버전 차이를 흡수"""
        if not self.conn:
            return True
        try:
            # 새 버전에서는 async 속성임
            closed = self.conn.closed
            if asyncio.iscoroutine(closed):
                closed = await closed
            return closed
        except Exception:
            return True

    async def connect(self):
        if not self.conn or await self.is_closed():
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
            print("[AI WS] Connection closed, retrying...")
            self.conn = None
            await asyncio.sleep(1)
            await self.send_event(data)
        except Exception as e:
            print(f"[AI WS] send_event 실패: {e}")
