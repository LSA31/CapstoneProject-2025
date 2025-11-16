import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getDiaryByDate } from '../services/diary';
import { getComo } from '../services/como';

export default function DiaryDetail() {
  const navigation: any = useNavigation();
  const route: any = useRoute();
  const dateParam: string | undefined = route?.params?.date;
  const [today, setToday] = useState(() => {
    const d = dateParam ? new Date(dateParam) : new Date();
    return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
  });

  useEffect(() => {
    // update date at midnight
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ms = next.getTime() - now.getTime();
    const t = setTimeout(() => {
      const d = new Date();
      setToday(`${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`);
    }, ms + 1000);
    return () => clearTimeout(t);
  }, []);

  const [diary, setDiary] = useState<any | null>(null);
  const [notFoundDetail, setNotFoundDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nowHour, setNowHour] = useState<number>(new Date().getHours());
  const [petName, setPetName] = useState<string>('코모');

  const withWaOrGwa = (name: string) => {
    if (!name) return name + '와';
    const last = name.charCodeAt(name.length - 1);
    if (last >= 0xAC00 && last <= 0xD7A3) {
      const jong = (last - 0xAC00) % 28;
      return name + (jong === 0 ? '와' : '과');
    }
    return name + '와';
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await getComo();
        if (mounted && c && typeof c.name === 'string' && c.name.trim().length > 0) {
          setPetName(c.name);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchDiary = async () => {
      setLoading(true);
      try {
        let res;
          if (dateParam) res = await getDiaryByDate(dateParam);
          else res = await getDiaryByDate();
          if (!mounted) return;
          setDiary(res?.diary ?? null);
          setNotFoundDetail(res?.notFoundDetail ?? null);
      } catch (e) {
        console.warn('fetch diary failed', e);
        if (mounted) setDiary(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchDiary();
    return () => { mounted = false; };
  }, [dateParam]);

  useEffect(() => {
    const id = setInterval(() => setNowHour(new Date().getHours()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // ensure default nav header hidden and use our custom header
  useLayoutEffect(() => {
    if (navigation && navigation.setOptions) {
      navigation.setOptions({ headerShown: false });
      try { navigation.getParent && navigation.getParent().setOptions && navigation.getParent().setOptions({ headerShown: false }); } catch (e) {}
    }
  }, [navigation]);

  return (
    <SafeAreaView style={styles.diaryContainer}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHeader} accessibilityLabel="뒤로가기">
          <Text style={styles.backTextShort}>{'<'}</Text>
        </TouchableOpacity>
        <View style={{ width: 76 }} />
      </View>

  <ScrollView style={{ width: '100%', flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={require('../assets/heart_como.png')} style={{ width: 29, height: 20 }} />
          <Text style={{ ...styles.dateText, marginLeft: -5 }}>{petName}의 감정 태그</Text>
          {diary && Array.isArray(diary.emo_tag) && diary.emo_tag.length > 0 ? (
            <View style={{ flexDirection: 'row', marginLeft: 12 }}>
              {diary.emo_tag.map((t: string) => (
                <Text key={t} style={styles.emojiTag}>{`#${t}`}</Text>
              ))}
            </View>
          ) : null}
        </View>

  <View style={{ ...styles.diaryHeader, marginTop: 8 }}>
          <View>
            <Text style={styles.dateText}>{today}</Text>
            <Text style={styles.diaryTitle}>하루 일기</Text>
          </View>
        </View>

  <View style={{ ...styles.diaryCard, marginTop: 4 }}>
          {(!dateParam && nowHour < 21) ? (
            loading ? (<ActivityIndicator />) : (diary && diary.content) ? (
              <Text style={styles.diaryText}>{diary.content}</Text>
            ) : (
              <Text style={styles.diaryText}>오늘 하루 일기를 만들고 있어요…{"\n"}오늘 저녁 9시에 볼 수 있어요</Text>
            )
          ) : (
            loading ? (<ActivityIndicator />) : (diary && diary.content) ? (
              <Text style={styles.diaryText}>{diary.content}</Text>
            ) : (
              <Text style={styles.placeholderText}>아직 일기가 없습니다. {withWaOrGwa(petName)} 대화를 나누고 하루를 기록해보세요.</Text>
            )
          )}
        </View>

  <View style={{ ...styles.diaryHeader, marginTop: 15 }}>
          <View>
            <Text style={styles.dateText}>하루를 마무리하는</Text>
            <View style={{ flexDirection: 'row' }}>
              <Text style={styles.diaryTitle}>{petName}의 답장</Text>
              <Image source={require('../assets/food_como.png')} style={{ width: 79, height: 57, marginLeft: 150, marginTop: -22 }} />
            </View>
          </View>
        </View>

  <View style={{ ...styles.diaryCard, marginTop: 4 }}>
          {diary && diary.advice ? (
            <Text style={styles.diaryText}>{diary.advice}</Text>
          ) : (
            <Text style={styles.diaryText}>아직 답장이 안왔어요</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  diaryContainer: { flex: 1, padding: 24, justifyContent: 'flex-start' },
  diaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  dateText: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  diaryTitle: { fontSize: 28, fontWeight: 'bold', color: '#000', marginTop: 4 },
  // make diary/reply cards slightly darker gray so they stand out from background
  diaryCard: { backgroundColor: '#E6E6E6', padding: 16, borderRadius: 16, marginTop: 16 },
  diaryText: { fontSize: 16, lineHeight: 24, color: '#333' },
  libraryButton: { padding: 8, borderRadius: 8, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  moreButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#f5f5f5', alignSelf: 'flex-start' },
  moreText: { color: '#8a8a8a', fontSize: 16, textDecorationLine: 'underline', textDecorationColor: '#cfcfcf', textDecorationStyle: 'solid', fontWeight: '600' },
  emojiTag: { marginRight: 8, color: '#666', fontSize: 14 },
  entryWrapper: { backgroundColor: 'transparent', padding: 0, borderRadius: 0 },
  entryText: { fontSize: 16, lineHeight: 24, color: '#333' },
  placeholderText: { fontSize: 16, lineHeight: 24, color: '#999' },
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 8, marginTop: -20 },
  backButtonHeader: { paddingVertical: 6, paddingHorizontal: 8 },
  backTextShort: { color: '#000', fontSize: 18, fontWeight: '700' },
  screenTitle: { fontSize: 18, fontWeight: '700' },
});
