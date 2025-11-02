import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { endWalk } from '../services/walk';
import { sendEvent } from '../services/event';
import AsyncStorage from '@react-native-async-storage/async-storage';
const WALK_ACTIVE_KEY = 'comox_walk_active';

export default function WalkScreen() {
  const insets = useSafeAreaInsets();
  const navigation: any = useNavigation();

  // tilt animation: 0 -> 1 maps to -5deg -> +5deg
  const tiltAnim = useRef(new Animated.Value(0)).current;

  // weather state
  const [weather, setWeather] = React.useState<any | null>(null);
  const [locName, setLocName] = React.useState<string | null>(null);
  const [loadingWeather, setLoadingWeather] = React.useState(false);
  const [bgColor, setBgColor] = React.useState<string>('#9AD0FF');

  // Read API key from environment if available, otherwise fall back to .env literal
  // When running locally you can set OPENWEATHER_API_KEY in the environment or in the project's .env
  const OPENWEATHER_API_KEY = (process.env.OPENWEATHER_API_KEY as string) || '86575c333aa45bc14d1d43f91c5f69d0';

  const [ending, setEnding] = React.useState(false);

  useEffect(() => {
    // continuous one-direction rotation: 0 -> 1 maps to 0deg -> -360deg
    const loop = Animated.loop(
      Animated.timing(tiltAnim, {
        toValue: 1,
  duration: 36000, // slower: 36s per rotation
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [tiltAnim]);

  // helper: determine background color from weather
  function colorForWeather(main: string, wJson: any | null) {
    const m = (main || '').toLowerCase();
    switch (m) {
      case 'clear':
        return '#9AD0FF'; // bright sky
      case 'clouds':
        return '#BFC9D6'; // light gray-blue
      case 'rain':
      case 'drizzle':
        return '#6EA8C7'; // muted blue
      case 'thunderstorm':
        return '#7A6B9F'; // purple-gray
      case 'snow':
        return '#EAF6FF'; // very pale blue
      case 'mist':
      case 'smoke':
      case 'haze':
      case 'fog':
        return '#C9D6D5'; // foggy gray
      default:
        if (wJson && typeof wJson.main?.temp === 'number') {
          const t = wJson.main.temp;
          if (t >= 25) return '#FFD59E'; // warm
          if (t >= 15) return '#C6E7FF'; // mild
          return '#DDEBF7'; // cool
        }
        return '#9AD0FF';
    }
  }

  // Fetch approximate location via IP as a no-permission fallback, then fetch weather
  useEffect(() => {
    let mounted = true;
    const fetchWeatherData = async () => {
      try {
        // 1) get approximate location from IP (no native permission required)
        const locRes = await fetch('https://ipapi.co/json/');
        const locJson = await locRes.json();
        const lat = locJson.latitude || locJson.lat;
        const lon = locJson.longitude || locJson.lon;

        // 2) fetch OpenWeatherMap current weather (metric units)
        if (lat && lon && OPENWEATHER_API_KEY && OPENWEATHER_API_KEY !== 'YOUR_OPENWEATHERMAP_API_KEY') {
          const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
          const wRes = await fetch(url);
          const wJson = await wRes.json();
          if (mounted) {
            setWeather(wJson);
            setLocName(wJson.name || locJson.city || null);
            // pick background color based on weather condition
            const main = (wJson.weather && wJson.weather[0] && wJson.weather[0].main) || '';
            setBgColor(colorForWeather(main, wJson));
          }
        } else if (mounted) {
          // no API key provided — fall back to IP city only and set color by probable local cloudiness
          setLocName(locJson.city || null);
          const probable = (locJson && locJson.region) ? 'Clouds' : 'Clear';
          setBgColor(colorForWeather(probable, null));
        }
      } catch (e) {
        // ignore errors, keep defaults
      } finally {
        if (mounted) setLoadingWeather(false);
      }
    };
    fetchWeatherData();
    return () => {
      mounted = false;
    };
  }, []);

  

  const gradientStops = [0.0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor, paddingTop: insets.top }]}> 
      {/* faux gradient: stack translucent white strips from center-bottom to bottom */}
      <View style={styles.gradientOverlay} pointerEvents="none">
        {gradientStops.map((t, i) => (
          <View
            key={i}
            style={[
              styles.gradientStrip,
              { opacity: (i + 1) / (gradientStops.length * 1.5) },
            ]}
          />
        ))}
      </View>

  <View style={[styles.headerRow, { top: 12 + insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('MainApp')}
          style={styles.homeButton}
        >
          <Image source={require('../assets/homeIcon.png')} style={styles.homeIconImg} />
        </TouchableOpacity>
      </View>

      <View style={styles.topCenter}>
        <Text style={styles.locationTitle}>나의 위치</Text>
        <Text style={styles.locationSub}>서원구</Text>
        <Text style={styles.temperature}>24°</Text>
      </View>

      {/* place a walking dog image between the top center and the bottom card */}
      <View style={styles.content}>
        {/* walkingDog will be rendered above the ground inside bottomContainer to ensure correct stacking */}
      </View>

      {/* bottom container: rotating ground image above the weather card, pinned to screen bottom */}
      <View style={[styles.bottomContainer, { bottom: 160 + insets.bottom }]} pointerEvents="box-none">
        <Animated.Image
          source={require('../assets/walkGround.png')}
            style={[
            styles.groundImage,
            {
                transform: [
                    { translateY: 200 },
                {
                  rotate: tiltAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '-360deg'],
                  }),
                },
              ],
            },
          ]}
          resizeMode="contain"
        />

        {/* place walking dog above the rotating ground so it always appears in front */}
        <Animated.Image
          source={require('../assets/walkingdog.png')}
          style={{
            width: 220,
            height: 180,
            position: 'absolute',
            bottom: 100 + insets.bottom,
            alignSelf: 'center',
            zIndex: 50,
            transform: [
              {
                translateY: tiltAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, -24, 0],
                }),
              },
            ],
          }}
          resizeMode="contain"
        />

        <View style={styles.weatherCard}>
          <Text style={styles.weatherTitle}>산책하기 좋은 날이에요!</Text>
          <Text style={styles.weatherBody}>코모와 함께 산책하는 기분을 즐겨보세요.</Text>
        </View>
      </View>
      {/* End walk button - centered white text */}
      <TouchableOpacity
        onPress={async () => {
          if (ending) return;
          try {
            setEnding(true);
            // call backend to end the walk; payload optional
            await endWalk({});
            // also notify app event endpoint that walk stopped so server can award xp/level
            try {
              const ev = await sendEvent('WALK_STOP');
              // persist xp/level/last-fed if present
              try {
                if (typeof ev.experience === 'number') await AsyncStorage.setItem('comox_xp', String(ev.experience));
                if (typeof ev.level === 'number') await AsyncStorage.setItem('comox_level', String(ev.level));
                if (typeof ev.was_hungry !== 'undefined') {
                  // when was_hungry true, keep last fed as not today (so hungry state displays)
                  if (!ev.was_hungry) {
                    // server indicates not hungry -> mark as fed today
                    await AsyncStorage.setItem('lastFedDate', new Date().toISOString().slice(0, 10));
                  }
                }
              } catch (e) {
                // ignore persistence errors
              }
            } catch (e) {
              // ignore event send errors
            }
          } catch (e) {
            console.warn('endWalk failed', e);
          } finally {
              setEnding(false);
              try {
                await AsyncStorage.removeItem(WALK_ACTIVE_KEY);
              } catch (e) {
                // ignore
              }
              navigation.goBack();
          }
        }}
        style={[styles.endButton, { top: 19 + insets.top, right: 16 }]}
      >
        {ending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.endButtonText}>끝내기</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#9AD0FF', // 기본 하늘색
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    zIndex: 0,
  },
  gradientStrip: {
    height: 40,
    backgroundColor: '#ffffff',
    width: '100%',
  },
  headerRow: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    flexDirection: 'row',
  },
  homeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  homeIconImg: {
    width: 26,
    height: 26,
    tintColor: '#fff',
  },
  topCenter: {
    marginTop: 72,
    alignItems: 'center',
    zIndex: 5,
  },
  locationTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  locationSub: {
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  temperature: {
    color: '#fff',
    fontSize: 72,
    fontWeight: '200',
    marginTop: 8,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    zIndex: 5,
  },
  image: {
    width: 280,
    height: 320,
    marginBottom: 0,
    zIndex: 5,
  },
  walkingDog: {
    width: 200,
    height: 160,
    marginTop: 28,
    zIndex: 30,
  },
  bottomContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 48,
    alignItems: 'center',
    zIndex: 6,
    paddingBottom: 8,
    overflow: 'visible',
  },
  groundImage: {
    width: 620,
    height: 370,
    marginBottom: 0,
  },
  weatherCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    width: '86%',
    alignItems: 'flex-start',
  marginTop: -20, // pulled up so the card sits closer to the rotating ground
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  weatherBody: {
    fontSize: 14,
    color: '#666',
  },
  endButton: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'transparent',
    zIndex: 20,
  },
  endButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
