import axios from 'axios';
import { PET_IMAGE_CHECKER_BASE_URL } from './api';

const CHAT_BASE_URL = `${PET_IMAGE_CHECKER_BASE_URL}`;

export const sendChatMessage = async ({ message, history = [] }) => {
	try {
		const response = await axios.post(`${CHAT_BASE_URL}/chat`, {
			message,
			history,
		});
		return response.data;
	} catch (error) {
		console.log('Send chat message error:', error.response?.data || error.message);
		throw new Error(error.response?.data?.detail || error.response?.data?.message || 'Failed to send chat message');
	}
};