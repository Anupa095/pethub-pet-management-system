import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, View, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import PetDetailsScreen from './screens/PetDetailsScreen';
import AIchat from './screens/AIchat';
import MealPlane from './screens/MealPlane';
import Vaccine from './screens/Vaccine';
import NearBy from './screens/NearBy';

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

// 🌟 හැම Page එකක්ම ඇතුලට යද්දී ලස්සනට මතු වෙන්න හදපු Premium Wrapper එක
const FadeScaleWrapper = ({ children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current; // Opacity එක 0 ඉඳන්
  const scaleAnim = useRef(new Animated.Value(0.96)).current; // Size එක 96% ඉඳන් 100% ට

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250, // ලස්සනට smooth වෙන්න වෙලාව
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
      {children}
    </Animated.View>
  );
};

function MainNavigator() {
  const { handleLogout, user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <MainStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'none', // Stack එකෙන් දෙන කැත animations සම්පූර්ණයෙන්ම අයින් කලා
      }}
    >
      <MainStack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: true, 
          headerTitleAlign: 'left',
          headerTitle: () => (
            <View>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                {user?.name ? `${getGreeting()}, ${user.name}` : `${getGreeting()}`}
              </Text>
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout}>
              <Text style={{ color: 'red', marginRight: 10, fontWeight: '600' }}>Logout</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* 🌟 මෙතන ඉඳන් හැම Screen එකක්ම wrapper එක ඇතුලට දාලා තියෙන්නේ ලස්සන පෙනුම ගන්න */}
      <MainStack.Screen name="PetDetails">
        {() => <FadeScaleWrapper><PetDetailsScreen /></FadeScaleWrapper>}
      </MainStack.Screen>
      
      <MainStack.Screen name="AIChat">
        {() => <FadeScaleWrapper><AIchat /></FadeScaleWrapper>}
      </MainStack.Screen>
      
      <MainStack.Screen name="MealPlane">
        {() => <FadeScaleWrapper><MealPlane /></FadeScaleWrapper>}
      </MainStack.Screen>
      
      <MainStack.Screen name="Vaccine">
        {() => <FadeScaleWrapper><Vaccine /></FadeScaleWrapper>}
      </MainStack.Screen>
      
      <MainStack.Screen name="Nearby">
        {() => <FadeScaleWrapper><NearBy /></FadeScaleWrapper>}
      </MainStack.Screen>
    </MainStack.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function RootNavigator() {
  const { user } = useAuth();
  return user ? <MainNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}