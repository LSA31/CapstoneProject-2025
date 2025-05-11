import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Diary() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>하루일기장 페이지입니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
