import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TutorialScreen1({ navigation }: any) {
  const finishTutorial = useCallback(async () => {
    try {
      const AsyncStorage = await import("@react-native-async-storage/async-storage");
      await AsyncStorage.default.setItem("hasSeenTutorial", "true");
    } catch (err) {
      console.warn("AsyncStorage not available — tutorial flag won't be persisted.", err);
    }

    navigation.replace("MainApp");
  }, [navigation]);

  const goToStep2 = useCallback(() => {
    navigation.navigate?.("Tutorial2");
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => {
            try {
              if (navigation?.canGoBack && navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.replace?.("Login");
              }
            } catch (e) {
              navigation.replace?.("Login");
            }
          }}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'‹'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>환영합니다!</Text>
          <Text style={styles.titleLine}>
            <Text>디바이스 연동</Text>
            <Text>을 시작합니다.</Text>
          </Text>
        </View>

        <Text style={styles.subtitleSpacer} />

        <Text style={styles.subtitle}>
          <Text>스위치</Text>
          <Text>를 내려 </Text>
          <Text>전원</Text>
          <Text>을 켜주세요.</Text>
        </Text>


        <Image
          source={require("../assets/tutorial_dog.png")}
          style={styles.image}
          resizeMode="contain"
        />

        <TouchableOpacity style={styles.button} onPress={goToStep2}>
          <Text style={styles.buttonText}>다음으로</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  content: { flex: 1, padding: 24, justifyContent: "space-between" },
  topRow: { paddingLeft: 24, paddingTop: 8 },
  backButton: { width: 36, height: 36, justifyContent: "center", marginRight: 8, marginTop: 2 },
  backText: { fontSize: 28, color: "#000" },
  titleBlock: { marginTop: 0 },
  title: { fontSize: 28, fontWeight: "700", color: "#000" },
  titleLine: { fontSize: 28, marginTop: 6 },
  boldInline: { fontWeight: "700" },
  subtitleSpacer: { height: 10 },
  subtitle: { fontSize: 28, marginTop: 8, color: "#000", fontWeight: "400", lineHeight: 34 },
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
