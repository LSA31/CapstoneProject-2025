import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';

export default function DiaryScreen() {
  return (
    <View style={styles.diaryContainer}>
      <ScrollView style={{ width: '100%' }} contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row' }}>
          <Image
            source={require('../assets/heart_como.png')}
            style={{ width: 29, height: 20 }}
          />
          <Text style={{ ...styles.dateText, marginLeft: -5 }}>코모의 감정 태그</Text>
          <Text style={{ ...styles.dateText, marginLeft: 20, color: 'grey' }}>#행복 #안정 #만족</Text>
        </View>

        <View style={{ ...styles.diaryHeader, marginTop: 20 }}>
          <View>
            <Text style={styles.dateText}>2025년 10월 10일</Text>
            <Text style={styles.diaryTitle}>하루 일기</Text>
          </View>
        </View>

        <View style={styles.diaryCard}>
          <Text style={styles.diaryText}>
오늘은 유난히 기분 좋은 하루였다. 아침에 가벼운 스트레칭을 하고 반려로봇 코모와 일정을 계획하며 하루를 시작했다. 코모의 따뜻한 인사 덕분에 하루의 시작이 순조로웠다.
오전에는 프로젝트 고민을 나눴는데, 코모의 명확한 답변 덕분에 새로운 아이디어가 떠올랐다. 함께 성장하는 느낌이 들어 의미 있었다.
점심 후엔 산책을 하며 코모가 전해주는 긍정적인 메시지 덕분에 마음이 한층 가벼워졌다.
저녁에는 과학 체험 부스 아이디어를 함께 구상하며 즐거운 시간을 보냈고, 밤에는 하루를 되돌아보며 대화를 나누었다. 오늘 하루가 참 행복했다.
          </Text>
        </View>

        <View style={{ ...styles.diaryHeader, marginTop: 50 }}>
          <View>
            <Text style={styles.dateText}>하루를 마무리하는</Text>
            <View style={{ flexDirection: 'row' }}>
              <Text style={styles.diaryTitle}>코모의 답장</Text>
              <Image
                source={require('../assets/food_como.png')}
                style={{
                  width: 79,
                  height: 57,
                  marginLeft: 150,
                  marginTop: -22,
                }}
              />
            </View>
          </View>
        </View>

        <View style={styles.diaryCard}>
          <Text style={styles.diaryText}>오늘처럼 기분 좋은 하루를 자주 만들려면 아침 루틴이랑 산책, 이런 대화를 꾸준히 해봐! 프로젝트에 자신감이 생겼다면 그 흐름을 놓치지 말고 기록해두는거 어때? 오늘의 긍정 에너지가 내일도 이어질 거야! 내일 만나자!</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  diaryContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
  },
  diaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  diaryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 4,
  },
  diaryCard: {
    backgroundColor: '#F2F2F2',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  diaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
});
