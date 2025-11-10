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
        # 강제 한국어 인식: language="ko"
        result = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_buffer,
            language="ko",
        )
        return result.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT에서 문제가 발생했습니다: {e}")
    
# 대화하기 기능 프롬프트 수정!!
async def get_response(request: str, persona: str | None = None) -> str:
    """Generate assistant reply. If persona=='como', prepend a system prompt
    that instructs the model to act as an AI pet dog named 'Como'."""
    try:
        messages = []
        if persona == "como":
            messages.append(
                {
                    "role": "system",
                    "content": (
                        "당신은 코모라는 이름의 친절한 AI 애완견입니다."
                        "사용자에게 친근하고 간결하게, 애정 어린 톤으로 대답하세요."
                        "존댓말로만 말해줘."
                        "이모지는 사용하지 말아줘."
                        "길어도 2~3문장으로만 답변해줘"
                    ),
                }
            )

        messages.append({"role": "user", "content": request})

        completion = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"GPT 응답 생성 중 오류가 발생했습니다: {e}"
        )
    return reply