#!/usr/bin/env python3
from gtts import gTTS
import os

# 🎙 테스트용 문장
text = "안녕하세요. 코모의 음성 출력 테스트입니다."

# 저장 경로
mp3_path = "/home/pi/adeept_picar-b2/web/test_tts_output.mp3"

try:
    print("🗣️ 음성 파일 생성 중...")
    tts = gTTS(text=text, lang="ko")
    tts.save(mp3_path)
    print(f"✅ 생성 완료: {mp3_path}")

    # 🔊 음량 설정 (확실히 들리게)
    os.system("amixer set Master 100% unmute >/dev/null 2>&1")
    os.system("amixer set PCM 100% unmute >/dev/null 2>&1")
    os.system("amixer set Speaker 100% unmute >/dev/null 2>&1")

    # 🎧 재생
    print("🔊 스피커로 재생합니다...")
    os.system(f"mpg123 {mp3_path}")

except Exception as e:
    print(f"❌ 오류 발생: {e}")
