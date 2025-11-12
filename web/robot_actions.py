import move
import functions
import Voice_Command
import time, random, RPIservo

# ✅ 이미 functions 모듈에 fuc이 있으면 그대로 재사용
fuc = getattr(functions, "fuc", None)
if fuc is None:
    fuc = functions.Functions()
    fuc.setup()
    fuc.start()

speech = Voice_Command.Speech()
speech.start()

def start_auto_avoid():
    fuc.automatic()

def stop_robot():
    fuc.pause()
    move.motorStop()

def start_talk():
    speech.speech()

def stop_talk():
    speech.pause()

def start_touch_mode():
    fuc.functionMode = 'trackLine'
    fuc.resume()

def back_off():
    import time, random, RPIservo, move, functions

    # ✅ 1) 다른 기능 일시정지
    if hasattr(functions, "fuc"):
        functions.fuc.pause()   # trackLine, auto 등 멈춤
        time.sleep(0.2)

    scGear = RPIservo.ServoCtrl()
    scGear.start()

    print("[BACK] 사용자 수동 후진 명령 실행 중...")

    direction = random.choice(["left", "right"])
    print(f"[BACK] 랜덤 방향 선택 → {direction}")

    angle = 20 if direction == "left" else -20
    scGear.moveAngle(0, angle)
    time.sleep(0.3)

    move.move(50, -1, "mid")
    time.sleep(1.0)
    move.motorStop()

    scGear.moveAngle(0, 0)
    time.sleep(0.3)
    move.motorStop()

    print("[BACK] 후진 및 회전 완료 → 정지 상태로 전환")

    # ✅ 2) BACK 완료 후 다시 TOUCH 모드 재개
    functions.fuc.functionMode = "trackLine"
    functions.fuc.resume()
