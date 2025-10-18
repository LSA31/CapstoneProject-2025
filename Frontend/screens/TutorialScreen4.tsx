import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TutorialScreen4({ navigation }: any) {
  const goToNext = useCallback(() => {
    navigation.navigate?.("Tutorial5");
  }, [navigation]);

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
          <Text style={styles.title}>설정 &gt; 일반 &gt; 정보</Text>
        </View>

        <Text style={styles.subtitleSpacer} />

        <Text style={styles.subtitle}>
          이름을 <Text style={{ fontWeight: "700" }}>COMO_AP</Text>로{"\n"}변경해주세요.
        </Text>

        <Image
          source={require("../assets/tutorial_hotspot3.png")}
          style={styles.image}
          resizeMode="contain"
        />

        <TouchableOpacity style={styles.button} onPress={goToNext}>
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
  subtitleSpacer: { height: 10 },
  subtitle: { fontSize: 28, color: "#000", marginBottom: 8, fontWeight: "400", lineHeight: 34 },
  header: { /* keep title and subtitle grouped at top */ },
  imageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: "100%", height: 300, marginTop: -20 },
  button: {
    backgroundColor: "#3f3023",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
