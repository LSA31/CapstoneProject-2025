import time
import sys
sys.path.append('/home/pi/adeept_picar-b2')  # 모듈 경로 추가

from adeept_picar_b2 import RPiServo, move  # 실제 폴더명에 맞게 import

# 서보 초기화
servo = RPiServo.ServoCtrl()
servo.moveInit()

print("=== 회전 테스트 시작 ===")

# 왼쪽 회전 테스트
servo.moveAngle(0, 25)
print("왼쪽 조향 → 전진")
move.move(40, 1, "mid")
time.sleep(2)
move.motorStop()
servo.moveAngle(0, 0)
time.sleep(1)

# 오른쪽 회전 테스트
servo.moveAngle(0, -25)
print("오른쪽 조향 → 전진")
move.move(40, 1, "mid")
time.sleep(2)
move.motorStop()
servo.moveAngle(0, 0)

print("=== 테스트 종료 ===")
