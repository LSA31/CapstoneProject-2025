from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel

app = FastAPI()


@app.post("/voice")
async def chat_voice(audio: UploadFile = File(..., description="WAV/MP3 file")):
    return audio.filename


class ChattingRequest(BaseModel):
    chats: str
    

@app.post("/summary")
def create_summary_diary(request: ChattingRequest) -> str:
    return request.chats