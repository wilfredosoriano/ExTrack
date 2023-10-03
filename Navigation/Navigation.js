import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HomeScreen from '../src/HomeScreen/HomeScreen';
import LoginScreen from "../src/LoginScreen/LoginScreen";
import WalletScreen from "../src/WalletScreen/WalletScreen";
import LoadingScreen from "../Component/LoadingScreen";
import CategoryScreen from "../src/CategoryScreen/CategoryScreen";
import ProfileScreen from "../src/ProfileScreen/ProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = () => (
  <Stack.Navigator 
    screenOptions={{
      headerShown: false, 
      cardStyleInterpolator: ({ current, layouts }) => {
        return {
        cardStyle: {
            transform: [
            {
                translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width, 0],
                }),
            },
            ],
        },
        };
    },
    }}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
  </Stack.Navigator>
);

const MainNavigation = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("username")
      .then((storedUsername) => {
        if (storedUsername) {
          setLoggedIn(true);
        }
      })
      .catch((error) => {
        console.error("Error checking AsyncStorage:", error);
      });
      setTimeout(() => {
        setLoading(false);
      }, 3000); 
  }, []);

  const handleLogin = (username) => {

    AsyncStorage.setItem("username", username)
    .then(() => {
      setLoggedIn(true);
    })
    .catch((error) => {
      console.error("Error storing username in AsyncStorage:", error);
    });
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {loggedIn ? (
        <Tab.Navigator screenOptions={
          {
            headerShown: false,
            "tabBarShowLabel": false,
            "tabBarStyle": [
              {
                "display": "flex",
                "backgroundColor": "#151924",
                "borderTopColor" : "#FAAC33",
              },
              null
            ]
          }
          }>
          <Tab.Screen name="Home" component={HomeStack}         
          options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color="#FAAC33"
            />
          ),
        }} />
        <Tab.Screen name="Category" component={CategoryScreen}         
          options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'layers' : 'layers-outline'}
              size={24}
              color="#FAAC33"
            />
          ),
        }} />
        <Tab.Screen name="Wallet" component={WalletScreen}
            options={{
            tabBarIcon: ({ focused }) => (
                <Ionicons
                name={focused ? 'wallet' : 'wallet-outline'}
                size={24}
                color="#FAAC33"
                />
            ),
            }}/>
        <Tab.Screen name="Profile" component={ProfileScreen}
            options={{
            tabBarIcon: ({ focused }) => (
                <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={24}
                color="#FAAC33"
                />
            ),
            }}/>
        </Tab.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default MainNavigation;
