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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RULES = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /\d/,
  hasSymbol: /[^A-Za-z0-9]/,
};

export default function SignupScreen({ navigation }) {

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { handleRegister } = useAuth();

  const register = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    const passwordChecks = [
      password.length >= PASSWORD_RULES.minLength,
      PASSWORD_RULES.hasUppercase.test(password),
      PASSWORD_RULES.hasLowercase.test(password),
      PASSWORD_RULES.hasNumber.test(password),
      PASSWORD_RULES.hasSymbol.test(password),
    ];

    if (passwordChecks.includes(false)) {
      Alert.alert(
        'Weak Password',
        'Password must include:\n- At least 8 characters\n- One uppercase letter\n- One lowercase letter\n- One number\n- One special character'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    const result = await handleRegister(trimmedName, trimmedEmail, password);

    setLoading(false);

    if (result.success) {
      return;
    } else {
      Alert.alert('Signup Failed', result.message || 'Try again');
    }
  };

  return (
    <ImageBackground
      source={require('../assets/1image.jpg')}
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
            <Text style={styles.smallText}>Join Smart Pet Care</Text>
            <Text style={styles.logo}>PETHUB</Text>
          </View>

          {/* 🔥 BOTTOM CARD */}
          <View style={styles.card}>

            <Text style={styles.title}>Create Account</Text>

            <TextInput
              placeholder="Full Name"
              placeholderTextColor="#999"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />

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
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TextInput
              placeholder="Confirm Password"
              placeholderTextColor="#999"
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.signupBtn}
              onPress={register}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.signupText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.loginLink}>
                Already have an account? Login
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
    marginTop: 120, // thoda udata gatta
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
    elevation: 10
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 12,
    marginBottom: 20
  },

  signupBtn: {
    backgroundColor: '#2F3E46',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center'
  },

  signupText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },

  loginLink: {
    textAlign: 'center',
    marginTop: 30, // thoda udata gatta
    color: '#0638df'
  }

});