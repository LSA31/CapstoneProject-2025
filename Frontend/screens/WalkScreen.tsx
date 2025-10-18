import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function WalkScreen() {
  const insets = useSafeAreaInsets();
  const navigation: any = useNavigation();

  const gradientStops = [0.0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}> 
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

      <View style={styles.headerRow}>
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

      <View style={styles.content}>
          <Image
            source={require('../assets/walking.png')}
            style={styles.image}
            resizeMode="cover"
          />

        <View style={styles.weatherCard}>
          <Text style={styles.weatherTitle}>산책하기 좋은 날이에요!</Text>
          <Text style={styles.weatherBody}>코모와 함께 산책하는 기분을 즐겨보세요.</Text>
        </View>
      </View>
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
    top: 52, // moved down to match tutorial back button y
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
  weatherCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    width: '86%',
    alignItems: 'flex-start',
  marginTop: -24, // stronger pull up to sit directly under the image
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
});
