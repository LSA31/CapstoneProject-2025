import os

from openai import OpenAI
import asyncio
from datetime import datetime
from dotenv import load_dotenv
from typing import Any

import httpx
import json


load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

# Configuration for remote server
BASE_URL = "http://3.37.114.206:8080"
# test account provided by the user request
_LOGIN_PAYLOAD = {
    "email": "como_test@test.com",
    "password": "como1234"
}

# in-memory token cache for this run
_TOKEN: str | None = None

async def create_summary_diary(content: str) -> str:
    system_prompt = (
        "당신은 주어진 대화를 받아, 먼저 2~3문장으로 핵심만 간결하게 요약해 일기 형식으로 작성하는 AI 비서입니다."
        "일기에는 기분이나 감정도 자연스럽게 담아주세요."
        "말투는 ~였다와 같이 사용자 입장에서 작성해주세요."
    )
    
    reply = ""
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
    
    reply = ""
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
        '태그는 ["태그1", "태그2", "태그3"] 형식으로 작성해주세요.'
        "태그 중 하나는 꼭 감정 표현과 관련된 단어로 작성해주세요."
    )
    
    reply = ""
    try:
        completion = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": content}
            ]
        )
        reply = completion.choices[0].message.content.strip()
        return json.loads(reply)
    except Exception as e:
        print(f"GPT 응답 생성 중 오류가 발생했습니다: {e}")
    return reply

async def _extract_token_from_response(data: dict[str, Any]) -> str | None:
    return data['id_token']


async def login() -> str:
    """Authenticate to the remote server and return a Bearer token.

    This will try POST {BASE_URL}/user/login with the fixed test credentials.
    The function is tolerant to a few common JSON shapes for the returned token.
    """
    global _TOKEN
    if _TOKEN:
        return _TOKEN

    login_url = f"{BASE_URL}/users/login"
    async with httpx.AsyncClient() as client_http:
        try:
            resp = await client_http.post(login_url, json=_LOGIN_PAYLOAD, timeout=10.0)
        except Exception as e:
            raise RuntimeError(f"로그인 요청 실패: {e}")

    if resp.status_code != 200:
        raise RuntimeError(f"로그인 실패: {resp.status_code} - {resp.text}")

    data = {}
    try:
        data = resp.json()
    except Exception:
        raise RuntimeError("로그인 응답이 JSON이 아닙니다")

    token = await _extract_token_from_response(data)
    if not token:
        raise RuntimeError(f"토큰 파싱 실패: {data}")

    _TOKEN = token
    return _TOKEN


async def get_diary(today: str) -> dict[str, Any] | None:
    """GET /diaries/today?date=YYYY-MM-DD and return the diary entry (raw JSON object).

    Expects the server to accept a query param `date`.
    """
    token = await login()
    url = f"{BASE_URL}/diaries"
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client_http:
        try:
            resp = await client_http.get(url, params={"date": today}, headers=headers, timeout=15.0)
        except Exception as e:
            print(f"다이어리 목록 요청 실패: {e}")
            return []

    if resp.status_code != 200:
        print(f"다이어리 목록 불러오기 실패: {resp.status_code} - {resp.text}")
        return []

    data = {}
    for res in resp.json():
        if res.get("date") == today:
            return res

    # unknown shape
    print("다이어리 목록 응답이 예상 형식이 아닙니다", data)
    return []


async def post_diary(content: str, advice: str, emo_tag: list[str]) -> bool:
    """POST /diaries with the required payload.

    Body:
    {
      "content": "string",
      "advice": "string",
      "audio_url": [],
      "emo_tag": []
    }
    """
    token = await login()
    url = f"{BASE_URL}/diaries"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "content": content,
        "advice": advice,
        "audio_url": [],
        "emo_tag": emo_tag or []
    }
    async with httpx.AsyncClient() as client_http:
        try:
            print("Posting payload to server:", json.dumps(payload, ensure_ascii=False))
            resp = await client_http.post(url, json=payload, headers=headers, timeout=15.0)
        except Exception as e:
            print(f"다이어리 생성 요청 실패: {e}")
            return False

    # Print response status and body for debugging persistence issues
    print(f"POST {url} -> status: {resp.status_code}")
    # try to print JSON body if possible, otherwise raw text
    try:
        resp_json = resp.json()
        print("Response JSON:", json.dumps(resp_json, ensure_ascii=False))
    except Exception:
        print("Response text:", resp.text)

    if resp.status_code not in (200, 201):
        print(f"다이어리 생성 실패: {resp.status_code} - {resp.text}")
        return False

    return True

async def create_diary() -> None:
    today = datetime.now().strftime("%Y-%m-%d")
    diary = await get_diary(today)
    # source_text: prefer 'dialog' column, fallback to existing 'content'
    if not diary:
        print("오늘 다이어리가 없습니다.")
        return

    # dialog may be a list of messages -> join their 'content' fields
    dialog = diary.get("dialog") or diary.get("content") or ""
    if isinstance(dialog, list):
        parts = [msg.get("content", "") for msg in dialog if isinstance(msg, dict) and msg.get("content")]
        source_text = "\n".join(parts)
    else:
        source_text = str(dialog)

    if not source_text or not source_text.strip():
        print("dialog/내용이 비어있어 요약할 텍스트가 없습니다.")
        return

    print("source_text (truncated 500 chars):", source_text[:500])

    summary_diary = await create_summary_diary(source_text)
    print("summary_diary:", summary_diary)

    diary_answer = await create_diary_answer(summary_diary)
    print("diary_answer:", diary_answer)

    diary_tags = await create_diary_tags(summary_diary)
    print("diary_tags:", diary_tags)

    # ensure tags is a list
    if not isinstance(diary_tags, list):
        diary_tags = [str(diary_tags)] if diary_tags else []

    ok = await post_diary(summary_diary, diary_answer, diary_tags)
    if ok:
        # try to print useful id fields from fetched diary (may differ by backend)
        id_field = diary.get('id') or diary.get('diary_id') or diary.get('user_id') or diary.get('author_id')
        print(f"다이어리 생성 성공: {id_field}")
    else:
        id_field = diary.get('id') or diary.get('diary_id') or diary.get('user_id') or diary.get('author_id')
        print(f"다이어리 생성 실패: {id_field}")


if __name__ == "__main__":
    asyncio.run(create_diary())