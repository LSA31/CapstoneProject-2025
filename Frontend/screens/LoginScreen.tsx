import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

export default function LoginScreen({ navigation }: any) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    // 임시: 로그인 로직 추가 필요
    // 예: 인증 성공 시 튜토리얼 플로우 또는 메인으로 이동
    (async () => {
      try {
        const AsyncStorage = await import("@react-native-async-storage/async-storage");
        const seen = await AsyncStorage.default.getItem("hasSeenTutorial");
        if (!seen) {
          navigation.replace("Tutorial");
          return;
        }
      } catch (err) {
        // AsyncStorage가 없으면 바로 메인으로 보냄(개발 환경 용)
        console.warn("AsyncStorage not available; skipping tutorial check.", err);
      }

      navigation.replace("MainApp");
    })();
  };

  const handleSignup = () => {
    // 회원가입 화면이 있다면 이동, 없으면 placeholder
    // navigation.navigate('Signup');
    console.log("회원가입 클릭");
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
        <Text style={styles.label}>아이디</Text>
        <TextInput
          placeholder="예) comolove1234"
          placeholderTextColor="#cfcfcf"
          style={styles.input}
          value={id}
          onChangeText={setId}
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
          style={[styles.primaryButton, password && id ? {} : styles.disabled]}
          onPress={handleLogin}
          disabled={!password || !id}
        >
          <Text style={styles.primaryButtonText}>로그인</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleSignup}>
          <Text style={styles.secondaryButtonText}>회원가입</Text>
        </TouchableOpacity>
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
    backgroundColor: "#d9d9d9",
    marginTop: 40,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
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
});
