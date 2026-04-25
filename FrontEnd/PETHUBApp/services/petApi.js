import axios from 'axios';
import { PETS_BASE_URL } from './api';

// Add pet
export const addPet = async (pet, userEmail, imageUri = null) => {
  try {
    const formData = new FormData();
    formData.append('name', pet.name);
    formData.append('type', pet.type);
    formData.append('breed', pet.breed);
    formData.append('gender', pet.gender);
    formData.append('age', pet.age);
    formData.append('userEmail', userEmail);

    if (imageUri) {
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type: type,
      });
    }

    const response = await axios.post(`${PETS_BASE_URL}/add`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.log('Add pet error:', error.response?.data || error.message);
    return { success: false };
  }
};

// Get my pets
export const getMyPets = async (userEmail) => {
  try {
    const response = await axios.get(`${PETS_BASE_URL}/my-pets/${userEmail}`);
    return response.data;
  } catch (error) {
    console.log('Get pets error:', error.response?.data || error.message);
    return [];
  }
};

export const getAllPets = async () => {
  try {
    const response = await axios.get(PETS_BASE_URL);
    return response.data;
  } catch (error) {
    console.log('Get all pets error:', error.response?.data || error.message);
    return [];
  }
};

export const deletePet = async (id) => {
  try {
    const response = await axios.delete(`${PETS_BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.log('Delete pet error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Delete failed');
  }
};