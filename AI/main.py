from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

app = FastAPI()


class VoiceResponse(BaseModel):
    voice: str
    
    
@app.post("/voice")
async def chat_voice(audio: UploadFile = File(..., description="WAV/MP3 file")) -> VoiceResponse:
    return audio.filename


class ChattingRequest(BaseModel):
    chats: str
    
    
class SummaryDiaryResponse(BaseModel):
    diary: str


@app.post("/summary")
def create_summary_diary(request: ChattingRequest) -> SummaryDiaryResponse:
    return request.chats