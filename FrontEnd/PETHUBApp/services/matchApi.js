import axios from 'axios';
import { MATCHES_BASE_URL } from './api';

export const sendMatchRequest = async (requesterEmail, requesterPetId, targetPetId) => {
  try {
    const response = await axios.post(`${MATCHES_BASE_URL}/request`, {
      requesterEmail,
      requesterPetId,
      targetPetId,
    });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to send match request';
    return { success: false, message };
  }
};

export const getPendingMatchRequests = async (ownerEmail, petId = null) => {
  try {
    const encodedEmail = encodeURIComponent(ownerEmail);
    const response = await axios.get(`${MATCHES_BASE_URL}/pending/${encodedEmail}`, {
      params: petId ? { petId } : {},
    });
    return response.data;
  } catch (error) {
    console.log('Pending matches error:', error.response?.data || error.message);
    return [];
  }
};

export const confirmMatchRequest = async (matchId, ownerEmail) => {
  try {
    const response = await axios.put(`${MATCHES_BASE_URL}/${matchId}/confirm`, null, {
      params: { ownerEmail },
    });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to confirm match request';
    return { success: false, message };
  }
};

export const getConfirmedMatches = async (requesterEmail, petId = null) => {
  try {
    const encodedEmail = encodeURIComponent(requesterEmail);
    const response = await axios.get(`${MATCHES_BASE_URL}/confirmed/${encodedEmail}`, {
      params: petId ? { petId } : {},
    });
    return response.data;
  } catch (error) {
    console.log('Confirmed matches error:', error.response?.data || error.message);
    return [];
  }
};

export const rejectMatchRequest = async (matchId, ownerEmail) => {
  try {
    const response = await axios.put(`${MATCHES_BASE_URL}/${matchId}/reject`, null, {
      params: { ownerEmail },
    });
    return { success: true, data: response.data };
  } catch (error) {
    const message = error.response?.data?.message || 'Failed to reject match request';
    return { success: false, message };
  }
};
