from config import get_settings
from fastapi import HTTPException, UploadFile
import io

from openai import OpenAI

settings = get_settings()
client = OpenAI(
    api_key=settings.openai_api_key
)


async def speech_to_text(audio: UploadFile) -> str:
    content = await audio.read()
    
    if not content:
        raise HTTPException(status_code=400, detail="오디오 파일이 비어있습니다")
    
    audio_file = io.BytesIO(content)
    audio_file.name = audio.filename
    
    try:
        result = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file
        )
        transcript = result.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT에서 문제가 발생했습니다: {e}")
    
    return transcript
    

async def get_response(request: str) -> str:
    try:
        completion = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": request}]
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"GPT 응답 생성 중 오류가 발생했습니다: {e}"
        )
    return reply