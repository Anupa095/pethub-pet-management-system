import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { handleLogin } = useAuth();

  const login = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    const result = await handleLogin(email, password);

    setLoading(false);

    if (result.success) {
      return;
    } else {
      Alert.alert('Login Failed', result.message || 'Try again');
    }
  };

  return (
    <ImageBackground
      source={require('../assets/145.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
          keyboardShouldPersistTaps="handled"
        >

          {/* 🔥 TOP TEXT */}
          <View style={styles.topContainer}>
            <Text style={styles.smallText}>Smart Pet Care Starts Here</Text>
            <Text style={styles.logo}>PETHUB</Text>
          </View>

          {/* 🔥 BOTTOM CARD */}
          <View style={styles.card}>
            <Text style={styles.title}>Welcome back!</Text>

            <TextInput
              placeholder="Email address"
              placeholderTextColor="#999"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={login}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginText}>Log in</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={loading}
            >
              <Text style={styles.forgotPassword}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Signup')}
              disabled={loading}
            >
              <Text style={styles.signup}>
                Don’t have an account? Sign up now!
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({

  background: {
    flex: 1
  },

  topContainer: {
    marginTop: 120, // Whitebox eka thoda udata ganna
    alignItems: 'center'
  },

  smallText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500'
  },

  logo: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    minHeight: 350,
    justifyContent: 'center'
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 12,
    marginBottom: 20
  },

  loginBtn: {
    backgroundColor: '#2F3E46',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },

  loginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },

  forgotPassword: {
    textAlign: 'right',
    marginTop: 15,
    color: '#2F3E46',
    fontWeight: '600'
  },

  signup: {
    textAlign: 'center',
    marginTop: 25,
    color: '#0638df'
  }
});