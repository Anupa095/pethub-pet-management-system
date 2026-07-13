import React from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function PetProfile({ route, navigation, selectedMyPet: propsPet }) {
    // ලැබෙන දත්ත context එකෙන් හෝ navigation params හරහා ලබා ගැනීම
    const pet = propsPet || route?.params?.selectedMyPet;

    // පින්තූරය ලබාගැනීමේ url එක (ඔයාගේ API එකට අනුව වෙනස් කරගන්න)
    const getPetImageUrl = (id) => `https://your-api-url.com/pets/${id}/image`;

    if (!pet) {
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyText}>No Pet Profile Selected 🐾</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header / Back Button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pet Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Profile Image */}
            <View style={styles.imageContainer}>
                {pet.id ? (
                    <Image source={{ uri: getPetImageUrl(pet.id) }} style={styles.petImage} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={{ fontSize: 64 }}>🐾</Text>
                    </View>
                )}
            </View>

            {/* Pet Info Card */}
            <View style={styles.infoCard}>
                <Text style={styles.petName}>{pet.name || 'N/A'}</Text>
                <Text style={styles.petBreed}>{pet.breed || 'Unknown Breed'}</Text>

                <View style={styles.divider} />

                {/* Details Grid */}
                <View style={styles.grid}>
                    <InfoTile icon="pets" label="Type" value={pet.type || 'Dog/Cat'} />
                    <InfoTile icon="cake" label="Age" value={pet.age ? `${pet.age} Years` : 'N/A'} />
                    <InfoTile icon="wc" label="Gender" value={pet.gender || 'N/A'} />
                    <InfoTile icon="person" label="Owner" value={pet.user?.name || 'Owner'} />
                </View>
            </View>
        </ScrollView>
    );
}

/* Custom Component for Info Items */
function InfoTile({ icon, label, value }) {
    return (
        <View style={styles.tile}>
            <View style={styles.iconBox}>
                <MaterialIcons name={icon} size={20} color="#a75c43" />
            </View>
            <View style={styles.tileContent}>
                <Text style={styles.tileLabel}>{label}</Text>
                <Text style={styles.tileValue}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingTop: 50, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
    imageContainer: { alignItems: 'center', marginVertical: 20 },
    petImage: { width: 150, height: 150, borderRadius: 75, borderWidth: 4, borderColor: '#fff', elevation: 4 },
    avatarPlaceholder: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#F9F1EE', justifyContent: 'center', alignItems: 'center' },
    infoCard: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
    petName: { fontSize: 26, fontWeight: '800', color: '#111', textAlign: 'center' },
    petBreed: { fontSize: 14, fontWeight: '500', color: '#a75c43', textAlign: 'center', marginTop: 4 },
    divider: { height: 1, backgroundColor: '#EAEAEA', marginVertical: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    tile: { flexDirection: 'row', width: '48%', marginBottom: 16, alignItems: 'center', gap: 10 },
    iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F9F1EE', justifyContent: 'center', alignItems: 'center' },
    tileContent: { flex: 1 },
    tileLabel: { fontSize: 11, color: '#888', fontWeight: '500' },
    tileValue: { fontSize: 14, color: '#333', fontWeight: '600', marginTop: 1 },
    emptyText: { fontSize: 16, color: '#666', fontWeight: '500' }
});