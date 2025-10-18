import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import Main from "../Main";
import TutorialScreen from "../screens/TutorialScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
	return (
		<NavigationContainer>
			<Stack.Navigator screenOptions={{ headerShown: false }}>
				<Stack.Screen name="Login" component={LoginScreen} />
				<Stack.Screen name="Tutorial" component={TutorialScreen} />
				<Stack.Screen name="MainApp" component={Main} />
			</Stack.Navigator>
		</NavigationContainer>
	);
}
