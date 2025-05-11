import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as Progress from "react-native-progress";
import { StatusBar } from "expo-status-bar";

const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;

export default function Main() {
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState<"home" | "diary">("home");
  const [friendship, setFriendship] = useState(0.4);

  const headerHeight = 10;
  const cardHeight = screenHeight - headerHeight - insets.top - insets.bottom;

  const increaseFriendship = () => {
    setFriendship((prev) => {
      const next = prev + 0.1;
      return next >= 1 ? 0 : next;
    });
  };

  const handlePlay = () => {
    increaseFriendship();
  };

  const handleFeed = () => {
    increaseFriendship();
  };

  const handleWait = () => {
    // TODO: 하드웨어와의 연동
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
        <Text style={styles.menuIcon}>≡</Text>
      </View>

      <View style={[styles.card, { height: cardHeight }]}>
        {currentPage === "home" && (
          <>
            <Image
              source={require("./assets/dog.png")}
              style={styles.dogImageBackground}
            />
            <View style={styles.cardContent}>
              <View style={styles.progressContainer}>
                <Text style={styles.progressTitle}>
                  <Text style={styles.bold}>코모</Text> 와의 친밀도
                </Text>

                <View style={styles.progressBarWrapper}>
                  <Image
                    source={require("./assets/minidog.png")}
                    style={styles.miniDogOnBar}
                  />
                  <Progress.Bar
                    progress={friendship}
                    width={screenWidth * 0.8}
                    height={14}
                    borderRadius={10}
                    color="#3f3023"
                    unfilledColor="#ccc"
                    borderWidth={0}
                  />
                </View>
              </View>

              <Text style={styles.motivationText}>
                자신의 가능성을 믿어보세요!
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={handlePlay}>
                  <Text style={styles.emoji}>🪃</Text>
                  <Text style={styles.buttonText}>놀아주기</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleWait}>
                  <Text style={styles.emoji}>✋</Text>
                  <Text style={styles.buttonText}>기다려</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleFeed}>
                  <Text style={styles.emoji}>🍽️</Text>
                  <Text style={styles.buttonText}>밥주기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {currentPage === "diary" && (
          <View style={styles.diaryContainer}>
            <View style={styles.diaryHeader}>
              <View>
                <Text style={styles.dateText}>2025년 4월 30일</Text>
                <Text style={styles.diaryTitle}>하루 일기</Text>
              </View>
            </View>

            <View style={styles.diaryCard}>
              <Text style={styles.diaryText}>
                오늘은 아직 기분 좋은 하루였다...
              </Text>
            </View>
          </View>
        )}
      </View>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#3f3023",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 20,
  },
  headerButton: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: 42,
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
    fontSize: 30,
    color: "white",
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
    top: -100,
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
    top: -150,
    fontWeight: "bold",
    color: "#000",
    zIndex: 1,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    zIndex: 1,
    paddingBottom: 30,
  },
  button: {
    backgroundColor: "#3f3023",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    width: 110,
  },
  emoji: {
    fontSize: 70,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    marginTop: 4,
    fontWeight: "600",
  },
  diaryContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-start",
  },
  diaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  diaryTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginTop: 4,
  },
  diaryCard: {
    backgroundColor: "#F2F2F2",
    padding: 16,
    borderRadius: 16,
  },
  diaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
});
