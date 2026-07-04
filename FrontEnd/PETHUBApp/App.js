import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
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

function MainNavigator() {
  const { handleLogout, user } = useAuth();

  // වෙලාව අනුව සුබපැතුම තීරණය කරන function එක
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <MainStack.Navigator>
      <MainStack.Screen
        name="Home"
        component={HomeScreen}
        options={{
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

      <MainStack.Screen 
        name="PetDetails" 
        component={PetDetailsScreen} 
        options={{ title: 'Pet Details' }} 
      />
      
      <MainStack.Screen name="AIChat" component={AIchat} options={{ title: 'AI Chat' }} />
      <MainStack.Screen name="MealPlane" component={MealPlane} options={{ title: 'Meal Plan' }} />
      <MainStack.Screen name="Vaccine" component={Vaccine} options={{ title: 'Vaccine' }} />
      <MainStack.Screen name="Nearby" component={NearBy} options={{ title: 'Nearby' }} />
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