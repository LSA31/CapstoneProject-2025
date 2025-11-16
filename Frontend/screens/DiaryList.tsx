import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { listDiaries, type DiaryItem } from '../services/diary';

export default function DiaryList() {
  const navigation: any = useNavigation();
  const insets = useSafeAreaInsets();
  // reduce top padding so the list appears higher on the screen when opened
  // be more aggressive so the header sits closer to the top
  const topPadding = Math.max(0, (insets.top || 0) - 40);
  const [items, setItems] = useState<DiaryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugMsg, setDebugMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        // request list for today's date so backend which expects ?date=YYYY-MM-DD responds
        const d = new Date();
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const res = await listDiaries(iso);
        if (!mounted) return;
        // filter out entries with empty/blank content so they are not shown
        let filtered = (res || []).filter((it: DiaryItem) => typeof it.content === 'string' && it.content.trim().length > 0);
        // sort by date descending (newest first). Use Date parse to handle various date formats.
        filtered = filtered.sort((a, b) => {
          const ta = a.date ? new Date(a.date).getTime() : 0;
          const tb = b.date ? new Date(b.date).getTime() : 0;
          return tb - ta;
        });
        setItems(filtered);
        // only show debug message when there are visible items
        if (filtered.length > 0) {
          setDebugMsg(`loaded ${filtered.length} items`);
        } else {
          setDebugMsg(null);
        }
      } catch (e: any) {
        console.warn('list diaries failed', e);
        if (mounted) setItems([]);
        setDebugMsg(String(e?.message || e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // hide default navigation header so our custom header is the only one shown
  useLayoutEffect(() => {
    if (navigation && navigation.setOptions) {
      navigation.setOptions({ headerShown: false });
      // also hide parent header if present (avoid duplicate system back button)
      try { navigation.getParent && navigation.getParent().setOptions && navigation.getParent().setOptions({ headerShown: false }); } catch (e) {}
    }
  }, [navigation]);

  if (loading) return (
    <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingTop: topPadding }]}>
      <ActivityIndicator />
    </SafeAreaView>
  );

  const visibleItems = (items || []).filter((it) => typeof it.content === 'string' && it.content.trim().length > 0);

  if (visibleItems.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.screenHeader}>
          <TouchableOpacity onPress={() => {
            if (navigation.canGoBack && navigation.canGoBack()) return navigation.goBack();
            if ((navigation as any).navigate) return navigation.navigate('MainApp' as any);
          }} style={styles.backButtonHeader} accessibilityLabel="뒤로가기">
            <Text style={styles.backTextShort}>{'<'}</Text>
          </TouchableOpacity>
          <View style={{ width: 76 }} />
  </View>
  <View style={{ height: 12 }} />
        {debugMsg ? <Text style={{ textAlign: 'center', marginTop: 8, color: '#999' }}>{debugMsg}</Text> : null}
        <Text style={{ textAlign: 'center', marginTop: 24, color: '#666' }}>아직 작성된 일기가 없습니다.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => {
          // simple retry: reload by resetting state and triggering effect
          setItems(null);
          setLoading(true);
          (async () => {
            try {
                const res = await listDiaries();
                let filtered = (res || []).filter((it: DiaryItem) => typeof it.content === 'string' && it.content.trim().length > 0);
                filtered = filtered.sort((a, b) => {
                  const ta = a.date ? new Date(a.date).getTime() : 0;
                  const tb = b.date ? new Date(b.date).getTime() : 0;
                  return tb - ta;
                });
                setItems(filtered);
                if (filtered.length > 0) setDebugMsg(`loaded ${filtered.length} items`); else setDebugMsg(null);
            } catch (e: any) {
              setDebugMsg(String(e?.message || e));
            } finally {
              setLoading(false);
            }
          })();
        }}>
          <Text style={styles.refreshText}>목록 새로고침</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={() => {
          if (navigation.canGoBack && navigation.canGoBack()) return navigation.goBack();
          // fallback: navigate to MainApp and open diary tab
          if ((navigation as any).navigate) return navigation.navigate('MainApp' as any);
        }} style={styles.backButtonHeader} accessibilityLabel="뒤로가기">
          <Text style={styles.backTextShort}>{'<'}</Text>
          
        </TouchableOpacity>
        <View style={{ width: 76 }} />
      </View>
      <View style={{ height: 15 }} />
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.diary_id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              if ((navigation as any).navigate) navigation.navigate('Diary', { date: item.date, fromList: true, hideMore: true });
            }}
          >
            <View style={styles.itemLeft}>
              <Text style={styles.itemDate}>{item.date} 일기장 {'\n'}</Text>
              <Text
                style={styles.itemTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.content ? (item.content.length > 30 ? item.content.substring(0, 30) + '...' : item.content) : '제목 없음'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backButton: { padding: 6 },
  backText: { color: '#007AFF', fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  refreshButton: { marginTop: 18, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#3f3023' },
  refreshText: { color: '#fff', fontWeight: '700' },
  item: { padding: 12, borderRadius: 10, backgroundColor: '#f2f2f2', marginBottom: 22 },
  itemLeft: { marginBottom: 6 },
  itemDate: { fontSize: 18, fontWeight: '700', color: '#000' },
  itemTitle: { fontSize: 16, fontWeight: '700', color: '#626060ff' },
  itemSnippet: { fontSize: 14, color: '#333', marginTop: 6 },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
    marginTop: -20,
  },
  backButtonHeader: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backTextShort: { color: '#000', fontSize: 18, fontWeight: '700' },
  screenTitle: { fontSize: 18, fontWeight: '700' },
});
