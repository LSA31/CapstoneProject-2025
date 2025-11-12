#!/usr/bin/env python3
# File: test_back.py
# 🎯 BACK 동작 단독 테스트용

import time
import move

print("🔧 모터 초기화 중...")
move.setup()
time.sleep(1)

try:
    print("⬇️ 5초 동안 후진 테스트 시작!")
    move.move(50, 'backward', 'mid')  # 속도 50, 후진
    time.sleep(5)  # 5초 동안 유지
    move.motorStop()
    print("✅ 후진 테스트 완료. 정상 정지됨.")

except KeyboardInterrupt:
    print("🛑 수동 중단됨.")
    move.motorStop()

except Exception as e:
    print(f"❌ 오류 발생: {e}")
    move.motorStop()
