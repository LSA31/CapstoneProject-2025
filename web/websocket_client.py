import asyncio, websockets, json, subprocess, hashlib
import sounddevice as sd
from scipy.io.wavfile import write
import requests
import functions
from robot_actions import start_auto_avoid, stop_robot, start_touch_mode, back_off
from dotenv import load_dotenv
import os
import threading
import webrtcvad
import numpy as np
import wave
from gtts import gTTS  # ✅ TTS 변환용

# === TALK 녹음 제어용 전역 변수 ===
recording_thread = None
recording_active = False

# === 환경 변수 로드 ===
load_dotenv()
SERVER_URI = os.getenv("SERVER_URI")

# === 로봇 고유 ID (MAC 기반) ===
def get_robot_id():
    mac = subprocess.check_output("cat /sys/class/net/wlan0/address", shell=True).decode().strip()
    suffix = hashlib.sha256(mac.encode()).hexdigest()[:6]
    return f"COMO_Device_{suffix}"

# ===== 🎙️ 기본 녹음 (비상용) =====
def record_voice(filename="/home/pi/adeept_picar-b2/web/speech.mp3", duration=5, samplerate=44100):
    print(f"[TALK] {duration}초간 녹음 시작...")
    try:
        audio = sd.rec(int(duration * samplerate), samplerate=samplerate, channels=1, dtype='int16')
        sd.wait()
        temp_wav = "/home/pi/adeept_picar-b2/web/temp.wav"
        write(temp_wav, samplerate, audio)
        os.system(f"ffmpeg -y -i {temp_wav} -codec:a libmp3lame -qscale:a 2 {filename} >/dev/null 2>&1")
        os.remove(temp_wav)
        print(f"[TALK] 녹음 완료 → {filename}")
        return True
    except Exception as e:
        print(f"[TALK] 녹음 실패: {e}")
        return False

# ===== 🎙️ 발화 감지 기반 한 문장 녹음 =====
def record_voice_vad(filename="/home/pi/adeept_picar-b2/web/speech.mp3", samplerate=16000, frame_duration=30):
    global recording_active
    recording_active = True
    vad = webrtcvad.Vad(2)
    print("[TALK] 발화 감지 녹음 시작 (무음 시 자동 종료)")

    import collections, time
    frames = collections.deque(maxlen=int(1 * 1000 / frame_duration))
    voiced_frames = []
    triggered = False
    last_voice_time = time.time()

    def frame_generator(indata, frames_count, time_info, status):
        nonlocal triggered, voiced_frames, last_voice_time
        if not recording_active:
            print("[TALK_STOP] 중단 신호 감지 → 녹음 종료")
            raise sd.CallbackStop()

        frame = (indata[:, 0] * 32768).astype(np.int16).tobytes()
        is_speech = vad.is_speech(frame, samplerate)

        if is_speech:
            voiced_frames.append(frame)
            last_voice_time = time.time()
            if not triggered:
                print("[TALK] 음성 감지됨 → 녹음 시작")
                triggered = True
        elif triggered:
            if time.time() - last_voice_time > 10.0:
                print("[TALK] 무음 10초 이상 → 녹음 종료")
                raise sd.CallbackStop()

    try:
        with sd.InputStream(samplerate=samplerate, channels=1, dtype='int16',
                            blocksize=int(samplerate * frame_duration / 1000),
                            callback=frame_generator):
            sd.sleep(20000)
    except sd.CallbackStop:
        pass

    if not voiced_frames:
        print("[TALK] 녹음된 데이터 없음 — 파일 생성 생략")
        return False

    temp_wav = filename.replace(".mp3", ".wav")
    with wave.open(temp_wav, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(samplerate)
        wf.writeframes(b''.join(voiced_frames))

    os.system(f"ffmpeg -y -i {temp_wav} -codec:a libmp3lame -qscale:a 2 {filename} >/dev/null 2>&1")
    os.remove(temp_wav)

    print(f"[TALK] 녹음 완료 → {filename}")
    return True

# ===== 🎙️ 서버 업로드 =====
def upload_audio(file_path):
    url = "http://3.37.114.206:8080/como/audio"
    device_id = get_robot_id()

    if not os.path.exists(file_path):
        print(f"[TALK] 업로드 실패: 파일 없음 ({file_path})")
        return

    try:
        with open(file_path, "rb") as f:
            files = {"file": ("speech.mp3", f, "audio/mpeg")}
            data = {"device_id": device_id}
            res = requests.post(url, files=files, data=data)
            print(f"[TALK] 업로드 결과: {res.status_code} → {res.text}")
    except Exception as e:
        print(f"[TALK] 업로드 중 오류: {e}")

# ===== 🔊 서버 응답 음성 출력 (TTS) =====
def speak_text(text):
    """서버에서 받은 텍스트를 음성으로 변환 후 재생"""
    try:
        if not text.strip():
            print("[TTS] 재생할 텍스트 없음")
            return

        print(f"[TTS] 음성 변환 시작: {text}")
        tts = gTTS(text=text, lang='ko')
        filepath = "/home/pi/adeept_picar-b2/web/response.mp3"
        tts.save(filepath)
        os.system(f"mpg123 {filepath} >/dev/null 2>&1")
        print("[TTS] 재생 완료 ✅")
    except Exception as e:
        print(f"[TTS] 오류 발생: {e}")

# ===== 서버 이벤트 관련 함수 =====
async def send_event(websocket, ROBOT_ID, event_type):
    event = {"deviceId": ROBOT_ID, "event": event_type}
    await websocket.send(json.dumps(event))
    print("Sent:", event)

async def send_reported_events(websocket, ROBOT_ID, event_queue):
    while True:
        event_type = await event_queue.get()
        event = {"deviceId": ROBOT_ID, "event": event_type}
        await websocket.send(json.dumps(event))
        print(f"[Robot Event] Reported to Server: {event}")

# ===== 메인 클라이언트 =====
async def robot_client():
    global recording_thread, recording_active
    ROBOT_ID = get_robot_id()

    async with websockets.connect(SERVER_URI) as websocket:
        event_queue = asyncio.Queue()
        loop = asyncio.get_running_loop()
        functions.set_event_queue(event_queue, loop)

        await send_event(websocket, ROBOT_ID, "REGISTER")
        asyncio.create_task(send_reported_events(websocket, ROBOT_ID, event_queue))

        while True:
            message = await websocket.recv()
            event = json.loads(message)
            print("서버로부터 받은 이벤트:", event)
            action = event.get("event")

            # ======= 이벤트 처리 =======
            if action == "REGISTER":
                print("[INFO] 서버 등록 확인 완료 (중복 응답 무시)")
                continue

            elif action == "START":
                start_auto_avoid()

            elif action == "STOP":
                stop_robot()
                start_touch_mode()

            elif action == "TALK":
                print("[TALK] 서버에서 TALK 이벤트 수신 → 발화 감지 녹음 시작")

                def start_recording():
                    record_voice_vad("/home/pi/adeept_picar-b2/web/speech.mp3")
                    asyncio.run(send_event(websocket, ROBOT_ID, "TALK"))
                    upload_audio("/home/pi/adeept_picar-b2/web/speech.mp3")

                recording_active = True
                recording_thread = threading.Thread(target=start_recording)
                recording_thread.start()

            elif action == "TALK_STOP":
                print("[TALK_STOP] 이벤트 수신 → 녹음 중단 요청")
                recording_active = False

            elif action == "RESPONSE":
                # ✅ AI 서버 응답 수신 및 음성 출력
                response_text = event.get("answer", "")
                print(f"[RESPONSE] 서버 응답 수신: {response_text}")
                speak_text(response_text)

            elif action == "TOUCH":
                print("서버에서 TOUCH 이벤트 요청 받음")

            elif action == "BACK":
                back_off()
                stop_robot()

            else:
                ack = {"status": "ok", "event": action, "deviceId": ROBOT_ID}
                await websocket.send(json.dumps(ack))
                print("ACK Sent:", ack)

asyncio.run(robot_client())
