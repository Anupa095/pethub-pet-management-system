import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getPetImageUrl } from '../services/api';
import { getAllPets } from '../services/petApi';

const COLORS = {
    bg: '#f6f1e8',
    card: '#FFFFFF',
    primary: '#a75c43',
    primaryLight: '#F2E8E3',
    accent: '#3D6B5E',
    accentLight: '#E2EDE9',
    dark: '#1f2937',
    mid: '#6b7280',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    line: '#EAE2D8',
};

// 🔥 Vaccination field eka backend eke wenas namakin ewath puluwan
// (vaccinated, isVaccinated, vaccinationStatus) - okkoma try karanawa
function resolveVaccinationStatus(pet) {
    const raw = pet?.vaccinated ?? pet?.isVaccinated ?? pet?.vaccinationStatus;

    if (raw === true || raw === 'true' || raw === 'Vaccinated' || raw === 'VACCINATED' || raw === 'yes') {
        return { label: 'Vaccinated', ok: true, known: true };
    }
    if (raw === false || raw === 'false' || raw === 'Not Vaccinated' || raw === 'NOT_VACCINATED' || raw === 'no') {
        return { label: 'Not Vaccinated', ok: false, known: true };
    }
    return { label: 'Unknown', ok: null, known: false };
}

export default function PetProfile({ route, navigation, selectedMyPet: propsPet }) {
    // ලැබෙන දත්ත context එකෙන් හෝ navigation params හරහා ලබා ගැනීම
    // 🔥 navigation.navigate කරද්දී param name එක වෙනස් නම් (pet, item, selectedPet, etc.)
    // okkoma try karanawa, nathnam route.params eka witharama pet object ekak nam eth use karanawa
    const params = route?.params;
    const initialPet =
        propsPet ||
        params?.selectedMyPet ||
        params?.pet ||
        params?.selectedPet ||
        params?.item ||
        (params?.id ? params : null);

    const [pet, setPet] = useState(initialPet || null);
    const [loading, setLoading] = useState(!initialPet);
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        // pet object eka already ena widiyata thiyenawanam refetch karanne na,
        // id ekak witharak thiyenawanam (e.g. deep link) full details load karanawa
        if (initialPet?.name || !initialPet?.id) {
            setPet(initialPet || null);
            setLoading(false);
            return;
        }

        let active = true;
        (async () => {
            setLoading(true);
            const all = await getAllPets();
            if (!active) return;
            const found = Array.isArray(all) ? all.find((p) => p?.id === initialPet.id) : null;
            setPet(found || initialPet);
            setLoading(false);
        })();

        return () => { active = false; };
    }, [initialPet?.id]);

    useEffect(() => {
        if (__DEV__) {
            console.log('PetProfile opened. route.params:', params);
            console.log('PetProfile state pet:', pet);
        }
    }, [params, pet]);

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!pet) {
        if (__DEV__) {
            console.log('PetProfile: no pet found. route.params was:', params);
        }
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyText}>No Pet Profile Selected 🐾</Text>
                {__DEV__ && (
                    <Text style={styles.debugText}>
                        params: {params ? JSON.stringify(params) : 'undefined'}
                    </Text>
                )}
            </View>
        );
    }

    const vaccination = resolveVaccinationStatus(pet);
    const imageUrl = pet.id ? getPetImageUrl(pet.id) : null;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header / Back Button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pet Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Profile Image */}
            <View style={styles.imageContainer}>
                {imageUrl && !imageFailed ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.petImage}
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={{ fontSize: 64 }}>🐾</Text>
                    </View>
                )}

                {/* Vaccination badge - photo eke pahalin corner ekaka */}
                <View
                    style={[
                        styles.vaccineBadge,
                        vaccination.ok === true && styles.vaccineBadgeOk,
                        vaccination.ok === false && styles.vaccineBadgeBad,
                    ]}
                >
                    <MaterialIcons
                        name={vaccination.ok === true ? 'verified' : vaccination.ok === false ? 'error-outline' : 'help-outline'}
                        size={13}
                        color="#fff"
                    />
                    <Text style={styles.vaccineBadgeText}>{vaccination.label}</Text>
                </View>
            </View>

            {/* Pet Info Card */}
            <View style={styles.infoCard}>
                <Text style={styles.petName}>{pet.name || 'N/A'}</Text>
                <Text style={styles.petBreed}>{pet.breed || 'Unknown Breed'}</Text>

                <View style={styles.divider} />

                {/* Details Grid */}
                <View style={styles.grid}>
                    <InfoTile icon="pets" label="Type" value={pet.type || 'N/A'} />
                    <InfoTile icon="cake" label="Age" value={pet.age ? `${pet.age} Years` : 'N/A'} />
                    <InfoTile icon="wc" label="Gender" value={pet.gender || 'N/A'} />
                    <InfoTile icon="person" label="Owner" value={pet.user?.name || pet.user?.email || 'N/A'} />
                    <InfoTile
                        icon={vaccination.ok === true ? 'verified' : vaccination.ok === false ? 'error-outline' : 'help-outline'}
                        label="Vaccination"
                        value={vaccination.label}
                        valueColor={vaccination.ok === true ? COLORS.accent : vaccination.ok === false ? COLORS.danger : COLORS.mid}
                    />
                </View>
            </View>
        </ScrollView>
    );
}

/* Custom Component for Info Items */
function InfoTile({ icon, label, value, valueColor }) {
    return (
        <View style={styles.tile}>
            <View style={styles.iconBox}>
                <MaterialIcons name={icon} size={20} color={COLORS.primary} />
            </View>
            <View style={styles.tileContent}>
                <Text style={styles.tileLabel}>{label}</Text>
                <Text style={[styles.tileValue, valueColor && { color: valueColor }]}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingTop: 50, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },

    imageContainer: { alignItems: 'center', marginVertical: 20, position: 'relative' },
    petImage: {
        width: 150, height: 150, borderRadius: 75,
        borderWidth: 4, borderColor: COLORS.card,
        elevation: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    },
    avatarPlaceholder: {
        width: 150, height: 150, borderRadius: 75,
        backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: COLORS.card,
    },

    vaccineBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        position: 'absolute', bottom: 14, alignSelf: 'center',
        backgroundColor: COLORS.mid, borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 2, borderColor: COLORS.bg,
    },
    vaccineBadgeOk: { backgroundColor: COLORS.accent },
    vaccineBadgeBad: { backgroundColor: COLORS.danger },
    vaccineBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    infoCard: {
        backgroundColor: COLORS.card, marginHorizontal: 20, borderRadius: 20, padding: 20,
        elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 30,
    },
    petName: { fontSize: 26, fontWeight: '800', color: COLORS.dark, textAlign: 'center' },
    petBreed: { fontSize: 14, fontWeight: '500', color: COLORS.primary, textAlign: 'center', marginTop: 4 },
    divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 20 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    tile: { flexDirection: 'row', width: '48%', marginBottom: 16, alignItems: 'center', gap: 10 },
    iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
    tileContent: { flex: 1 },
    tileLabel: { fontSize: 11, color: COLORS.mid, fontWeight: '500' },
    tileValue: { fontSize: 14, color: COLORS.dark, fontWeight: '600', marginTop: 1 },

    emptyText: { fontSize: 16, color: COLORS.mid, fontWeight: '500' },
    debugText: { fontSize: 11, color: COLORS.mid, marginTop: 10, paddingHorizontal: 20, textAlign: 'center' },
});