import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Image, StyleSheet, Alert, FlatList,
  Modal, ScrollView, Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { addPet, getMyPets, getAllPets, deletePet } from '../services/petApi';
import { getPetImageUrl } from '../services/api';
import { verifyPetImage } from '../services/petImageCheckerApi';
import * as ImagePicker from 'expo-image-picker';

// ─── Data ─────────────────────────────────────────────────────────────────────
const PET_TYPES = [
  { label: 'Dog', value: 'Dog' },
  { label: 'Cat', value: 'Cat' },
];

const BREEDS = {
  Dog: [
    'Local',
    'Retriever',
    'German Shepherd',
    'Golden Retriever',
    'Rottweiler',
    'Doberman Pinscher',
    'Pomeranian',
    'Shih Tzu',
    'Beagle',
  ],
  Cat: [
    'Local Cats',
    'Persian Cat',
    'Siamese Cat',
    'British Shorthair',
    'Bengal Cat',
  ],
};

const GENDERS = ['Male', 'Female'];

// ─── Reusable styled dropdown ────────────────────────────────────────────────
function StyledDropdown({ placeholder, options, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  const selected = options.find(o => (o.value ?? o) === value);
  const displayLabel = selected ? (selected.label ?? selected) : null;

  return (
    <View style={{ zIndex: open ? 999 : 1, marginBottom: 14 }}>
      <TouchableOpacity
        style={[
          dd.trigger,
          open && dd.triggerOpen,
          disabled && dd.triggerDisabled,
        ]}
        onPress={() => !disabled && setOpen(v => !v)}
        activeOpacity={0.85}
      >
        <Text style={displayLabel ? dd.valueText : dd.placeholderText}>
          {displayLabel ?? placeholder}
        </Text>
        <MaterialIcons
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color={disabled ? '#bbb' : '#6b7280'}
        />
      </TouchableOpacity>

      {open && (
        <View style={dd.listContainer}>
          {options.map((opt, idx) => {
            const val = opt.value ?? opt;
            const label = opt.label ?? opt;
            const isSelected = val === value;
            const isLast = idx === options.length - 1;
            return (
              <TouchableOpacity
                key={val}
                style={[dd.option, isSelected && dd.optionSelected, !isLast && dd.optionBorder]}
                onPress={() => { onChange(val); setOpen(false); }}
                activeOpacity={0.7}
              >
                <Text style={[dd.optionText, isSelected && dd.optionTextSelected]}>
                  {label}
                </Text>
                {isSelected && (
                  <MaterialIcons name="check-circle" size={18} color="#22c55e" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const dd = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  triggerOpen: {
    borderColor: '#22c55e',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  triggerDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  placeholderText: { fontSize: 14, color: '#9ca3af' },
  valueText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  listContainer: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#22c55e',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  optionSelected: { backgroundColor: '#f0fdf4' },
  optionText: { fontSize: 14, color: '#374151' },
  optionTextSelected: { color: '#15803d', fontWeight: '600' },
});

// ─── Field label ─────────────────────────────────────────────────────────────
function FieldLabel({ text }) {
  return <Text style={fl.label}>{text}</Text>;
}
const fl = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [myPets, setMyPets] = useState([]);
  const [allPets, setAllPets] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [breedOptions, setBreedOptions] = useState([]);

  useEffect(() => { fetchPets(); }, []);

  const fetchPets = async () => {
    const my = await getMyPets(user.email);
    setMyPets(my);
    const all = await getAllPets();
    setAllPets(all.filter(p => p.user.email !== user.email));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    const selectedUri = result.assets[0].uri;
    setImageUri(selectedUri);

    const verification = await verifyPetImage(selectedUri);

    if (!verification || !verification.is_valid) {
      setType('');
      setBreed('');
      setBreedOptions([]);
      Alert.alert(
        'Image not recognized',
        verification?.message || 'Please choose a clear dog or cat image.'
      );
      return;
    }

    const detectedType = verification.pet_type || '';
    const detectedBreed = verification.breed || '';
    setType(detectedType);
    setBreedOptions(Array.isArray(verification.breed_options) ? verification.breed_options : (detectedType ? BREEDS[detectedType] : []));
    setBreed(detectedBreed);
  };

  const handleTypeChange = (val) => {
    setType(val);
    setBreed('');
    setBreedOptions(val ? BREEDS[val] : []);
  };

  const handleAddPet = async () => {
    if (!name || !type || !breed || !gender || !age) {
      Alert.alert('Incomplete', 'Please fill in all fields before adding.');
      return;
    }
    const newPet = { name, type, breed, gender, age: parseInt(age) };
    const result = await addPet(newPet, user.email, imageUri);

    if (result && result.id) {
      setMyPets(prev => [...prev, result]);
      resetForm();
      setModalVisible(false);
      Alert.alert('Success', `${name} has been added!`);
    } else {
      Alert.alert('Error', 'Failed to add pet. Please try again.');
    }
  };

  const resetForm = () => {
    setName('');
    setType('');
    setBreed('');
    setGender('');
    setAge('');
    setImageUri(null);
    setBreedOptions([]);
  };

  const handleDeletePet = async (id) => {
    Alert.alert('Remove Pet', 'Are you sure you want to remove this pet?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePet(id);
            setMyPets(prev => prev.filter(p => p.id !== id));
            setAllPets(prev => prev.filter(p => p.id !== id));
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const renderPetCard = (pet, isMyPet = false) => (
    <TouchableOpacity
      key={pet.id}
      style={styles.petCard}
      activeOpacity={0.75}
      onPress={() => navigation.navigate('PetDetails', { pet })}
    >
      <Image source={{ uri: getPetImageUrl(pet.id) }} style={styles.petImage} />

      <View style={styles.petInfo}>
        <Text style={styles.petName}>{pet.name}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pet.type}</Text>
          </View>
          <View style={[styles.badge, styles.badgeSecondary]}>
            <Text style={[styles.badgeText, styles.badgeTextSecondary]}>{pet.breed}</Text>
          </View>
        </View>
        <Text style={styles.petMeta}>{pet.gender}  ·  {pet.age} yrs old</Text>
        <Text style={styles.petOwner}>{pet.user.name || pet.user.email}</Text>
      </View>

      {isMyPet && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeletePet(pet.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Your furry family</Text>
          <Text style={styles.headerTitle}>My Pets</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Pet</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={myPets}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => renderPetCard(item, true)}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 8, paddingHorizontal: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="pets" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No pets yet.{'\n'}Add your first pet!</Text>
          </View>
        }
      />

      {/* Bottom Sheet Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Pet</Text>
              <TouchableOpacity
                onPress={() => { setModalVisible(false); resetForm(); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {/* Pet Name */}
              <FieldLabel text="Pet Name" />
              <TextInput
                placeholder="e.g. Buddy, Luna..."
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={setName}
                style={styles.textInput}
              />

              {/* Pet Type */}
              <FieldLabel text="Pet Type" />
              <StyledDropdown
                placeholder="Select type"
                options={PET_TYPES}
                value={type}
                onChange={handleTypeChange}
              />

              {/* Breed */}
              <FieldLabel text="Breed" />
              <StyledDropdown
                placeholder={type ? 'Select breed' : 'Select type first'}
                options={type ? (breedOptions.length ? breedOptions : BREEDS[type]) : []}
                value={breed}
                onChange={setBreed}
                disabled={!type}
              />

              {/* Gender */}
              <FieldLabel text="Gender" />
              <View style={styles.segmentRow}>
                {GENDERS.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.segment, gender === g && styles.segmentActive]}
                    onPress={() => setGender(g)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentText, gender === g && styles.segmentTextActive]}>
                      {g === 'Male' ? 'Male' : 'Female'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Age */}
              <FieldLabel text="Age (years)" />
              <TextInput
                placeholder="e.g. 2"
                placeholderTextColor="#9ca3af"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                style={[styles.textInput, { marginBottom: 14 }]}
              />

              {/* Photo */}
              <FieldLabel text="Photo" />
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="add-photo-alternate" size={28} color="#9ca3af" />
                    <Text style={styles.imagePlaceholderText}>Tap to add a photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Submit */}
              <TouchableOpacity style={styles.submitButton} onPress={handleAddPet} activeOpacity={0.85}>
                <MaterialIcons name="pets" size={18} color="#fff" />
                <Text style={styles.submitButtonText}>Add Pet</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#bbbab8' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: '#d2cfcf',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerSub: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d17c3b',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  petImage: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#f3f4f6' },
  petInfo: { flex: 1, marginLeft: 12 },
  petName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 5 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 5 },
  badge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#15803d' },
  badgeSecondary: { backgroundColor: '#f3f4f6' },
  badgeTextSecondary: { color: '#6b7280' },
  petMeta: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  petOwner: { fontSize: 11, color: '#9ca3af' },
  deleteBtn: { padding: 7, borderRadius: 8, backgroundColor: '#fef2f2', alignSelf: 'flex-start' },

  emptyState: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 1,
  },
  sheetHandle: {
    width: 40, height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20, paddingBottom: 40 },

  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 14,
  },

  segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  segment: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', backgroundColor: '#fff',
  },
  segmentActive: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  segmentText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  segmentTextActive: { color: '#15803d', fontWeight: '700' },

  imagePicker: {
    borderRadius: 12, overflow: 'hidden', marginBottom: 20,
    borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed',
  },
  imagePreview: { width: '100%', height: 160 },
  imagePlaceholder: {
    height: 110, alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#f9fafb',
  },
  imagePlaceholderText: { fontSize: 13, color: '#9ca3af' },

  submitButton: {
    backgroundColor: '#22c55e', paddingVertical: 15, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});