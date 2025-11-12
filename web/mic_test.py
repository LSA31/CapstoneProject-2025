import sounddevice as sd
import numpy as np
import time
import wave
import os

# ===== 설정 =====
SAMPLE_RATE = 16000
FRAME_DURATION = 0.2
THRESHOLD_DB = -10
OUTPUT_WAV = "test_vad.wav"
OUTPUT_MP3 = "test_vad.mp3"

# 🎤 사용할 마이크 장치 ID 지정 (pulse 추천)
sd.default.device = (4, None)  # (입력장치ID, 출력장치ID)

print("🎙️ 마이크 입력 테스트 시작 (Ctrl+C로 종료)")
print(f"샘플레이트: {SAMPLE_RATE}Hz | 프레임: {FRAME_DURATION}s | 노이즈 기준: {THRESHOLD_DB}dB 이하 무시\n")

frames = []  # 실제 녹음 데이터 저장 버퍼

# ===== dB 계산 함수 =====
def calculate_db(indata):
    rms = np.sqrt(np.mean(np.square(indata)))
    if rms == 0:
        return -float("inf")
    return 20 * np.log10(rms)

# ===== 콜백 함수 =====
def audio_callback(indata, frames_count, time_info, status):
    db = calculate_db(indata)
    level = "🎤" if db > THRESHOLD_DB else "🔇"
    print(f"{level} 입력음압: {db:6.2f} dB", end="\r")

    # -45dB 초과면 녹음
    if db > THRESHOLD_DB:
        frames.append(indata.copy())

try:
    # ===== 스트림 열기 =====
    with sd.InputStream(
        channels=1,
        samplerate=SAMPLE_RATE,
        dtype="float32",
        blocksize=int(SAMPLE_RATE * FRAME_DURATION),
        callback=audio_callback
    ):
        while True:
            time.sleep(0.1)

except KeyboardInterrupt:
    print("\n🛑 테스트 종료됨")

    if frames:
        print(f"💾 파일 저장 중... → {OUTPUT_WAV}")
        audio = np.concatenate(frames)
        audio_int16 = np.int16(audio * 32767)
        with wave.open(OUTPUT_WAV, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            wf.writeframes(audio_int16.tobytes())

        # ===== WAV → MP3 변환 =====
        print(f"🎧 ffmpeg로 MP3 변환 중... → {OUTPUT_MP3}")
        os.system(f"ffmpeg -y -i {OUTPUT_WAV} -codec:a libmp3lame -qscale:a 2 {OUTPUT_MP3} >/dev/null 2>&1")

        # WAV 삭제
        os.remove(OUTPUT_WAV)
        print("✅ 변환 완료! WAV 삭제됨")

    else:
        print("⚠️ 녹음된 오디오 없음 (모두 -45dB 이하로 무시됨)")

except Exception as e:
    print(f"❌ 오류 발생: {e}")
