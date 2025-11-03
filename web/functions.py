#!/usr/bin/env python3
# File name   : functions.py
# Website     : www.adeept.com
# Author      : Adeept
# Date        : 2025/05/15
import time
from board import SCL, SDA
import busio
from adafruit_motor import servo
from adafruit_pca9685 import PCA9685

import threading
import os
import json
import ultra
import Kalman_filter
import move
import RPIservo
import random
from gpiozero import InputDevice

import asyncio

scGear = RPIservo.ServoCtrl()
scGear.start()


move.setup()
kalman_filter_X =  Kalman_filter.Kalman_filter(0.01,0.1)


curpath = os.path.realpath(__file__)
thisPath = "/" + os.path.dirname(curpath)

# === 외부에서 websocket_client의 event_queue 주입용 함수 ===
def set_event_queue(queue, loop=None):
    global event_queue, event_loop
    event_queue = queue
    event_loop = loop

def num_import_int(initial):        #Call this function to import data from '.txt' file
	global r
	with open(thisPath+"/RPIservo.py") as f:
		for line in f.readlines():
			if(line.find(initial) == 0):
				r=line
	begin=len(list(initial))
	snum=r[begin:]
	n=int(snum)
	return n

pwm0_direction = 1
pwm0_init = num_import_int('init_pwm0 = ')
pwm0_max  = 180
pwm0_min  = 0
pwm0_pos  = pwm0_init

pwm1_direction = 1
pwm1_init = num_import_int('init_pwm1 = ')
pwm1_max  = 180
pwm1_min  = 0
pwm1_pos  = pwm1_init

pwm2_direction = 1
pwm2_init = num_import_int('init_pwm2 = ')
pwm2_max  = 180
pwm2_min  = 0
pwm2_pos  = pwm2_init

line_pin_left = 22
line_pin_middle = 27
line_pin_right = 17


class Functions(threading.Thread):
	def __init__(self, *args, **kwargs):
		self.functionMode = 'none'
		self.steadyGoal = 0

		self.scanNum = 3
		self.scanList = [0,0,0]
		self.scanPos = 1
		self.scanDir = 1
		self.rangeKeep = 30
		self.scanRange = 100
		self.scanServo = 1
		self.turnServo = 2
		self.turnWiggle = 200

		super(Functions, self).__init__(*args, **kwargs)
		self.__flag = threading.Event()
		self.__flag.clear()



	def pwmGenOut(self, angleInput):
		return int(angleInput)

	def setup(self):
		global track_line_left, track_line_middle,track_line_right
		track_line_left = InputDevice(pin=line_pin_right)
		track_line_middle = InputDevice(pin=line_pin_middle)
		track_line_right = InputDevice(pin=line_pin_left)

	def radarScan(self):
		pwm0_min = -90
		pwm0_max =  90

		scan_speed = 1
		result = []

		pwm0_pos = pwm0_max
		scGear.moveAngle(1, 0)
		time.sleep(0.8)

		while pwm0_pos>pwm0_min:
			pwm0_pos-=scan_speed
			scGear.moveAngle(1, pwm0_pos)
			dist = ultra.checkdist()
			if dist > 200:
				continue
			theta = 90 - pwm0_pos 
			result.append([dist, theta])
			time.sleep(0.02)
	
		scGear.moveAngle(1, 0)
		return result


	def pause(self):
		self.functionMode = 'none'
		move.motorStop()
		self.__flag.clear()


	def resume(self):
		self.__flag.set()


	def automatic(self):
		self.functionMode = 'Automatic'
		self.resume()


	def trackLine(self):
		self.functionMode = 'trackLine'
		self.resume()


	def keepDistance(self):
		self.functionMode = 'keepDistance'
		self.resume()


	def trackLineProcessing(self):
		"""
		손 감지(터치형 반응 랜덤 모드)
		손이 가까이 오면 무작위로 두 가지 반응 중 하나 수행:
		앞바퀴 좌우 흔들기
		앞으로/뒤로 살짝 움직이기
		"""
		print("=== Touch Reaction Mode (trackLine 버튼) 활성화 ===")

		#  from websocket_client import event_queue

		while True:
			if self.functionMode != 'trackLine':
				break

			dist = self.distRedress()
			print(f"거리 감지: {dist:.1f}cm")

			# 손이 가까이 왔을 때만 반응
			if dist < 15:
				print("손 감지됨! 랜덤 반응 수행 중...")

				# 서버로 TOUCH 이벤트 전송 요청
				try:
					if 'event_queue' in globals() and event_queue:
						asyncio.run_coroutine_threadsafe(event_queue.put("TOUCH"), event_loop)
						print("[TOUCH] 이벤트 서버 전송 요청 완료")
				except Exception as e:
					print(f"[ERROR] TOUCH 이벤트 전송 실패: {e}")

				action = random.choice(["wiggle", "move"])

				if action == "wiggle":
					print("→ 앞바퀴 좌우 흔들기")
					for _ in range(2):
						scGear.moveAngle(0, 40)
						time.sleep(0.25)
						scGear.moveAngle(0, -40)
						time.sleep(0.25)
					scGear.moveAngle(0, 0)
					time.sleep(0.5)

				elif action == "move":
					print("→ 앞뒤로 살짝 이동")
					for _ in range(2):
						move.move(70, -1, "mid")   # 앞으로 살짝
						time.sleep(0.3)
						move.move(70, 1, "mid")  # 뒤로 살짝
						time.sleep(0.3)
						move.motorStop()
						time.sleep(0.1)
					move.motorStop()
					time.sleep(0.5)

			else:
				# 대기 상태 (센서만 감시)
				move.motorStop()
				scGear.moveAngle(0, 0)

			time.sleep(0.2)

	
# Filter out occasional incorrect distance data.
	def distRedress(self): 
		mark = 0
		distValue = ultra.checkdist()
		while True:
			distValue = ultra.checkdist()
			if distValue > 900:
				mark +=  1
			elif mark > 5 or distValue < 900:
					break
			print(distValue)
		return round(distValue,2)

	def automaticProcessing(self):
		print('automaticProcessing')

		# 거리값을 3번 읽어서 평균내기
		dist = sum(self.distRedress() for _ in range(3)) / 3
		dist = min(round(dist, 1), 150)  # 150cm 이상 튀는 값 보정
		print("평균 거리:", dist, "cm")

		if dist >= 60:			# More than 50CM, go straight.
			scGear.moveAngle(0, 0)
			time.sleep(0.3)
			move.move(50, 1, "mid")
			print("Forward")

		elif 30 < dist < 60:
			print("장애물 감지 → 방향 탐색")
			# === 2. 좌/우 거리 측정 ===
			scGear.moveAngle(1, -45)  # 왼쪽
			time.sleep(0.2)
			distLeft = sum(self.distRedress() for _ in range(3)) / 3
			distLeft = min(round(distLeft, 1), 150)

			scGear.moveAngle(1, 45)   # 오른쪽
			time.sleep(0.2)
			distRight = sum(self.distRedress() for _ in range(3)) / 3
			distRight = min(round(distRight, 1), 150)

			scGear.moveAngle(1, 0)    # 시야 복원
			print(f"왼쪽: {distLeft:.1f}cm, 오른쪽: {distRight:.1f}cm")

			# === 3. 더 넓은 방향 선택 ===
			direction = "left" if distLeft > distRight else "right"
			diff = abs(distLeft - distRight)
			print(f"더 넓은 방향: {direction} (차이 {diff:.1f}cm)")

			# === 4. 선택된 방향 전방 거리 확인 ===
			# 좌우 차이 너무 작으면 → 랜덤 회전
			if diff < 5:
				random_dir = random.choice(["left", "right"])
				print(f"좌우 거리 차이 작음 → 임시 랜덤 회전: {random_dir}")
				move.move(50, -1, "mid")
				time.sleep(0.5)
				scGear.moveAngle(0, 40 if random_dir == "left" else -40)
				move.move(50, 1, random_dir)
				time.sleep(2.5)
				move.motorStop()
				time.sleep(0.3)
				return

			# 선택된 방향으로 머리 돌려 전방 확인
			scGear.moveAngle(1, -45 if direction == "left" else 45)
			time.sleep(0.2)
			distForward = sum(self.distRedress() for _ in range(3)) / 3
			distForward = min(round(distForward, 1), 150)
			scGear.moveAngle(1, 0)
			print(f"{direction} 방향 전방 거리: {distForward:.1f}cm")

			# === 5. 거리 판단 ===
			if distForward >= 60:
				print(f"{direction} 방향 전방 확보 → 이동")
				move.move(50, -1, "mid")  # 살짝 후진
				time.sleep(0.5)

				if direction == "left":
					scGear.moveAngle(0, 20)
					move.move(50, 1, "left")
				else:
					scGear.moveAngle(0, -20)
					move.move(50, 1, "right")

				time.sleep(0.7)  # 회피 후 안정화 대기
				move.motorStop()
				time.sleep(0.3)

			else:
				# === 6. 랜덤 방향 선택 ===
				random_dir = random.choice(["left", "right"])
				print(f"랜덤 방향 선택: {random_dir}")

				# 후진
				move.move(50, -1, "mid")
				time.sleep(0.5)

				scGear.moveAngle(0, 20 if random_dir == "left" else -20)
				time.sleep(0.3)

				distRandom = sum(self.distRedress() for _ in range(3)) / 3
				distRandom = min(round(distRandom, 1), 150)
				print(f"랜덤 방향 전방 거리: {distRandom:.1f}cm")

				if distRandom >= 60:
					print("랜덤 방향 전방 확보 → 이동")
					move.move(50, 1, random_dir)
					time.sleep(0.6)
				else:
					print("양쪽 모두 장애물 감지 → 후진")
					move.move(50, -1, "mid")
					time.sleep(0.3)

				move.motorStop()
				time.sleep(0.4)

		else:		# The distance is less than 30cm, back.
			print("장애물 너무 가까움 → 긴급 후진")
			scGear.moveAngle(0, 0)
			move.move(50, -1, "mid")
			time.sleep(0.5)
			move.motorStop()
			time.sleep(0.3)		





	def keepDisProcessing(self):
		distanceGet = self.distRedress()

		print('keepDistanceProcessing: ' + str(distanceGet))
		if distanceGet > 40:
			move.move(60, 1, "mid")
		elif distanceGet < 30:
			move.move(60, -1, "mid")
		else:
			move.motorStop()
		time.sleep(0.3)
   


	def functionGoing(self):
		if self.functionMode == 'none':
			self.pause()
		elif self.functionMode == 'Automatic':
			self.automaticProcessing()
		elif self.functionMode == 'trackLine':
			self.trackLineProcessing()
		elif self.functionMode == 'keepDistance':
			self.keepDisProcessing()


	def run(self):
		while 1:
			self.__flag.wait()
			self.functionGoing()
			pass


if __name__ == '__main__':
	pass
	try:
		fuc=Functions()
		fuc.setup()
		while True:
			fuc.keepDisProcessing()
	except KeyboardInterrupt:

			move.motorStop()
