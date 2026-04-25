import React, { createContext, useState, useContext } from 'react';
import { Alert } from 'react-native';
import * as api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const handleRegister = async (name, email, password) => {
    const data = await api.register(name, email, password);
    if (data.success) {
      setUser(data.user);
      Alert.alert('Success', data.message);
    } else {
      Alert.alert('Error', data.message);
    }
    return data;
  };

  const handleLogin = async (email, password) => {
    const data = await api.login(email, password);
    if (data.success) {
      setUser(data.user);
    } else {
      Alert.alert('Error', data.message);
    }
    return data;
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, handleRegister, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);