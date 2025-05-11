from config import get_settings

from fastapi import HTTPException
from openai import OpenAI

settings = get_settings()
client = OpenAI(
    api_key=settings.openai_api_key
)

async def create_summary_diary(content: str) -> str:
    system_prompt = (
        "당신은 주어진 대화를 받아, 먼저 2~3문장으로 핵심만 간결하게 요약해 일기 형식으로 작성하는 AI 비서입니다."
        "일기에는 기분이나 감정도 자연스럽게 담아주세요."
        "말투는 ~였다와 같이 사용자 입장에서 작성해주세요."
    )
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": content}
            ]
        )
        reply = completion.choices[0].message.content.strip()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"GPT 응답 생성 중 오류가 발생했습니다: {e}"
        )
    return reply

"""
Test Data: 
user: 안녕! 오늘 날씨가 어떤지 알려줄래? assistant: 안녕하세요! 오늘 서울은 맑고 기온은 22°C에서 27°C 사이입니다. user: 점심으로 뭐 먹으면 좋을까? assistant: 오늘 같은 날엔 시원한 콩국수나 비빔국수가 어울릴 것 같아요. user: 오후에 회의 자료 준비 다 했어? assistant: 네, 슬라이드와 회의 노트 모두 작성 완료했습니다. user: 고마워! 이제 다 끝난 것 같아. assistant: 도움이 되었다니 기뻐요. 더 필요하신 게 있으면 알려주세요!
"""