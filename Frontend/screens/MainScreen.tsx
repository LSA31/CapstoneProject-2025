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
import { sendEvent } from '../services/event';
import { sendHardwareEvent } from '../services/hardware';
import { getDeviceId } from '../utils/device';
import { getComo } from '../services/como';
import { endWalk } from '../services/walk';
import { startAffinitySocket, stopAffinitySocket } from '../services/affinity';

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
  const [petName, setPetName] = useState<string>('코모');
  const [barWidth, setBarWidth] = useState<number>(0);
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
  const dogPosAnim = useRef(new Animated.Value(0)).current;
  const DOG_SIZE = 40;
  const funLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const funTimeoutRef = useRef<number | null>(null);
  // AsyncStorage key for last fed date
  const LAST_FED_KEY = "lastFedDate";
  const XP_KEY = 'comox_xp';
  const LEVEL_KEY = 'comox_level';
  const FEED_COUNT_PREFIX = 'comox_feed_'; // use with date
  const WALK_KEY_PREFIX = 'comox_walk_';
  const WALK_ACTIVE_KEY = 'comox_walk_active';
  // animation refs for the 'happy' overlay (used by 구해주기 & 밥주기)
  const happyAnim = useRef(new Animated.Value(0)).current;
  const happyOpacity = useRef(new Animated.Value(0)).current;
  const happyLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const happyTimeoutRef = useRef<number | null>(null);
  const [isHappyActive, setIsHappyActive] = useState(false);
  const [isWalkingActive, setIsWalkingActive] = useState(false);

  

  // local quotes array for MainScreen - rotates on mount / when app becomes active
  const QUOTES = [
    '작은 발걸음이 큰 변화를 만든다.',
    '오늘의 노력이 내일의 나를 만든다.',
    '실패는 성공의 어머니다. 다시 도전해보자.',
    '포기하지 않으면 가능성은 계속된다.',
    '한 걸음 더 나아가는 용기가 필요하다.',
    '너는 이미 충분히 잘하고 있어.',
    '하루의 시작은 작은 감사에서 온다.',
    '지금의 나를 인정해 주는 하루가 되길.',
    '성장은 불편함에서 시작된다.',
    '오늘의 선택이 내일의 결과를 만든다.'
  ];
  const [quote, setQuote] = useState<string>('');

  const pickRandomQuote = (prev?: string) => {
    if (QUOTES.length === 0) return;
    let next = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    // avoid immediate repeat when possible
    if (prev && QUOTES.length > 1) {
      let attempts = 0;
      while (next === prev && attempts < 5) {
        next = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        attempts++;
      }
    }
    setQuote(next);
  };

  // pick initial quote on mount and whenever app becomes active
  useEffect(() => {
    pickRandomQuote();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        pickRandomQuote(quote);
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const denom = nextLevelTotal - currentLevelTotal || 1; // avoid div by zero
    const progress = Math.max(0, Math.min(1, (totalXp - currentLevelTotal) / denom));
    return progress || 0;
  };

  // Convenience helpers that mirror backend logic for thresholds.
  const xpForNextLevel = (totalXp: number, lvl: number) => {
    const nextLevelTotal = totalRequiredForLevel(lvl + 1);
    return nextLevelTotal;
  };

  const xpForCurrentLevel = (lvl: number) => {
    return totalRequiredForLevel(lvl);
  };

  // load persisted xp/level on mount
  useEffect(() => {
    (async () => {
      try {
        const xpRaw = await AsyncStorage.getItem(XP_KEY);
        const levelRaw = await AsyncStorage.getItem(LEVEL_KEY);
        if (xpRaw) setXp(parseInt(xpRaw, 10) || 0);
        if (levelRaw) setLevel(parseInt(levelRaw, 10) || 1);
        // try to fetch current Como info from server
        try {
          const c = await getComo();
          if (c) {
            if (c.name) setPetName(c.name);
            if (typeof c.experience === 'number') {
              setXp(c.experience);
              const newLevel = getLevelFromXp(c.experience);
              setLevel(newLevel);
              await persistXpLevel(c.experience, newLevel);
            }
            if (typeof c.level === 'number') {
              setLevel(c.level);
              await AsyncStorage.setItem(LEVEL_KEY, String(c.level));
            }
            // sync hunger state if server provides it
            try {
              if (typeof c.state === 'string') {
                const s = c.state.toUpperCase();
                if (s === 'HUNGRY') {
                  await AsyncStorage.removeItem(LAST_FED_KEY);
                  setIsHungry(true);
                } else {
                  // consider any non-HUNGRY state as not hungry and persist today's fed marker
                  await AsyncStorage.setItem(LAST_FED_KEY, (() => { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; })());
                  setIsHungry(false);
                }
              }
            } catch (ee) {
              // ignore storage sync errors
            }
          }
        } catch (e) {
          // ignore fetch errors
        }
      } catch (e) {
        // ignore
      }
    })();
    // initial position will be set by xp/level effect once layout (barWidth) is known
  }, []);

  // refresh xp/level/was_hungry when screen gains focus (after events like walk end)
  useEffect(() => {
    const unsub = (navigation as any).addListener?.('focus', async () => {
      try {
        // refresh from server if possible
        try {
          const c = await getComo();
          if (c) {
            if (c.name) setPetName(c.name);
            if (typeof c.experience === 'number') {
              setXp(c.experience);
              const newLevel = getLevelFromXp(c.experience);
              setLevel(newLevel);
              await persistXpLevel(c.experience, newLevel);
            }
            if (typeof c.level === 'number') {
              setLevel(c.level);
              await AsyncStorage.setItem(LEVEL_KEY, String(c.level));
            }
          }
        } catch (err) {
          // fallback to persisted values
          const xpRaw = await AsyncStorage.getItem(XP_KEY);
          const levelRaw = await AsyncStorage.getItem(LEVEL_KEY);
          if (xpRaw) setXp(parseInt(xpRaw, 10) || 0);
          if (levelRaw) setLevel(parseInt(levelRaw, 10) || 1);
        }

        const lastFed = await AsyncStorage.getItem(LAST_FED_KEY);
        const today = (() => {
          const d = new Date();
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        })();
        setIsHungry(lastFed !== today);
        // load walk active flag
        try {
          const wa = await AsyncStorage.getItem(WALK_ACTIVE_KEY);
          setIsWalkingActive(!!wa);
        } catch (e) {
          // ignore
        }
        // dog position will be animated by xp/level effect (depends on barWidth)
      } catch (e) {
        // ignore
      }
    });
    return () => unsub && unsub();
  }, [navigation, xp, level]);

  // whenever xp/level changes, animate the dog position along the bar
  useEffect(() => {
    try {
      const BAR_WIDTH = barWidth > 0 ? barWidth : screenWidth * 0.8;
      const target = (BAR_WIDTH - DOG_SIZE) * getProgressForLevel(xp, level);
      // if barWidth is not yet measured, setValue to avoid animation jump on first layout
      if (barWidth > 0) {
        Animated.timing(dogPosAnim, { toValue: target, duration: 300, useNativeDriver: true }).start();
      } else {
        dogPosAnim.setValue(target);
      }
    } catch (e) {
      // ignore
    }
  }, [xp, level, barWidth]);

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

  const TUTORIAL_DONE_KEY = 'hasSeenTutorial';

  const handleLogout = async () => {
    try {
      // simple logout: clear relevant keys and navigate to Login
      await AsyncStorage.removeItem(XP_KEY);
      await AsyncStorage.removeItem(LEVEL_KEY);
      await AsyncStorage.removeItem(LAST_FED_KEY);
      // optionally clear all (be conservative)
      // await AsyncStorage.clear();
      // navigate to Login screen if exists
      navigation.navigate('Login' as any);
    } catch (e) {
      // ignore
    }
  };

  // Force hungry - clears last fed and marks hungry
  const setHungryNow = async () => {
    try {
      await AsyncStorage.removeItem(LAST_FED_KEY);
      setIsHungry(true);
      // optional: clear today's feed count key to allow feeding again
    } catch (e) {
      // ignore
    }
  };

  const handleReplayTutorial = async () => {
    try {
      // Clear the same key used by Login/Tutorial screens so replay works
      await AsyncStorage.removeItem(TUTORIAL_DONE_KEY);
      // navigate to tutorial start (replace stack so user starts fresh)
      navigation.replace('Tutorial1' as any);
      // close drawer if open
      if (isDrawerOpen) toggleDrawer();
    } catch (e) {
      // ignore
    }
  };

  const handleEditProfile = () => {
    // placeholder: if profile screen exists, navigate; otherwise show an alert/modal
    if ((navigation as any).navigate) {
      navigation.navigate('Profile' as any);
    }
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
    // local animations/UX
    increaseFriendship();
    startFunAnimation();
    // call backend event for PLAY
    (async () => {
      try {
        const res = await sendEvent('PLAY');
        // Server may return only level/state/was_hungry (no experience).
        // If experience is present, use it. Otherwise try to fetch full Como via GET /como.
        let newXp: number;
        let newLevel: number;
        if (typeof res?.experience === 'number') {
          newXp = res.experience;
          newLevel = typeof res?.level === 'number' ? res.level : getLevelFromXp(newXp);
        } else {
          try {
            const c = await getComo();
            if (c && typeof c.experience === 'number') {
              newXp = c.experience;
              newLevel = typeof c.level === 'number' ? c.level : getLevelFromXp(newXp);
            } else {
              // fallback: if server gave level, use start XP for that level
              newLevel = typeof res?.level === 'number' ? res.level : level;
              newXp = totalRequiredForLevel(newLevel);
            }
              // sync hunger state from GET /como when available
              try {
                if (c && typeof c.state === 'string') {
                  const s = c.state.toUpperCase();
                  if (s === 'HUNGRY') {
                    await AsyncStorage.removeItem(LAST_FED_KEY);
                    setIsHungry(true);
                  } else {
                    // persist fed marker for today
                    const today = (() => { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; })();
                    await AsyncStorage.setItem(LAST_FED_KEY, today);
                    setIsHungry(false);
                  }
                }
              } catch (ee) {
                // ignore storage sync errors
              }
          } catch (e) {
            newLevel = typeof res?.level === 'number' ? res.level : level;
            newXp = totalRequiredForLevel(newLevel);
          }
        }

        setXp(newXp);
        setLevel(newLevel);
        await persistXpLevel(newXp, newLevel);
        if (res.was_hungry) setIsHungry(true); else setIsHungry(false);
      } catch (e) {
        // fallback: local increment
        try {
          // eslint-disable-next-line no-console
          console.warn('[MainScreen] sendEvent PLAY failed', e);
        } catch (ee) {}
        // optionally fallback to local XP increment
        // addXp(1);
      }
    })();
  };


  const handleToggleTalking = async () => {
    // toggle local state and notify hardware
    const next = !isTalking;
    setIsTalking(next);
    try {
      const deviceId = await getDeviceId();
      await sendHardwareEvent(deviceId, next ? 'TALK' : 'TALK_STOP');
    } catch (e) {
      // ignore hardware send errors, but keep UI state
      console.warn('sendHardwareEvent (talk) failed', e);
    }
  };

  const handleGoWalk = () => {
    // 산책가기 동작: 임시로 친밀도 소폭 증가
    setFriendship((prev) => Math.min(1, prev + 0.05));
    // 산책은 하루 1회 +5XP
    (async () => {
      try {
        await AsyncStorage.setItem(WALK_ACTIVE_KEY, '1');
        setIsWalkingActive(true);
      } catch (e) {
        // ignore
      }
      const today = (() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      })();
      const key = WALK_KEY_PREFIX + today;
      try {
        const v = await AsyncStorage.getItem(key);
        if (!v) {
          await AsyncStorage.setItem(key, '1');
          // addXp(5);
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

  // start websocket listener for affinity updates (ws/affinity)
  useEffect(() => {
    const stop = startAffinitySocket(async (msg: any) => {
      try {
  // If the websocket message already contains useful fields, apply them immediately
        // so the UI reflects changes without waiting for GET /como. Otherwise fall back to GET /como.
        const payload = msg && typeof msg === 'object' ? msg : null;
        let usedPayload = false;

        if (payload) {
          try {
            // quick-path: apply fields present in the payload
            if (payload.name) {
              setPetName(payload.name);
              usedPayload = true;
            }
            if (typeof payload.experience === 'number') {
              setXp(payload.experience);
              const newLevel = getLevelFromXp(payload.experience);
              setLevel(newLevel);
              await persistXpLevel(payload.experience, newLevel);
              usedPayload = true;
            }
            if (typeof payload.level === 'number') {
              setLevel(payload.level);
              await AsyncStorage.setItem(LEVEL_KEY, String(payload.level));
              usedPayload = true;
            }
            const affinityVal = (typeof payload.affinity === 'number' && payload.affinity)
              || (typeof payload.affection === 'number' && payload.affection)
              || (typeof payload.friendship === 'number' && payload.friendship)
              || (typeof payload.like === 'number' && payload.like);
            if (typeof affinityVal === 'number') {
              let v = affinityVal;
              if (v > 1) v = Math.min(1, v / 100);
              setFriendship(Math.max(0, Math.min(1, v)));
              startHappyAnimation();
              usedPayload = true;
            }
            if (typeof payload.state === 'string') {
              const s = payload.state.toUpperCase();
              if (s === 'HUNGRY') {
                await AsyncStorage.removeItem(LAST_FED_KEY);
                setIsHungry(true);
              } else {
                const today = getTodayString();
                await AsyncStorage.setItem(LAST_FED_KEY, today);
                setIsHungry(false);
              }
              usedPayload = true;
            }
          } catch (ee) {
            // ignore payload apply errors and fall back to GET
            usedPayload = false;
          }
        }

        if (!usedPayload) {
          // fallback: re-fetch latest Como so UI can update
          try {
            const c = await getComo();
            if (!c) return;
            try {
              if (c.name) setPetName(c.name);
              if (typeof c.experience === 'number') {
                setXp(c.experience);
                const newLevel = getLevelFromXp(c.experience);
                setLevel(newLevel);
                await persistXpLevel(c.experience, newLevel);
              }
              if (typeof c.level === 'number') {
                setLevel(c.level);
                await AsyncStorage.setItem(LEVEL_KEY, String(c.level));
              }
              const affinityVal = (typeof c.affinity === 'number' && c.affinity)
                || (typeof c.affection === 'number' && c.affection)
                || (typeof c.friendship === 'number' && c.friendship)
                || (typeof c.like === 'number' && c.like);
              if (typeof affinityVal === 'number') {
                let v = affinityVal;
                if (v > 1) v = Math.min(1, v / 100);
                setFriendship(Math.max(0, Math.min(1, v)));
                startHappyAnimation();
              }
              if (typeof c.state === 'string') {
                const s = c.state.toUpperCase();
                if (s === 'HUNGRY') {
                  await AsyncStorage.removeItem(LAST_FED_KEY);
                  setIsHungry(true);
                } else {
                  const today = getTodayString();
                  await AsyncStorage.setItem(LAST_FED_KEY, today);
                  setIsHungry(false);
                }
              }
            } catch (ee) {
              // ignore per-field sync errors
            }
          } catch (e) {
            // ignore fetch errors
          }
        }
        
      } catch (e) {
        // ignore top-level errors
      }
    });
    return () => {
      try { stop && stop(); } catch (e) {}
      try { stopAffinitySocket(); } catch (e) {}
    };
  }, []);

  const handleFeed = () => {
    increaseFriendship();
    startHappyAnimation();
    // call backend event for FEED and update state from server
    (async () => {
      try {
        const res = await sendEvent('FEED');
        // Server may return only level/state/was_hungry. If experience missing, fetch Como.
        let newXp: number;
        let newLevel: number;
        if (typeof res?.experience === 'number') {
          newXp = res.experience;
          newLevel = typeof res?.level === 'number' ? res.level : getLevelFromXp(newXp);
        } else {
          try {
            const c = await getComo();
            if (c && typeof c.experience === 'number') {
              newXp = c.experience;
              newLevel = typeof c.level === 'number' ? c.level : getLevelFromXp(newXp);
            } else {
              newLevel = typeof res?.level === 'number' ? res.level : level;
              newXp = totalRequiredForLevel(newLevel);
            }
              // sync hunger state from GET /como when available
              try {
                if (c && typeof c.state === 'string') {
                  const s = c.state.toUpperCase();
                  if (s === 'HUNGRY') {
                    await AsyncStorage.removeItem(LAST_FED_KEY);
                    setIsHungry(true);
                  } else {
                    await AsyncStorage.setItem(LAST_FED_KEY, (() => { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; })());
                    setIsHungry(false);
                  }
                }
              } catch (ee) {
                // ignore storage sync errors
              }
          } catch (e) {
            newLevel = typeof res?.level === 'number' ? res.level : level;
            newXp = totalRequiredForLevel(newLevel);
          }
        }

        setXp(newXp);
        setLevel(newLevel);
        await persistXpLevel(newXp, newLevel);
        // update hungry state
        if (res.was_hungry) setIsHungry(true); else setIsHungry(false);
  // also persist last fed date when server acknowledges feed
  await AsyncStorage.setItem(LAST_FED_KEY, (() => { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; })());
      } catch (e) {
        // fallback: local behavior
        try {
          // eslint-disable-next-line no-console
          console.warn('[MainScreen] sendEvent FEED failed', e);
        } catch (ee) {}
        (async () => {
            try {
              await AsyncStorage.setItem(LAST_FED_KEY, (() => { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; })());
              setIsHungry(false);
              const today = (() => { const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; })();
            const feedKey = FEED_COUNT_PREFIX + today;
            const raw = await AsyncStorage.getItem(feedKey);
            const count = raw ? parseInt(raw, 10) : 0;
            if (count < 3) {
              await AsyncStorage.setItem(feedKey, String(count + 1));
              // addXp(5);
            }
          } catch (ee) {
            // ignore
          }
        })();
      }
    })();
  };

  const handleMove = () => {
    // 움직이기 동작 (임시: 친밀도 증가)
    increaseFriendship();
    // 움직이기: 소폭 XP
    // addXp(1);
  };

  const [isMoving, setIsMoving] = useState(false);

  const handleStop = () => {
    // 멈춤 동작: 현재는 상태 토글만 처리
    setIsMoving(false);
    // 필요시 추가 행동을 여기에 구현
  };

  const handleToggleMove = async () => {
    if (!isMoving) {
      // start moving: send START to hardware
      setIsMoving(true);
      handleMove();
      try {
        const deviceId = await getDeviceId();
        await sendHardwareEvent(deviceId, 'START');
      } catch (e) {
        console.warn('sendHardwareEvent (START) failed', e);
      }
    } else {
      // stop moving: send STOP
      handleStop();
      try {
        const deviceId = await getDeviceId();
        await sendHardwareEvent(deviceId, 'STOP');
      } catch (e) {
        console.warn('sendHardwareEvent (STOP) failed', e);
      }
      setIsMoving(false);
    }
  };

  const handleSave = () => {
    // 구해주기 동작 (임시: 친밀도 증가)
    increaseFriendship();
    // 구해주기: +2XP
    // addXp(2);
    // send BACK to hardware
    (async () => {
      try {
        const deviceId = await getDeviceId();
        await sendHardwareEvent(deviceId, 'BACK');
        // After save, if the UI is currently showing '멈춤' (isMoving === true),
        // switch it to stopped so the button shows '움직이기'.
        // Do not send hardware STOP here; just update UI state per UX request.
        try {
          if (isMoving) setIsMoving(false);
        } catch (ee) {
          // ignore
        }
      } catch (e) {
        console.warn('sendHardwareEvent (BACK) failed', e);
      }
    })();
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
        <TouchableOpacity onPress={toggleDrawer} style={{ padding: 4, alignSelf: 'center' }}>
          <Text style={[styles.menuIcon, { fontSize: 20, transform: [{ translateX: -2 }, { translateY: 7 }, { scaleX: 1.5 }, { scaleY: 1.5 }] }]}>≡</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { height: cardHeight }]}> 
        {currentPage === "home" && (
          <>
            <Image
              source={isHungry ? require("../assets/state_hungry.png") : require("../assets/dog.png")}
              style={styles.dogImageBackground}
            />
            {isHungry && (
              <View style={{ position: 'absolute', top: 220, right: 70, zIndex: 50 }} pointerEvents="none">
                <Text style={styles.hungryLabelOverlay}>배고파..</Text>
              </View>
            )}
            
            <View style={styles.cardContent}>
              <View style={styles.progressContainer}>
                <View style={styles.progressTitleRow}>
                  <Text style={styles.progressTitle}>
                    <Text style={styles.bold}>{petName}</Text> 와의 친밀도
                  </Text>
                  <Text style={styles.levelText}>Lv.{level}</Text>
                </View>

                <View style={styles.progressBarWrapper} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
                  <Animated.View style={[styles.miniDogWrapper, { top: (48 - DOG_SIZE) / 2, width: DOG_SIZE, height: DOG_SIZE, transform: [{ translateX: dogPosAnim }] }]}> 
                    <Image
                      source={require("../assets/minidog.png")}
                      style={styles.miniDogOnBarImage}
                    />
                  </Animated.View>
                  <Progress.Bar
                    progress={getProgressForLevel(xp, level)}
                    width={barWidth > 0 ? barWidth : screenWidth * 0.8}
                    height={14}
                    borderRadius={10}
                    color="#3f3023"
                    unfilledColor="#ccc"
                    borderWidth={0}
                  />

                  {/* XP numeric labels removed per design request */}

                </View>
              </View>

              <Text style={styles.motivationText}>
                {quote || '자신의 가능성을 믿어보세요!'}
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
                <View style={{ transform: [{ translateX: 0 }, { scaleX: 1.7 }, { scaleY: 1.7 }], marginBottom: 6 }}>
                  <Switch
                    trackColor={{ false: "#767577", true: "#715C46" }}
                    thumbColor={isTalking ? "#443627" : "#443627"}
                    onValueChange={handleToggleTalking}
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

                <TouchableOpacity style={styles.button} onPress={isWalkingActive ? () => navigation.navigate('Walk') : handleGoWalk}>
                  <Image
                    source={require("../assets/gowalk.png")}
                    style={{ width: 48, height: 48 }}
                    accessibilityLabel="Go Walk"
                  />
                  <Text style={styles.buttonText}>{isWalkingActive ? '산책종료' : '산책가기'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleToggleMove}>
                  {isMoving ? (
                    <Image
                      source={require("../assets/stop.png")}
                      style={{ width: 48, height: 48 }}
                      accessibilityLabel="Stop"
                    />
                  ) : (
                    <Image
                      source={require("../assets/start.png")}
                      style={{ width: 48, height: 48 }}
                      accessibilityLabel="Start"
                    />
                  )}
                  <Text style={styles.buttonText}>{isMoving ? '멈춤' : '움직이기'}</Text>
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
      {/* overlay behind drawer: only visible when drawer opens (animated opacity) */}
      <Animated.View
        pointerEvents={isDrawerOpen ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 48,
          backgroundColor: 'rgba(0,0,0,0.4)',
          opacity: drawerAnim, // animate opacity with drawerAnim (0 closed -> 1 open)
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            if (isDrawerOpen) toggleDrawer();
          }}
          style={{ flex: 1 }}
        />
      </Animated.View>

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
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>{petName}</Text>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>레벨: Lv.{level}</Text>
          <Text>XP: {xp}</Text>
          <TouchableOpacity onPress={resetLevel} style={styles.drawerButton}>
            <Text style={styles.drawerButtonText}>레벨 리셋 (Lv.1)</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleEditProfile} style={[styles.drawerButton, { marginTop: 10, backgroundColor: '#eee' }]}>
            <Text style={[styles.drawerButtonText, { color: '#333' }]}>이름 편집</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReplayTutorial} style={[styles.drawerButton, { marginTop: 10, backgroundColor: '#eee' }]}>
            <Text style={[styles.drawerButtonText, { color: '#333' }]}>튜토리얼 다시보기</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogout} style={[styles.drawerButton, { marginTop: 10, backgroundColor: '#b93b3b' }]}>
            <Text style={styles.drawerButtonText}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={setHungryNow} style={[styles.drawerButton, { marginTop: 10, backgroundColor: '#ff8c00' }]}>
            <Text style={styles.drawerButtonText}>바로 굶주리게 만들기</Text>
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
  miniDogWrapper: {
    position: 'absolute',
    left: 0,
    zIndex: 3,
    pointerEvents: 'none',
  },
  miniDogOnBarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#3f3023',
    backgroundColor: '#fff',
    resizeMode: 'cover',
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 16,
  },
  headerButton: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: 40,
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
    lineHeight: 20,
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
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  drawerButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#3f3023',
    alignItems: 'center',
  },
  drawerButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  pauseIcon: {
    fontSize: 34,
    lineHeight: 40,
  },
  hungryLabel: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '900',
  },
  hungryLabelSmall: {
    fontSize: 12,
    color: '#6b4f3f',
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    fontWeight: '700',
    marginTop: 6,
  },
  hungryLabelOverlay: {
    fontSize: 14,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
    fontWeight: '800',
  },
});
