import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import Main from "../screens/MainScreen";
import TutorialScreen1 from "../screens/TutorialScreen1";
import TutorialScreen2 from "../screens/TutorialScreen2";
import TutorialScreen3 from "../screens/TutorialScreen3";
import TutorialScreen4 from "../screens/TutorialScreen4";
import TutorialScreen5 from "../screens/TutorialScreen5";
import TutorialScreen6 from "../screens/TutorialScreen6";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
	return (
		<NavigationContainer>
			<Stack.Navigator screenOptions={{ headerShown: false }}>
				<Stack.Screen name="Login" component={LoginScreen} />
				<Stack.Screen name="Tutorial1" component={TutorialScreen1} />
				<Stack.Screen name="Tutorial2" component={TutorialScreen2} />
				<Stack.Screen name="Tutorial3" component={TutorialScreen3} />
				<Stack.Screen name="Tutorial4" component={TutorialScreen4} />
				<Stack.Screen name="Tutorial5" component={TutorialScreen5} />
				<Stack.Screen name="Tutorial6" component={TutorialScreen6} />
				<Stack.Screen name="MainApp" component={Main} />
			</Stack.Navigator>
		</NavigationContainer>
	);
}
