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
def create_summary_diary(request: ChattingRequest) -> SummaryDiaryResponse:
    return request.chats