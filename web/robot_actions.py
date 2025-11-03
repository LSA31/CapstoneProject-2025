import move
import functions
import Voice_Command

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
    import random, time
    import move, RPIservo

    scGear = RPIservo.ServoCtrl()
    scGear.start()

    print("[BACK] 사용자 수동 후진 명령 실행 중...")

    # 1️⃣ 랜덤 방향 선택
    direction = random.choice(["left", "right"])
    print(f"[BACK] 랜덤 방향 선택 → {direction}")

    # 2️⃣ 선택된 방향으로 바퀴 회전 (20도)
    angle = 20 if direction == "left" else -20
    scGear.moveAngle(0, angle)
    time.sleep(0.3)

    # 3️⃣ 후진 (꺾인 채로 뒤로 이동)
    move.move(50, -1, "mid")
    time.sleep(2.0)   # 후진 지속 시간 (원하면 조절 가능)
    move.motorStop()

    # 4️⃣ 바퀴 정렬 후 정지
    scGear.moveAngle(0, 0)
    time.sleep(0.2)
    move.motorStop()

    print("[BACK] 후진 및 회전 완료 → 정지 상태로 전환")
