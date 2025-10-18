import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Switch,
  Animated,
  AppState,
} from "react-native";
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as Progress from "react-native-progress";
import { StatusBar } from "expo-status-bar";
import Toggle from "react-native-toggle-element";
import DiaryScreen from "./DiaryScreen";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;
const BUTTON_WIDTH = 64;
const BUTTON_MARGIN = 4; // marginHorizontal
const GROUP_COUNT = 5;
export default function MainScreen() {
  const navigation: any = useNavigation();
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState<"home" | "diary">("home");
  const [friendship, setFriendship] = useState(0.4);
  const [xp, setXp] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [recentLevelUp, setRecentLevelUp] = useState<number | null>(null);
  const levelUpOpacity = useRef(new Animated.Value(0)).current;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const [isTalking, setIsTalking] = useState(false);
  const [isFunActive, setIsFunActive] = useState(false);
  const [isHungry, setIsHungry] = useState(false);

  // animation refs for the 'fun' overlay
  const shakeAnim = useRef(new Animated.Value(0)).current; // translateX shake
  const funOpacity = useRef(new Animated.Value(0)).current; // fade in/out
  const funLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const funTimeoutRef = useRef<number | null>(null);
  // AsyncStorage key for last fed date
  const LAST_FED_KEY = "lastFedDate";
  const XP_KEY = 'comox_xp';
  const LEVEL_KEY = 'comox_level';
  const FEED_COUNT_PREFIX = 'comox_feed_'; // use with date
  const WALK_KEY_PREFIX = 'comox_walk_';
  // animation refs for the 'happy' overlay (used by 구해주기 & 밥주기)
  const happyAnim = useRef(new Animated.Value(0)).current;
  const happyOpacity = useRef(new Animated.Value(0)).current;
  const happyLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const happyTimeoutRef = useRef<number | null>(null);
  const [isHappyActive, setIsHappyActive] = useState(false);

  const headerHeight = 10;
  const cardHeight = screenHeight - headerHeight - insets.top - insets.bottom;

  const increaseFriendship = () => {
    setFriendship((prev) => {
      const next = prev + 0.1;
      return next >= 1 ? 0 : next;
    });
  };

  // XP / Level system helpers
  const deltaForLevel = (lvl: number) => {
    // delta from level n to n+1: 10 + 5*(n-1)
    return 10 + 5 * (lvl - 1);
  };

  const totalRequiredForLevel = (lvl: number) => {
    // total XP required to reach level `lvl` (lvl=1 => 0)
    let total = 0;
    for (let l = 1; l < lvl; l++) {
      total += deltaForLevel(l);
    }
    return total;
  };

  const getLevelFromXp = (totalXp: number) => {
    let l = 1;
    while (totalXp >= totalRequiredForLevel(l + 1)) {
      l++;
      // safety cap
      if (l > 1000) break;
    }
    return l;
  };

  const getProgressForLevel = (totalXp: number, lvl: number) => {
    const currentLevelTotal = totalRequiredForLevel(lvl);
    const nextLevelTotal = totalRequiredForLevel(lvl + 1);
    const progress = Math.max(0, Math.min(1, (totalXp - currentLevelTotal) / (nextLevelTotal - currentLevelTotal)));
    return progress || 0;
  };

  // load persisted xp/level on mount
  useEffect(() => {
    (async () => {
      try {
        const xpRaw = await AsyncStorage.getItem(XP_KEY);
        const levelRaw = await AsyncStorage.getItem(LEVEL_KEY);
        if (xpRaw) setXp(parseInt(xpRaw, 10) || 0);
        if (levelRaw) setLevel(parseInt(levelRaw, 10) || 1);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const persistXpLevel = async (newXp: number, newLevel: number) => {
    try {
      await AsyncStorage.setItem(XP_KEY, String(newXp));
      await AsyncStorage.setItem(LEVEL_KEY, String(newLevel));
    } catch (e) {
      // ignore
    }
  };

  const resetLevel = async () => {
    try {
      setXp(0);
      setLevel(1);
      await AsyncStorage.setItem(XP_KEY, '0');
      await AsyncStorage.setItem(LEVEL_KEY, '1');
    } catch (e) {
      // ignore
    }
  };

  const toggleDrawer = () => {
    const to = isDrawerOpen ? 0 : 1;
    setIsDrawerOpen(!isDrawerOpen);
    Animated.timing(drawerAnim, { toValue: to, duration: 300, useNativeDriver: true }).start();
  };

  const addXp = async (amount: number) => {
    setXp((prevXp) => {
      const updated = prevXp + amount;
      const newLevel = getLevelFromXp(updated);
      if (newLevel > level) {
        setLevel(newLevel);
        setRecentLevelUp(newLevel);
        // show toast
        setLevelUpVisible(true);
        Animated.timing(levelUpOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        // auto-hide
        setTimeout(() => {
          Animated.timing(levelUpOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
            setLevelUpVisible(false);
            setRecentLevelUp(null);
          });
        }, 2000);
        // celebrate level up
        startHappyAnimation();
      }
      // persist
      persistXpLevel(updated, newLevel);
      return updated;
    });
  };

  const handlePlay = () => {
    increaseFriendship();
    startFunAnimation();
    // 놀아주기: +1 XP
    addXp(1);
  };

  const handleGoWalk = () => {
    // 산책가기 동작: 임시로 친밀도 소폭 증가
    setFriendship((prev) => Math.min(1, prev + 0.05));
    // 산책은 하루 1회 +5XP
    (async () => {
      const today = getTodayString();
      const key = WALK_KEY_PREFIX + today;
      try {
        const v = await AsyncStorage.getItem(key);
        if (!v) {
          await AsyncStorage.setItem(key, '1');
          addXp(5);
        }
      } catch (e) {
        // ignore
      }
    })();
    // navigate to Walk screen
    navigation.navigate('Walk');
  };

  const startFunAnimation = () => {
    // prevent multiple starts
    if (isFunActive) return;
    setIsFunActive(true);

    // fade in
    funOpacity.setValue(0);
    Animated.timing(funOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // shaking loop
    const singleShake = Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -10, duration: 350, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 350, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 280, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 280, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);

    funLoopRef.current = Animated.loop(singleShake);
    funLoopRef.current.start();

    // stop after ~5s
    if (funTimeoutRef.current) {
      clearTimeout(funTimeoutRef.current);
    }
    // @ts-ignore - window.setTimeout return type for RN
    funTimeoutRef.current = setTimeout(() => {
      // stop loop
      if (funLoopRef.current) funLoopRef.current.stop();
      // fade out
      Animated.timing(funOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsFunActive(false);
        shakeAnim.setValue(0);
      });
    }, 5000);
  };

  const startHappyAnimation = () => {
    if (isHappyActive) return;
    setIsHappyActive(true);

    // fade in
    happyOpacity.setValue(0);
    Animated.timing(happyOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // same shaking loop but driven by happyAnim
    const singleShakeHappy = Animated.sequence([
      Animated.timing(happyAnim, { toValue: -10, duration: 350, useNativeDriver: true }),
      Animated.timing(happyAnim, { toValue: 10, duration: 350, useNativeDriver: true }),
      Animated.timing(happyAnim, { toValue: -6, duration: 280, useNativeDriver: true }),
      Animated.timing(happyAnim, { toValue: 6, duration: 280, useNativeDriver: true }),
      Animated.timing(happyAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);

    happyLoopRef.current = Animated.loop(singleShakeHappy);
    happyLoopRef.current.start();

    if (happyTimeoutRef.current) clearTimeout(happyTimeoutRef.current);
    // @ts-ignore
    happyTimeoutRef.current = setTimeout(() => {
      if (happyLoopRef.current) happyLoopRef.current.stop();
      Animated.timing(happyOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsHappyActive(false);
        happyAnim.setValue(0);
      });
    }, 5000);
  };

  const getTodayString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const checkIfHungry = async () => {
    try {
      const last = await AsyncStorage.getItem(LAST_FED_KEY);
      const today = getTodayString();
      if (last === today) {
        setIsHungry(false);
      } else {
        setIsHungry(true);
      }
    } catch (e) {
      // ignore read errors
      setIsHungry(true);
    }
  };

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (funLoopRef.current) funLoopRef.current.stop();
      if (happyLoopRef.current) happyLoopRef.current.stop();
      if (funTimeoutRef.current) clearTimeout(funTimeoutRef.current);
      if (happyTimeoutRef.current) clearTimeout(happyTimeoutRef.current);
    };
  }, []);

  // check hunger on mount and when app comes to foreground
  useEffect(() => {
    checkIfHungry();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        checkIfHungry();
      }
    });
    return () => sub.remove();
  }, []);

  const handleFeed = () => {
    increaseFriendship();
    startHappyAnimation();
    // persist today's date as last fed
    (async () => {
      try {
        await AsyncStorage.setItem(LAST_FED_KEY, getTodayString());
        setIsHungry(false);
        // feed count limit 3/day: key per date
        const today = getTodayString();
        const feedKey = FEED_COUNT_PREFIX + today;
        const raw = await AsyncStorage.getItem(feedKey);
        const count = raw ? parseInt(raw, 10) : 0;
        if (count < 3) {
          await AsyncStorage.setItem(feedKey, String(count + 1));
          addXp(5);
        }
      } catch (e) {
        // ignore write errors
      }
    })();
  };

  const handleMove = () => {
    // 움직이기 동작 (임시: 친밀도 증가)
    increaseFriendship();
    // 움직이기: 소폭 XP
    addXp(1);
  };

  const handleSave = () => {
    // 구해주기 동작 (임시: 친밀도 증가)
    increaseFriendship();
    startHappyAnimation();
    // 구해주기: +2XP
    addXp(2);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setCurrentPage("home")}
          >
            {currentPage === "home" ? (
              <View style={styles.dot} />
            ) : (
              <View style={styles.hiddenDot} />
            )}
            <Text
              style={[
                styles.headerText,
                currentPage !== "home" && styles.inactiveText,
              ]}
            >
              홈
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setCurrentPage("diary")}
          >
            {currentPage === "diary" ? (
              <View style={styles.dot} />
            ) : (
              <View style={styles.hiddenDot} />
            )}
            <Text
              style={[
                styles.headerText,
                currentPage !== "diary" && styles.inactiveText,
              ]}
            >
              하루일기장
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={toggleDrawer} style={{ padding: 6 }}>
          <Text style={[styles.menuIcon, { fontSize: 30, transform: [{ translateX: -4 }, { scaleX: 1.9 }, { scaleY: 1.9 }] }]}>≡</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { height: cardHeight }]}> 
        {currentPage === "home" && (
          <>
            <Image
              source={isHungry ? require("../assets/state_hungry.png") : require("../assets/dog.png")}
              style={styles.dogImageBackground}
            />
            
            <View style={styles.cardContent}>
              <View style={styles.progressContainer}>
                <View style={styles.progressTitleRow}>
                  <Text style={styles.progressTitle}>
                    <Text style={styles.bold}>코모</Text> 와의 친밀도
                  </Text>
                  <Text style={styles.levelText}>Lv.{level}</Text>
                </View>

                <View style={styles.progressBarWrapper}>
                  <Image
                    source={require("../assets/minidog.png")}
                    style={styles.miniDogOnBar}
                  />
                  <Progress.Bar
                    progress={getProgressForLevel(xp, level)}
                    width={screenWidth * 0.8}
                    height={14}
                    borderRadius={10}
                    color="#3f3023"
                    unfilledColor="#ccc"
                    borderWidth={0}
                  />

                </View>
              </View>

              <Text style={styles.motivationText}>
                자신의 가능성을 믿어보세요!
              </Text>

              {levelUpVisible && recentLevelUp !== null && (
                <Animated.View style={[styles.levelUpToast, { opacity: levelUpOpacity }]} pointerEvents="none">
                  <Text style={styles.levelUpText}>레벨업! Lv.{recentLevelUp}</Text>
                </Animated.View>
              )}

              {/* Fun overlay: appears just below the motivation text when '놀아주기' is pressed */}
              <Animated.Image
                source={require("../assets/state_fun.png")}
                style={[
                  styles.funOverlay,
                  {
                    transform: [{ translateY: shakeAnim }],
                    opacity: funOpacity,
                  },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />

              {/* Happy overlay: appears in same place for '구해주기' and '밥주기' */}
              <Animated.Image
                source={require("../assets/state_happy.png")}
                style={[
                  styles.funOverlay,
                  {
                    transform: [{ translateY: happyAnim }],
                    opacity: happyOpacity,
                  },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />

              <View style={{ width: '100%', alignItems: 'center', marginVertical: 10, top: 120 }}>
                <View style={{ transform: [{ translateX: -12 }, { scaleX: 1.7 }, { scaleY: 1.7 }], marginBottom: 6 }}>
                  <Switch
                    trackColor={{ false: "#767577", true: "#715C46" }}
                    thumbColor={isTalking ? "#443627" : "#443627"}
                    onValueChange={() =>
                      setIsTalking((previousState) => !previousState)
                    }
                    value={isTalking}
                  />
                </View>
                <Text style={styles.toggleText}>대화하기</Text>
              </View>

              <View style={styles.buttonRow}>
                <View style={styles.buttonGroup}>
                <TouchableOpacity style={styles.button} onPress={handlePlay}>
                  <Image
                    source={{
                      uri: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Boomerang.png",
                    }}
                    style={{ width: 48, height: 48 }}
                    accessibilityLabel="Boomerang"
                  />
                  <Text style={styles.buttonText}>놀아주기</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleGoWalk}>
                  <Image
                    source={require("../assets/gowalk.png")}
                    style={{ width: 48, height: 48 }}
                    accessibilityLabel="Go Walk"
                  />
                  <Text style={styles.buttonText}>산책가기</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleMove}>
                  <Image
                    source={require("../assets/start.png")}
                    style={{ width: 48, height: 48 }}
                    accessibilityLabel="Start"
                  />
                  <Text style={styles.buttonText}>움직이기</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleSave}>
                  <Image
                    source={require("../assets/save.png")}
                    style={{ width: 48, height: 48 }}
                    accessibilityLabel="Save"
                  />
                  <Text style={[styles.buttonText, styles.saveButtonText]}>구해주기</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleFeed}>
                  <Image
                    source={{
                      uri: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Fork%20and%20Knife%20with%20Plate.png",
                    }}
                    style={{ width: 48, height: 48 }}
                    accessibilityLabel="Fork and Knife with Plate"
                  />
                  <Text style={styles.buttonText}>밥주기</Text>
                </TouchableOpacity>
                </View>
              </View>

              {/* Dev buttons removed — use top-right menu icon to reload in dev */}
            </View>
          </>
        )}

        {currentPage === "diary" && <DiaryScreen />}
      </View>
      {/* Right drawer: animated slide from right */}
      <Animated.View
        pointerEvents={isDrawerOpen ? 'auto' : 'none'}
        style={[
          styles.rightDrawer,
          {
            transform: [
              {
                translateX: drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [screenWidth, screenWidth * 0.28] }),
              },
            ],
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>마이페이지</Text>
          <TouchableOpacity onPress={toggleDrawer}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16 }}>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>레벨: Lv.{level}</Text>
          <Text>XP: {xp}</Text>
          <TouchableOpacity onPress={resetLevel} style={{ marginTop: 12, backgroundColor: '#3f3023', padding: 10, borderRadius: 8 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>레벨 리셋 (Lv.1)</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#3f3023",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 20,
  },
  headerButton: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: 42,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "white",
    marginBottom: 4,
  },
  hiddenDot: {
    width: 6,
    height: 6,
    marginBottom: 4,
    opacity: 0,
  },
  headerText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "white",
  },
  inactiveText: {
    opacity: 0.4,
  },
  menuIcon: {
    transform: [{ translateX: -8 }, { scaleX: 1.7 }, { scaleY: 1.7 }],
    color: "white",
  },
  card: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    position: "relative",
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  dogImageBackground: {
    position: "absolute",
    alignSelf: "center",
    top: -150,
    width: 700,
    height: 900,
    resizeMode: "contain",
    zIndex: 0,
  },
  progressContainer: {
    width: "100%",
    zIndex: 1,
  },
  progressTitle: {
    fontSize: 18,
    color: "#000",
    paddingLeft: 20,
    paddingBottom: 3,
  },
  progressBarWrapper: {
    width: screenWidth * 0.8,
    alignSelf: "center",
    justifyContent: "center",
    position: "relative",
    height: 48,
  },
  miniDogOnBar: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#3f3023",
    backgroundColor: "#fff",
    zIndex: 2,
    resizeMode: "cover",
  },
  bold: {
    fontWeight: "bold",
    fontSize: 24,
  },
  motivationText: {
    fontSize: 24,
    top: -100,
    fontWeight: "bold",
    color: "#000",
    zIndex: 1,
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    zIndex: 1,
    paddingBottom: 30,
  },
  buttonGroup: {
    // fixed-calculated group width so the 5 buttons sit in a single centered transparent box
    width: BUTTON_WIDTH * GROUP_COUNT + BUTTON_MARGIN * 2 * GROUP_COUNT,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  button: {
    backgroundColor: "#3f3023",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    width: 64,
    marginHorizontal: 4,
  },
  emoji: {
    fontSize: 70,
  },
  buttonText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  saveButtonText: {
    marginTop: 6,
  },
  toggleText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  funOverlay: {
    position: "absolute",
    width: 140,
    height: 140,
    resizeMode: "contain",
    top: 135,
    alignSelf: "center",
    zIndex: 5,
  },
  progressTitleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3f3023',
  },
  levelUpToast: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(63,48,35,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 40,
  },
  levelUpText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  rightDrawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: screenWidth * 0.72,
    backgroundColor: '#fff',
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 20,
    color: '#333',
  },
});
