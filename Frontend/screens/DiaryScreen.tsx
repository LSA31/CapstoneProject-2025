import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getDiaryByDate } from '../services/diary';
import { getComo } from '../services/como';

export default function DiaryScreen() {
  const navigation: any = useNavigation();
  const route: any = useRoute();
  const dateParam: string | undefined = route?.params?.date;
  const [today, setToday] = useState(() => {
    const d = dateParam ? new Date(dateParam) : new Date();
    return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`;
  });

  useEffect(() => {
    // compute ms until next midnight
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ms = next.getTime() - now.getTime();
    const t = setTimeout(() => {
      const d = new Date();
      setToday(`${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`);
      // after updating at midnight, set interval to 24h
      setInterval(() => {
        const d2 = new Date();
        setToday(`${d2.getFullYear()}년 ${String(d2.getMonth() + 1).padStart(2, '0')}월 ${String(d2.getDate()).padStart(2, '0')}일`);
      }, 24 * 60 * 60 * 1000);
    }, ms + 1000);
    return () => clearTimeout(t);
  }, []);

  const [diary, setDiary] = useState<any | null>(null);
  const [notFoundDetail, setNotFoundDetail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nowHour, setNowHour] = useState<number>(new Date().getHours());
  const [petName, setPetName] = useState<string>('코모');

  // helper: determine proper particle for '와/과' depending on Korean batchim
  const withWaOrGwa = (name: string) => {
    if (!name) return name + '와';
    const last = name.charCodeAt(name.length - 1);
    // Hangul syllables range
    if (last >= 0xAC00 && last <= 0xD7A3) {
      const jong = (last - 0xAC00) % 28;
      return name + (jong === 0 ? '와' : '과');
    }
    // fallback: use '와'
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
        if (dateParam) {
          res = await getDiaryByDate(dateParam);
        } else {
          // request today's diary without passing date so backend can default to today
          res = await getDiaryByDate();
        }
        if (!mounted) return;
        // new shape: { diary, notFoundDetail? }
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
    return () => {
      mounted = false;
    };
  }, [dateParam]);

  // if we're showing today's diary (no dateParam), keep the midnight updater; otherwise skip
  useEffect(() => {
    if (dateParam) return; // static date, no update needed
    // compute ms until next midnight
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ms = next.getTime() - now.getTime();
    const t = setTimeout(() => {
      const d = new Date();
      setToday(`${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`);
      // after updating at midnight, set interval to 24h
      setInterval(() => {
        const d2 = new Date();
        setToday(`${d2.getFullYear()}년 ${String(d2.getMonth() + 1).padStart(2, '0')}월 ${String(d2.getDate()).padStart(2, '0')}일`);
        setNowHour(new Date().getHours());
      }, 24 * 60 * 60 * 1000);
    }, ms + 1000);
    return () => clearTimeout(t);
  }, [dateParam]);

  // keep a small interval to refresh hour so pre-9pm overlay updates
  useEffect(() => {
    const id = setInterval(() => setNowHour(new Date().getHours()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const fromListContext = route?.params?.fromList === true;
  const hideMoreButton = route?.params?.hideMore === true;

  // hide default navigation header to avoid duplicate headers
  useLayoutEffect(() => {
    if (navigation && navigation.setOptions) navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // choose separate container styles for today's diary (home) vs previous-diary (from list)
  const containerStyle: any = fromListContext
    ? [styles.diaryContainerList]
    : [styles.diaryContainerToday, { paddingTop: 0, paddingLeft: 24, paddingRight: 24, paddingBottom: 24, marginTop: -25 }];

  // choose diary card variant so we can style today's card differently from historical entries
  const diaryCardStyle = fromListContext ? styles.diaryCardList : styles.diaryCardToday;

  return (
    <SafeAreaView style={containerStyle}>
      <ScrollView style={{ width: '100%', flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>

        {/* when navigated from the list show a small header with a back button above the emotion tags */}
        {fromListContext ? (
          <View style={styles.screenHeader}>
            <TouchableOpacity onPress={() => {
              if (navigation && navigation.canGoBack && navigation.canGoBack()) return navigation.goBack();
              if ((navigation as any).navigate) return (navigation as any).navigate('MainApp');
            }} style={styles.backButtonHeader} accessibilityLabel="뒤로가기">
              <Text style={styles.backTextShort}>{'<'}</Text>
            </TouchableOpacity>
            <View style={{ width: 76 }} />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: fromListContext ? 32 : 0 }}>
          <Image
            source={require('../assets/heart_como.png')}
            style={{ width: 29, height: 20 }}
          />
          <Text style={{ ...styles.dateText, marginLeft: -5 }}>{petName}의 감정 태그</Text>
          {/* only render tags if available - otherwise render nothing (avoid '#없음' placeholder) */}
          {diary && Array.isArray(diary.emo_tag) && diary.emo_tag.length > 0 ? (
            <View style={{ flexDirection: 'row', marginLeft: 12 }}>
              {diary.emo_tag.map((t: string) => (
                <Text key={t} style={styles.emojiTag}>{`#${t}`}</Text>
              ))}
            </View>
          ) : null}
        </View>

  <View style={{ ...styles.diaryHeader, marginTop: 12 }}>
          <View>
            <Text style={styles.dateText}>{today}</Text>
            <Text style={styles.diaryTitle}>하루 일기</Text>
          </View>
          {/* hide '더보기' only when explicitly requested through route params */}
          {!hideMoreButton ? (
            <TouchableOpacity
              style={[styles.libraryButton, styles.moreButton]}
              onPress={() => {
                // ensure we navigate using the root navigator in case DiaryScreen is nested
                const parentNav = (navigation as any).getParent ? (navigation as any).getParent() : null;
                if (parentNav && parentNav.navigate) {
                  parentNav.navigate('DiaryList');
                  return;
                }
                if ((navigation as any).navigate) navigation.navigate('DiaryList');
              }}
              accessibilityLabel="더보기"
            >
              <Text style={styles.moreText}>더보기 &gt;</Text>
            </TouchableOpacity>
          ) : <View style={{ width: 76 }} />}
        </View>

  <View style={diaryCardStyle}>
          {/* For today's diary before 21:00, show the "waiting until 9PM" message only when there is NO diary yet. */}
          {(!dateParam && nowHour < 21) ? (
            loading ? (
              <ActivityIndicator />
            ) : (diary && diary.content) ? (
              <Text style={styles.diaryText}>{diary.content}</Text>
            ) : (
              <Text style={styles.diaryText}>{notFoundDetail === 'Diary not found for this date' ? '오늘 일기가 아직 없습니다.' : '오늘 하루 일기를 만들고 있어요…{"\n"}오늘 저녁 9시에 볼 수 있어요'}</Text>
            )
          ) : (
            loading ? (
              <ActivityIndicator />
            ) : (diary && diary.content) ? (
              <Text style={styles.diaryText}>{diary.content}</Text>
            ) : (
              <Text style={styles.placeholderText}>
                {notFoundDetail === 'Diary not found for this date' ? '오늘 일기가 아직 없습니다.' : `아직 일기가 없습니다. ${withWaOrGwa(petName)}와 대화를 나누고 하루를 기록해보세요.`}
              </Text>
            )
          )}
        </View>

  <View style={{ ...styles.diaryHeader, marginTop: 28 }}>
          <View>
            <Text style={styles.dateText}>하루를 마무리하는</Text>
            <View style={{ flexDirection: 'row' }}>
              <Text style={styles.diaryTitle}>{petName}의 답장</Text>
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

  <View style={diaryCardStyle}>
          {/* show advice if present, otherwise friendly placeholder */}
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
  diaryContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
  },
  diaryContainerToday: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
  },
  diaryContainerList: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
  },
  diaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    backgroundColor: '#E6E6E6',
    padding: 16,
    borderRadius: 16,
    marginTop: 0,
  },
  diaryCardToday: {
    backgroundColor: '#E6E6E6',
    padding: 16,
    borderRadius: 16,
    marginTop: 0,
  },
  diaryCardList: {
    backgroundColor: '#E6E6E6',
    padding: 16,
    borderRadius: 16,
    marginTop: 0,
  },
  diaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  libraryButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  moreButton: {
    // position inside header: small touch target but visually minimal
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignSelf: 'flex-start',
  },
  moreText: {
    color: '#8a8a8a',
    fontSize: 16,
    textDecorationLine: 'underline',
    textDecorationColor: '#cfcfcf',
    textDecorationStyle: 'solid',
    fontWeight: '600',
  },
  emojiTag: {
    marginRight: 8,
    color: '#666',
    fontSize: 14,
  },
  
  entryWrapper: {
    backgroundColor: 'transparent',
    padding: 0,
    borderRadius: 0,
  },
  entryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#999',
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  backButtonHeader: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backTextShort: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
});
