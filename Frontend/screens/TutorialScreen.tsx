import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Note: This file uses @react-native-async-storage/async-storage to persist the
// 'hasSeenTutorial' flag. If the package isn't installed, the code will fall
// back to navigating directly to Main without persisting. To install:
// npm install @react-native-async-storage/async-storage

export default function TutorialScreen({ navigation }: any) {
  const finishTutorial = useCallback(async () => {
    try {
      // try dynamic import to avoid compile-time dependency if not installed
      const AsyncStorage = await import("@react-native-async-storage/async-storage");
      await AsyncStorage.default.setItem("hasSeenTutorial", "true");
    } catch (err) {
      // If AsyncStorage isn't available, proceed without persisting
      console.warn("AsyncStorage not available — tutorial flag won't be persisted.", err);
    }

    navigation.replace("MainApp");
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>환영합니다!</Text>
        <Text style={styles.subtitle}>디바이스 연동을 시작합니다.</Text>

        <Image
          source={require("../assets/dog.png")}
          style={styles.image}
          resizeMode="contain"
        />

        <TouchableOpacity style={styles.button} onPress={finishTutorial}>
          <Text style={styles.buttonText}>다음으로</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { flex: 1, padding: 24, justifyContent: "space-between" },
  title: { fontSize: 28, fontWeight: "700", color: "#000" },
  subtitle: { fontSize: 20, marginTop: 8, color: "#222" },
  image: { width: "100%", height: 300, marginTop: 24 },
  button: {
    backgroundColor: "#3f3023",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
