#!/usr/bin/env python3
import asyncio, websockets, json, subprocess, hashlib
import sounddevice as sd
import requests
import functions
from robot_actions import start_auto_avoid, stop_robot, start_touch_mode, back_off
from dotenv import load_dotenv
import os, threading, numpy as np, wave, time, contextlib
from gtts import gTTS
from urllib.parse import urlparse

# === TALK 제어용 전역 변수 ===
recording_thread = None
recording_active = False
is_playing_tts = False
event_queue = None
event_loop = None

# === 환경 변수 로드 ===
load_dotenv()
SERVER_URI = os.getenv("SERVER_URI")
AUDIO_UPLOAD_URL = os.getenv("AUDIO_UPLOAD_URL")  # 선택: 없으면 SERVER_URI로부터 생성

def derive_audio_upload_url(server_uri: str) -> str:
    try:
        u = urlparse(server_uri)
        scheme = "https" if u.scheme == "wss" else "http"
        netloc = u.netloc
        return f"{scheme}://{netloc}/como/audio"
    except Exception:
        return None

if not AUDIO_UPLOAD_URL:
    AUDIO_UPLOAD_URL = derive_audio_upload_url(SERVER_URI)

print(f"[ENV] SERVER_URI = {SERVER_URI}")
print(f"[ENV] AUDIO_UPLOAD_URL = {AUDIO_UPLOAD_URL}")

# === 로봇 고유 ID (MAC 기반) ===
def get_robot_id():
    mac = subprocess.check_output("cat /sys/class/net/wlan0/address", shell=True).decode().strip()
    suffix = hashlib.sha256(mac.encode()).hexdigest()[:6]
    return f"COMO_Device_{suffix}"

# === 오디오 길이 계산 ===
def get_audio_duration(file_path):
    if not os.path.exists(file_path):
        return 0.0
    try:
        if file_path.endswith(".mp3"):
            result = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "default=noprint_wrappers=1:nokey=1", file_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT
            )
            return round(float(result.stdout), 2)
        else:
            with contextlib.closing(wave.open(file_path, "r")) as f:
                frames = f.getnframes()
                rate = f.getframerate()
                return round(frames / float(rate), 2)
    except Exception as e:
        print(f"[AUDIO] 길이 계산 실패: {e}")
        return 0.0


# 🎙 TALK~TALK_STOP 동안 연속 녹음
def record_voice_between_markers(filename="/home/pi/adeept_picar-b2/web/speech.mp3"):
    global recording_active, is_playing_tts
    print("[TALK] 연속 녹음 시작 (TALK~TALK_STOP)")

    temp_wav = filename.replace(".mp3", ".wav")
    frames = []

    # 입력 장치 선택 (pulse 우선, 없으면 default)
    samplerate = 16000
    channels = 1
    device_candidates = [4, 8, None]  # 4: pulse, 8: default, None: 시스템 기본
    device = None
    for d in device_candidates:
        try:
            sd.check_input_settings(device=d, channels=channels, samplerate=samplerate)
            device = d
            break
        except Exception:
            continue
    print(f"[TALK] 사용 입력 장치: {device}")

    try:
        def callback(indata, frames_count, time_info, status):
            if not recording_active:
                raise sd.CallbackStop()
            if is_playing_tts:
                return  # 하울링 방지
            frames.append(indata.copy())

        with sd.InputStream(
            device=device,
            samplerate=samplerate,
            channels=channels,
            dtype="int16",
            blocksize=int(samplerate * 0.02),
            callback=callback
        ):
            while recording_active:
                sd.sleep(100)

    except sd.CallbackStop:
        pass
    except Exception as e:
        print(f"[TALK] 녹음 중 오류: {e}")
        return

    if not frames:
        print("[TALK] 수집된 오디오 프레임 없음 → 업로드 생략")
        return

    try:
        audio = np.concatenate(frames, axis=0)
        with wave.open(temp_wav, "wb") as wf:
            wf.setnchannels(channels)
            wf.setsampwidth(2)
            wf.setframerate(samplerate)
            wf.writeframes(audio.tobytes())

        os.system(f"ffmpeg -y -i {temp_wav} -codec:a libmp3lame -qscale:a 2 {filename} >/dev/null 2>&1")
        os.remove(temp_wav)
        print(f"[TALK] 녹음 완료 → {filename}")

        dur = get_audio_duration(filename)
        print(f"[TALK] 녹음 길이: {dur}초")

        upload_audio(filename)
        print("[TALK] 업로드 완료 ✅")

        # ✅ 업로드 완료 후 서버에 TALK 이벤트 전송 (TOUCH 이벤트와 동일한 방식)
        try:
            if event_queue and event_loop:
                asyncio.run_coroutine_threadsafe(event_queue.put("TALK"), event_loop)
                print("[TALK] 업로드 후 → TALK 이벤트 서버 전송 요청 (큐에 추가됨)")
        except Exception as e:
            print(f"[TALK] 이벤트 전송 실패: {e}")

    except Exception as e:
        print(f"[TALK] 파일 저장/업로드 실패: {e}")


# 🎵 서버 업로드
def upload_audio(file_path, user_id=None):
    url = AUDIO_UPLOAD_URL
    device_id = get_robot_id()
    if not url:
        print("[TALK] 업로드 URL 생성 실패 (AUDIO_UPLOAD_URL 확인)")
        return
    if not os.path.exists(file_path):
        print(f"[TALK] 업로드 실패: 파일 없음 ({file_path})")
        return
    try:
        with open(file_path, "rb") as f:
            files = {"file": ("speech.mp3", f, "audio/mpeg")}
            data = {"device_id": device_id}
            headers = {}
            if user_id:
                headers["Authorization"] = f"Bearer {user_id}"
            res = requests.post(url, files=files, data=data, headers=headers, timeout=30)
            print(f"[TALK] 업로드 완료 (응답 코드: {res.status_code})")
    except Exception as e:
        print(f"[TALK] 업로드 중 오류: {e}")


# 🔊 서버 응답 → TTS 출력 (비동기 재생으로 이벤트 루프 블로킹 방지)
def _tts_play_worker(text: str):
    """별도 스레드에서 실행되는 TTS 변환+재생 작업"""
    global is_playing_tts
    try:
        # 볼륨 초기화
        os.system("amixer set Master 100% unmute >/dev/null 2>&1")
        os.system("amixer set PCM 100% unmute >/dev/null 2>&1")
        os.system("amixer set Speaker 100% unmute >/dev/null 2>&1")
        os.system("amixer set Headphone 100% unmute >/dev/null 2>&1")

        filepath = "/home/pi/adeept_picar-b2/web/response.mp3"
        tts = gTTS(text=text, lang="ko")
        tts.save(filepath)

        # 음량 보정
        os.system(f"ffmpeg -y -i {filepath} -filter:a 'volume=2.0' {filepath} >/dev/null 2>&1")

        # 비동기 재생(별도 프로세스)
        player = subprocess.Popen(["mpg123", filepath],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        player.wait()

    except Exception as e:
        print(f"[TTS] 재생 중 오류: {e}")
    finally:
        is_playing_tts = False
        print("[TTS] 재생 완료 ✅")


def speak_text(text):
    """메인 스레드에서 호출: 녹음 중단 플래그만 건드리고, TTS는 별도 스레드에서 실행"""
    global is_playing_tts, recording_active
    try:
        if not text or not text.strip():
            print("[TTS] 재생할 텍스트 없음")
            return

        if recording_active:
            print("[TTS] 재생 시작 전 → 녹음 중단")
            recording_active = False
            time.sleep(0.2)

        is_playing_tts = True
        print(f"[TTS] 음성 변환 시작: {text}")

        t = threading.Thread(target=_tts_play_worker, args=(text,), daemon=True)
        t.start()

    except Exception as e:
        print(f"[TTS] 오류 발생: {e}")
        is_playing_tts = False


# 📡 서버 이벤트 송신
async def send_event(websocket, ROBOT_ID, event_type):
    event = {"deviceId": ROBOT_ID, "event": event_type}
    await websocket.send(json.dumps(event))
    print("Sent:", event)


# 🪣 큐 이벤트 송신 루프
async def send_reported_events(websocket, ROBOT_ID, event_queue):
    while True:
        event_type = await event_queue.get()
        print(f"[QUEUE DEBUG] 큐에서 꺼냄 → {event_type}")
        await send_event(websocket, ROBOT_ID, event_type)


# 🤖 메인 클라이언트 루프 (자동 재연결 포함)
async def robot_client():
    global recording_thread, recording_active, event_queue, event_loop
    ROBOT_ID = get_robot_id()
    user_id = None

    while True:
        try:
            async with websockets.connect(
                SERVER_URI,
                ping_interval=20,
                ping_timeout=20,
                close_timeout=5
            ) as websocket:
                event_queue = asyncio.Queue()
                event_loop = asyncio.get_running_loop()
                functions.set_event_queue(event_queue, event_loop)
                asyncio.create_task(send_reported_events(websocket, ROBOT_ID, event_queue))

                await send_event(websocket, ROBOT_ID, "REGISTER")

                while True:
                    message = await websocket.recv()
                    event = json.loads(message)
                    print("서버로부터 받은 이벤트:", event)
                    action = event.get("event")

                    if action == "REGISTER":
                        user_id = event.get("userId")
                        continue

                    elif action == "START":
                        start_auto_avoid()

                    elif action == "STOP":
                        stop_robot()
                        start_touch_mode()

                    elif action == "TALK":
                        if not event.get("fromServer", False):
                            print("[TALK] 내부 TALK 이벤트 → 무시")
                            continue
                        print("[TALK] 서버에서 TALK 이벤트 수신 → 연속 녹음 시작")
                        if not recording_active:
                            recording_active = True
                            recording_thread = threading.Thread(
                                target=record_voice_between_markers, daemon=True
                            )
                            recording_thread.start()

                    elif action == "TALK_STOP":
                        print("[TALK_STOP] 서버 이벤트 수신 → 연속 녹음 종료")
                        recording_active = False
                        if recording_thread and recording_thread.is_alive():
                            recording_thread.join(timeout=3.0)

                    elif action in ["RESPONSE", "ANSWER"]:
                        response_text = event.get("answer") or event.get("data", "")
                        print(f"[RESPONSE] 서버 응답 수신: {response_text}")
                        speak_text(response_text)

                    elif action == "BACK":
                        back_off()
                        time.sleep(0.3)
                        stop_robot()
                        time.sleep(0.5)
                        start_touch_mode()
                        print("[BACK] TOUCH(손 감지) 모드 재개 완료 ✅")

                    else:
                        if action not in ["ANSWER", "RESPONSE", "TOUCH"]:
                            await send_event(websocket, ROBOT_ID, action)

        except websockets.exceptions.ConnectionClosedError as e:
            print(f"[WS] 연결 끊김: {e} → 3초 후 재연결")
            await asyncio.sleep(3)
        except Exception as e:
            print(f"[WS] 예외 발생: {e} → 3초 후 재연결")
            await asyncio.sleep(3)


# === 실행 시작 ===
asyncio.run(robot_client())
