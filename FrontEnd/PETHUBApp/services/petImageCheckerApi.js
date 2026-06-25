import axios from 'axios';
import { PET_IMAGE_CHECKER_BASE_URL } from './api';

export const verifyPetImage = async (imageUri) => {
  try {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      name: filename,
      type,
    });

    const response = await axios.post(`${PET_IMAGE_CHECKER_BASE_URL}/verify-pet-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error) {
    console.log('Verify pet image error:', error.response?.data || error.message);
    return null;
  }
};