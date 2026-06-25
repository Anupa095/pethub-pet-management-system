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

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

function MainNavigator() {
  const { handleLogout } = useAuth();

  return (
    <MainStack.Navigator>
      <MainStack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'PetHub Home',
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout}>
              <Text style={{ color: 'red', marginRight: 10 }}>Logout</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <MainStack.Screen
        name="PetDetails"
        component={PetDetailsScreen}
        options={({ route }) => {
          const ownerName = route.params?.pet?.user?.name;

          const getGreeting = () => {
            const hour = new Date().getHours();
            if (hour < 12) return 'Good Morning';
            if (hour < 17) return 'Good Afternoon';
            return 'Good Evening';
          };

          return {
            headerTitleAlign: 'center',
            headerTitle: () => (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                  {ownerName ? `${getGreeting()}, ${ownerName}` : 'Hello'}
                </Text>
              </View>
            ),
          };
        }}
      />
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