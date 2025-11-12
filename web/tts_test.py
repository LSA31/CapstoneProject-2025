from gtts import gTTS
import os

text = "안녕하세요. 테스트 음성 출력입니다."
print("🎧 테스트 문장:", text)

tts = gTTS(text=text, lang='ko')
tts.save("tts_test.mp3")

print("🔊 음성 재생 중...")
os.system("mpg123 tts_test.mp3 >/dev/null 2>&1")
print("✅ 재생 완료")

