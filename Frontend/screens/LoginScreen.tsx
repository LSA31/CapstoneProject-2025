import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, getProfile } from '../services/users';
import { getDeviceId } from '../utils/device';
import { createComo, hasCreatedComo, markCreatedFlag } from '../services/como';

const { width } = Dimensions.get("window");

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    try {
      setLoading(true);
      const data = await loginUser({ email, password });
      // expect { id_token }
      const token = data?.id_token || data?.token || data?.accessToken;
      if (token) {
        await AsyncStorage.setItem('accessToken', token);
        // Ensure a Como exists for this user on first login (store a local flag to avoid duplicates)
        try {
          const created = await hasCreatedComo();
          if (!created) {
            // try to get user's name from profile endpoint; fall back to email local-part
            let name = email.split('@')[0];
            try {
              const profile = await getProfile();
              if (profile && profile.name) name = profile.name;
            } catch (e) {
              // profile may not be available; continue with fallback name
            }
            try {
              const deviceId = await getDeviceId();
              await createComo({ device_id: deviceId, name });
              await markCreatedFlag();
            } catch (e) {
              // ignore création errors but continue
              console.warn('createComo failed', e);
            }
          }
        } catch (e) {
          // ignore
        }

        // If the user hasn't completed the tutorial, show it once on first login.
        try {
          const seen = await AsyncStorage.getItem('hasSeenTutorial');
          if (!seen || seen !== 'true') {
            navigation.replace('Tutorial1');
            return;
          }
        } catch (e) {
          // ignore and proceed to main app
        }
        // navigate to main app
        navigation.replace('MainApp');
      } else {
        throw new Error('토큰을 받지 못했습니다.');
      }
    } catch (e: any) {
      console.warn('login failed', e);
      const code = e?.code;
      const msg = e?.message || '로그인 중 오류가 발생했습니다.';
      if (code === 'INVALID_CREDENTIALS') {
        alert('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        alert(String(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = () => {
    // 이동: Signup 화면으로
    navigation.navigate('Signup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
          <View style={styles.headerInner}>
            <Image
              source={require("../assets/como_logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
        <Text style={styles.subtitle}>당신의 하루에 온기를 더하다</Text>
          </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>이메일</Text>
        <TextInput
          placeholder="email@example.com"
          placeholderTextColor="#cfcfcf"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={{ ...styles.label, marginTop: 32 }}>비밀번호</Text>
        <TextInput
          placeholder=""
          placeholderTextColor="#cfcfcf"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.primaryButton, password && email ? {} : styles.disabled]}
          onPress={handleLogin}
          disabled={!password || !email || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>로그인</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleSignup}>
          <Text style={styles.secondaryButtonText}>회원가입</Text>
        </TouchableOpacity>

        {/* Dev buttons moved to Main screen for convenience */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    justifyContent: "flex-start",
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  headerInner: {
    width: width * 0.68,
    alignItems: "center",
    paddingHorizontal: 0,
  },
  logo: {
    width: width * 0.41,
    height: width * 0.25,
    resizeMode: "contain",
    marginBottom: 6,
  },
  subtitle: {
    color: "#6b4f3f",
    fontSize: 14,
    marginTop: 6,
    fontWeight: "600",
  },
  form: {
    marginTop: 20,
  },
  label: {
    color: "#6b4f3f",
    fontSize: 18,
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#e6e6e6",
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#3f3023",
    marginTop: 40,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: "#3f3023",
    marginTop: 16,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  debugButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  debugButtonText: {
    color: "#333",
    fontSize: 14,
  },
});
