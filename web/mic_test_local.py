import sounddevice as sd
import numpy as np
import wave, os, time, collections

def record_voice_simple(filename="test_record.mp3", samplerate=16000, frame_duration=20):
    noise_threshold_db = -60  # 🎚 -20dB 초과 → 녹음 시작, 이하 → 녹음 종료
    print(f"[TEST] 마이크 테스트 시작 (기준: {noise_threshold_db}dB)")

    frames = collections.deque(maxlen=int(1 * 1000 / frame_duration))
    voiced_frames = []
    triggered = False
    temp_wav = filename.replace(".mp3", ".wav")

    def frame_generator(indata, frames_count, time_info, status):
        nonlocal triggered, voiced_frames

        # === 실제 RMS 및 dB 계산 (정규화 없이 원신호 기준) ===
        audio = indata[:, 0].astype(np.float32)
        rms = np.sqrt(np.mean(audio ** 2)) / 32768.0  # 16-bit PCM 기준 정규화
        db = 20 * np.log10(rms + 1e-10)

        # 현재 데시벨 출력
        print(f"현재 데시벨: {db:.1f} dB", end="\r")

        # === 기준치 초과 시 녹음 시작 ===
        if db > noise_threshold_db:
            voiced_frames.append(indata.copy())  # 원본 프레임 그대로 저장
            if not triggered:
                print(f"\n[TEST] 음성 감지됨 (RMS={rms:.6f}, {db:.1f} dB) → 녹음 시작")
                triggered = True

        # === 기준치 이하 시 녹음 종료 ===
        elif triggered and db <= noise_threshold_db:
            print(f"\n[TEST] 음압 {db:.1f} dB → 무음 감지, 녹음 종료")
            raise sd.CallbackStop()

    try:
        with sd.InputStream(samplerate=samplerate, channels=1, dtype="int16",
                            blocksize=int(samplerate * frame_duration / 1000),
                            callback=frame_generator):
            sd.sleep(20000)  # 최대 녹음 대기 시간 (20초)
    except sd.CallbackStop:
        pass

    # === 녹음된 내용이 있을 경우 저장 ===
    if voiced_frames:
        # numpy 배열로 변환
        audio_data = np.concatenate(voiced_frames, axis=0)
        with wave.open(temp_wav, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(samplerate)
            wf.writeframes(audio_data.tobytes())

        os.system(f"ffmpeg -y -i {temp_wav} -codec:a libmp3lame -qscale:a 2 {filename} >/dev/null 2>&1")
        os.remove(temp_wav)
        print(f"[TEST] 녹음 완료 → {filename}")
    else:
        print("\n[TEST] 음성 감지되지 않음 — 파일 생성 안됨")

if __name__ == "__main__":
    record_voice_simple()
