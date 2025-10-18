import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TutorialScreen6({ navigation }: any) {
  const [name, setName] = useState("");

  const finishAndExit = useCallback(async () => {
    try {
      const AsyncStorage = await import("@react-native-async-storage/async-storage");
      await AsyncStorage.default.setItem("hasSeenTutorial", "true");
      await AsyncStorage.default.setItem("petName", name);
    } catch (err) {
      console.warn("AsyncStorage not available — tutorial flag won't be persisted.", err);
    }
    navigation.replace?.("MainApp");
  }, [navigation, name]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack?.()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'‹'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>연결이 완료되었어요.{"\n"}{"\n"}코모의 이름을 설정해주세요.</Text>
        </View>

        <Text style={styles.subtitleSpacer} />

        <TextInput
          placeholder="코모의 이름을 설정해주세요..."
          placeholderTextColor="#cfcfcf"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />

        <TouchableOpacity style={[styles.button, !name && styles.buttonDisabled]} onPress={finishAndExit} disabled={!name}>
          <Text style={styles.buttonText}>시작하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { flex: 1, padding: 24, justifyContent: "flex-start" },
  topRow: { paddingLeft: 24, paddingTop: 8 },
  backButton: { width: 36, height: 36, justifyContent: "center", marginRight: 8, marginTop: 2 },
  backText: { fontSize: 28, color: "#000" },
  titleBlock: { marginTop: 12, marginBottom: 100 },
  title: { fontSize: 28, fontWeight: "700", color: "#000" },
  titleLine: { fontSize: 28, marginTop: 6 },
  subtitleSpacer: { height: 6 },
  subtitle: { fontSize: 28, color: "#000", marginBottom: 8, fontWeight: "400", lineHeight: 34 },
  input: {
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#3f3023",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#8a6f5f',
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
