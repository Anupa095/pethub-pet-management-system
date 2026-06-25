import axios from 'axios';
import { Platform } from 'react-native';

// Change this value only when your local backend IP changes.
export const LOCAL_IP = '192.168.43.6:8080';
export const LOCAL_HOST = LOCAL_IP.split(':')[0];

export const API_ROOT = Platform.select({
  ios: `http://${LOCAL_IP}`,
  android: `http://${LOCAL_IP}`,
  default: `http://${LOCAL_IP}`,
});

export const AUTH_BASE_URL = `${API_ROOT}/auth`;
export const PETS_BASE_URL = `${API_ROOT}/pets`;
export const MATCHES_BASE_URL = `${API_ROOT}/matches`;
export const PET_IMAGE_CHECKER_BASE_URL = `http://${LOCAL_HOST}:8000`;

export const getPetImageUrl = (petId) => `${PETS_BASE_URL}/image/${petId}`;

// =======================
// API Functions
// =======================

export const register = async (name, email, password) => {
  try {
    const response = await axios.post(`${AUTH_BASE_URL}/register`, { name, email, password });
    return response.data;
  } catch (error) {
    console.log('Register error:', error.response?.data || error.message);
    return error.response ? error.response.data : { success: false, message: 'Server error' };
  }
};

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${AUTH_BASE_URL}/login`, { email, password });
    return response.data;
  } catch (error) {
    console.log('Login error:', error.response?.data || error.message);
    return error.response ? error.response.data : { success: false, message: 'Server error' };
  }
};

export const forgotPassword = async (email, newPassword) => {
  try {
    const response = await axios.post(`${AUTH_BASE_URL}/forgot-password`, { email, newPassword });
    return response.data;
  } catch (error) {
    console.log('Forgot password error:', error.response?.data || error.message);
    return error.response ? error.response.data : { success: false, message: 'Server error' };
  }
};