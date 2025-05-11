from ai.application.summay_service import create_summary_diary
from ai.application.voice_service import get_response, speech_to_text
from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

app = FastAPI()


class VoiceResponse(BaseModel):
    transcript: str
    response: str
    
    
@app.post("/voice")
async def chat_voice(audio: UploadFile = File(..., description="WAV/MP3 file")) -> VoiceResponse:
    transcript = await speech_to_text(audio)
    response = await get_response(transcript)
    return VoiceResponse(transcript=transcript, response=response)


class ChattingRequest(BaseModel):
    chats: str
    
    
class SummaryDiaryResponse(BaseModel):
    diary: str


@app.post("/summary")
async def get_summary_diary(request: ChattingRequest) -> SummaryDiaryResponse:
    response = await create_summary_diary(request.chats)
    return SummaryDiaryResponse(diary=response)