from ai.application.summay_service import create_summary_diary
from ai.application.voice_service import get_response, fetch_audio, speech_to_text
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI()

allowed_origins = [
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://3.37.114.206:8080",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VoiceRequest(BaseModel):
    diaryId: str
    audioUrl: str
    
class VoiceResponse(BaseModel):
    transcript: str
    response: str
    
    
@app.websocket("/ws/voice")
async def chat_voice(websocket: WebSocket):
    await websocket.accept()
    try:
        payload = await websocket.receive_json()
        audio_url = payload["audioUrl"]
        audio_bytes, filename = await fetch_audio(audio_url)
        transcript = await speech_to_text(audio_bytes, filename)
        response = await get_response(transcript)
        
        print(f"{transcript} -> {response}")
        requests.post(
            "http://3.37.114.206:8080/como/dialog",
            headers={"Authorization": f"Bearer {payload['userId']}"},  # Fixed quotes
            json={
                "device_id": "string",
                "user_text": transcript,
                "assistant_text": response
            }
        )
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        await websocket.send_json({"error": str(exc)})
    finally:
        print("WebSocket connection closed")
        await websocket.close()


class ChattingRequest(BaseModel):
    chats: str
    
    
class SummaryDiaryResponse(BaseModel):
    diary: str


@app.post("/summary")
async def get_summary_diary(request: ChattingRequest) -> SummaryDiaryResponse:
    response = await create_summary_diary(request.chats)
    return SummaryDiaryResponse(diary=response)