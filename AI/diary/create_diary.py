from openai import OpenAI
import asyncio
from datetime import datetime
from dotenv import load_dotenv
import os

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter


load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
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
        print(f"GPT 응답 생성 중 오류가 발생했습니다: {e}")
    return reply


async def create_diary_answer(content: str) -> str:
    system_prompt = (
        "당신은 사용자의 일기를 받아, 사용자에게 답변을 하는 반려로봇 AI입니다."
        "사용자의 일기를 보고 감정을 생각하여 답변을 할 수 있도록 작성해주세요."
        "말투는 친구처럼 자연스럽게 작성해주세요."
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
        print(f"GPT 응답 생성 중 오류가 발생했습니다: {e}")
    return reply


async def create_diary_tags(content: str) -> list[str]:
    system_prompt = (
        "당신은 사용자의 일기를 받아, 일기에 대한 태그를 생성하는 AI입니다."
        "일기에 대한 태그는 2~3개 정도로 작성해주세요."
        "태그는 [태그1, 태그2, 태그3] 형식으로 작성해주세요."
        "태그 중 하나는 꼭 감정 표현과 관련된 단어로 작성해주세요."
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
        print(f"GPT 응답 생성 중 오류가 발생했습니다: {e}")
    return reply

_DB = None

def _init_firebase():
    global _DB
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_CREDENTIALS")
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    _DB = firestore.client()


_init_firebase()
_DIARIES_COL = "diary"

async def get_diary_list(today: str) -> list[dict[str, any]]:
    def _fetch():
        col = _DB.collection(_DIARIES_COL)
        query = col.where(filter=FieldFilter("created_at", "==", today))

        docs = query.stream()
        items: list[dict[str, any]] = []
        for doc in docs:
            data = doc.to_dict() or {}
            # 안전하게 기본 키만 보장하고, 나머지는 그대로 포함
            item = {
                "id": doc.id,
                "content": data.get("content", ""),
                "created_at": data.get("created_at"),
            }
            # 기타 필드도 유지
            for k, v in data.items():
                if k not in item:
                    item[k] = v
            items.append(item)
        return items

    return await asyncio.to_thread(_fetch)


async def update_diary(diary_id: str, diary: dict[str, any]) -> None:
    """
    Firestore 'diaries/<diary_id>' 에 diary 내용을 병합 업데이트합니다.
    기대 필드: summary(str), answer(str), tags(list[str]) 등
    기존 필드(content, created_at 등)는 유지됩니다.
    """

    def _update():
        doc_ref = _DB.collection(_DIARIES_COL).document(diary_id)
        # 병합 업데이트(merge=True): 없는 필드만 추가/기존은 덮어씀, 다른 필드는 유지
        doc_ref.set(diary, merge=True)

    await asyncio.to_thread(_update)

async def create_diary() -> None:
    today = datetime.now().strftime("%Y-%m-%d")
    diary_list = await get_diary_list(today)

    for diary in diary_list:
        summary_diary = await create_summary_diary(diary["content"])
        diary_answer = await create_diary_answer(summary_diary)
        diary_tags = await create_diary_tags(summary_diary)

        diary["summary"] = summary_diary
        diary["answer"] = diary_answer
        diary["tags"] = diary_tags

        print(diary)
        await update_diary(diary["id"], diary)


if __name__ == "__main__":
    asyncio.run(create_diary())