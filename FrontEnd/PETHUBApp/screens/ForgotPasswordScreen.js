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
} from 'react-native';
import { forgotPassword } from '../services/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await forgotPassword(email, newPassword);
      if (result.success) {
        Alert.alert('Success', 'Password reset successful. Please log in.', [
          { text: 'Go to Login', onPress: () => navigation.replace('Login') },
        ]);
      } else {
        Alert.alert('Reset Failed', result.message || 'Could not reset password');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/1image.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.topContainer}>
          <Text style={styles.smallText}>Account Recovery</Text>
          <Text style={styles.logo}>PETHUB</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Reset your password</Text>

          <TextInput
            placeholder="Email address"
            placeholderTextColor="#999"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            placeholder="New password"
            placeholderTextColor="#999"
            secureTextEntry
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            editable={!loading}
          />

          <TextInput
            placeholder="Confirm new password"
            placeholderTextColor="#999"
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.resetBtn, loading && styles.disabledBtn]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.resetText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.replace('Login')}
            disabled={loading}
          >
            <Text style={styles.backToLogin}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topContainer: {
    marginTop: 80,
    alignItems: 'center',
  },
  smallText: {
    color: '#fff',
    fontSize: 14,
  },
  logo: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 5,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    padding: 25,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 10,
    marginBottom: 15,
  },
  resetBtn: {
    backgroundColor: '#2F3E46',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.7,
  },
  resetText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  backToLogin: {
    textAlign: 'center',
    marginTop: 15,
    color: '#555',
    fontWeight: '600',
  },
});
