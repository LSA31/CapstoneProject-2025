from config import get_settings
from fastapi import HTTPException
import io, mimetypes, requests
from urllib.parse import urlparse, unquote

from openai import OpenAI

settings = get_settings()
client = OpenAI(
    api_key=settings.openai_api_key
)


async def fetch_audio(audio_url: str) -> tuple[bytes, str]:
    try:
        response = requests.get(audio_url, timeout=15)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError("오디오 파일을 내려받지 못했습니다") from exc

    disposition = response.headers.get("Content-Disposition", "")
    filename = ""
    if "filename=" in disposition:
        filename = disposition.split("filename=")[-1].strip('"')

    if not filename:
        path = urlparse(audio_url).path
        filename = unquote(path.rsplit("/", 1)[-1]) or "audio"

    if "." not in filename:
        mime = response.headers.get("Content-Type", "").split(";")[0]
        ext = mimetypes.guess_extension(mime) if mime else None
        filename = f"{filename}{ext or '.webm'}"

    return response.content, filename


async def speech_to_text(audio_bytes: bytes, filename: str) -> str:
    audio_buffer = io.BytesIO(audio_bytes)
    audio_buffer.name = filename
    try:
        result = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_buffer
        )
        return result.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT에서 문제가 발생했습니다: {e}")
    

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