import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, Image,
    FlatList, TouchableOpacity,
    ActivityIndicator, Alert, StatusBar,
    SafeAreaView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getAllPets, getMyPets } from '../services/petApi';
import { getPetImageUrl } from '../services/api';
import {
    sendMatchRequest,
    getPendingMatchRequests,
    confirmMatchRequest,
    getConfirmedMatches,
    rejectMatchRequest,
    removeMatch,
} from '../services/matchApi';

export default function PetDetailsScreen() {

    const NAV_COLORS = {
        Home: '#fbfbfb',
        Tracking: '#edf4f1',
        Care: '#060000',
        Social: '#000207',
    };

    const NAV_TEXT_COLORS = {
        active: '#ffffff',
        inactive: '#F2ECE5',
    };

    const [pets, setPets] = useState([]);
    const [myPets, setMyPets] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [confirmedMatches, setConfirmedMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingConnectPetId, setSendingConnectPetId] = useState(null);
    const [confirmingMatchId, setConfirmingMatchId] = useState(null);
    const [deletingMatchId, setDeletingMatchId] = useState(null);
    const [removingMatchId, setRemovingMatchId] = useState(null);
    const [selectedMyPetId, setSelectedMyPetId] = useState(null);

    const { user } = useAuth();
    const navigation = useNavigation();
    const route = useRoute();

    const viewedPet = route?.params?.pet ?? null;

    const isViewedPetMine = useMemo(
        () => !!viewedPet?.id && myPets.some((pet) => pet?.id === viewedPet.id),
        [myPets, viewedPet?.id]
    );

    const featuredTargetPet = useMemo(() => {
        if (!viewedPet || isViewedPetMine) return null;
        return viewedPet;
    }, [isViewedPetMine, viewedPet]);

    const myPetIds = useMemo(
        () => new Set(myPets.map((p) => p?.id)),
        [myPets]
    );

    const confirmedPetIds = useMemo(() => {
        return new Set(
            confirmedMatches.map((match) =>
                match?.requesterPetId === selectedMyPetId
                    ? match?.targetPetId
                    : match?.requesterPetId
            )
        );
    }, [confirmedMatches, selectedMyPetId]);

    const pendingPetIds = useMemo(() => {
        return new Set(
            pendingRequests.map((req) =>
                req?.requesterPetId === selectedMyPetId
                    ? req?.targetPetId
                    : req?.requesterPetId
            )
        );
    }, [pendingRequests, selectedMyPetId]);

    const candidatePets = useMemo(
        () => pets.filter(
            (pet) =>
                pet?.id !== featuredTargetPet?.id &&
                !myPetIds.has(pet?.id) &&
                !confirmedPetIds.has(pet?.id) &&
                !pendingPetIds.has(pet?.id)
        ),
        [pets, featuredTargetPet?.id, myPetIds, confirmedPetIds, pendingPetIds]
    );

    const selectedMyPet = useMemo(
        () => myPets.find((pet) => pet?.id === selectedMyPetId) ?? null,
        [myPets, selectedMyPetId]
    );

    const isBestMatch = (candidatePet) => {
        if (!selectedMyPet) return false;
        const sameBreed =
            selectedMyPet?.breed &&
            candidatePet?.breed &&
            selectedMyPet.breed.toLowerCase() === candidatePet.breed.toLowerCase();
        const oppositeGender =
            selectedMyPet?.gender &&
            candidatePet?.gender &&
            selectedMyPet.gender.toLowerCase() !== candidatePet.gender.toLowerCase();
        return sameBreed && oppositeGender;
    };

    const fetchData = async () => {
        if (!user?.email) {
            setLoading(false);
            return;
        }

        try {
            const [allPets, ownPets] = await Promise.all([
                getAllPets(),
                getMyPets(user.email),
            ]);

            const safeAllPets = Array.isArray(allPets) ? allPets : [];
            const safeOwnPets = Array.isArray(ownPets) ? ownPets : [];

            const myPetIdsSet = new Set(safeOwnPets.map(p => p?.id));

            const routeOwnedPetId = viewedPet?.id && myPetIdsSet.has(viewedPet.id)
                ? viewedPet.id : null;
            const currentSelectedPetId = selectedMyPetId && myPetIdsSet.has(selectedMyPetId)
                ? selectedMyPetId : null;
            const effectivePetId = routeOwnedPetId || currentSelectedPetId || safeOwnPets[0]?.id || null;

            const [pending, confirmed] = await Promise.all([
                getPendingMatchRequests(user.email, effectivePetId),
                getConfirmedMatches(user.email, effectivePetId),
            ]);

            const filteredPets = safeAllPets.filter(
                (pet) => pet?.user?.email !== user?.email
            );

            setPets(filteredPets);
            setMyPets(safeOwnPets);
            setPendingRequests(Array.isArray(pending) ? pending : []);
            setConfirmedMatches(Array.isArray(confirmed) ? confirmed : []);

            if (effectivePetId !== selectedMyPetId) {
                setSelectedMyPetId(effectivePetId);
            }

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.email, viewedPet?.id, selectedMyPetId]);

    const handleConnect = async (targetPet) => {
        if (!user?.email) { Alert.alert('Login required'); return; }
        if (!myPets.length) { Alert.alert('Add your pet first'); return; }
        if (!selectedMyPet) { Alert.alert('Select your pet first'); return; }
        if (targetPet?.user?.email === user.email) { Alert.alert('Cannot connect to your own pet'); return; }

        setSendingConnectPetId(targetPet.id);
        const result = await sendMatchRequest(user.email, selectedMyPet.id, targetPet.id);
        setSendingConnectPetId(null);

        if (!result.success) { Alert.alert(result.message); return; }
        Alert.alert('Request sent');
        fetchData();
    };

    const handleConfirm = async (item) => {
        setConfirmingMatchId(item.id);
        const result = await confirmMatchRequest(item.id, user.email);
        setConfirmingMatchId(null);
        if (!result.success) { Alert.alert(result.message); return; }
        Alert.alert('Confirmed!');
        fetchData();
    };

    const handleDelete = async (item) => {
        setDeletingMatchId(item.id);
        const result = await rejectMatchRequest(item.id, user.email);
        setDeletingMatchId(null);
        if (!result.success) { Alert.alert(result.message); return; }
        Alert.alert('Deleted!');
        fetchData();
    };

    const handleRemoveMatch = (item) => {
        Alert.alert(
            'Remove Match',
            'Are you sure you want to remove this match?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        setRemovingMatchId(item.id);
                        const result = await removeMatch(item.id, user.email);
                        setRemovingMatchId(null);
                        if (!result.success) { Alert.alert(result.message); return; }
                        Alert.alert('Match removed');
                        fetchData();
                    },
                },
            ]
        );
    };

    const handleBottomNavPress = (tab) => {
        if (tab === 'Home') {
            navigation.navigate('Home');
            return;
        }

        Alert.alert(`${tab} screen coming soon`);
    };

    const renderBottomNavItem = (label, icon, active) => (
        <TouchableOpacity
            key={label}
            style={styles.bottomNavItem}
            activeOpacity={0.8}
            onPress={() => handleBottomNavPress(label)}
        >
            <Ionicons
                name={icon}
                size={27}
                color={NAV_COLORS[label]}
            />
            <Text
                style={[
                    styles.bottomNavLabel,
                    { color: active ? NAV_TEXT_COLORS.active : NAV_TEXT_COLORS.inactive },
                    active && styles.bottomNavLabelActive,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    // ─── RENDER: My Pet Picker ───────────────────────────────────────────────
    

    // ─── RENDER: Breeding Match Card ─────────────────────────────────────────
    const renderMatch = ({ item }) => {
        const bestMatch = isBestMatch(item);
        return (
            <View style={[styles.matchCard, bestMatch && styles.matchCardBest]}>
                <View>
                    <Image source={{ uri: getPetImageUrl(item?.id) }} style={styles.matchImage} />
                    {bestMatch && (
                        <View style={styles.bestMatchBadge}>
                            <Text style={styles.bestMatchBadgeText}>Best Match</Text>
                        </View>
                    )}
                </View>
                <View style={styles.matchInfoOverlay}>
                    <Text style={styles.matchName}>{item?.name}</Text>
                    <View style={styles.matchMetaRow}>
                        {item?.gender && (
                            <View style={styles.metaPill}>
                                <Text style={styles.metaPillText}>
                                    {item.gender.toLowerCase() === 'male' ? '♂' : '♀'} {item.gender}
                                </Text>
                            </View>
                        )}
                        {item?.breed && (
                            <View style={[styles.metaPill, styles.metaPillBreed]}>
                                <Text style={styles.metaPillText} numberOfLines={1}>{item.breed}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.matchOwner} numberOfLines={1}>
                        {item?.user?.name || item?.user?.email}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.connectBtn, bestMatch && styles.connectBtnBest]}
                    onPress={() => handleConnect(item)}
                    activeOpacity={0.85}
                >
                    <Text style={styles.connectBtnText}>
                        {sendingConnectPetId === item?.id ? '...' : '🐾 Connect'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    // ─── RENDER: Pending Card ────────────────────────────────────────────────
    const renderPending = ({ item }) => (
        <View style={styles.pendingCard}>
            <View style={styles.pendingLeft}>
                <Image source={{ uri: getPetImageUrl(item?.requesterPetId) }} style={styles.pendingImage} />
                <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
            </View>
            <View style={styles.pendingInfo}>
                <Text style={styles.pendingTitle}>{item?.requesterPetName}</Text>
                <Text style={styles.pendingSubTitle}>wants to match with {item?.targetPetName}</Text>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() => handleConfirm(item)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.confirmBtnText}>
                            {confirmingMatchId === item?.id ? '...' : '✓ Accept'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDelete(item)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.deleteBtnText}>
                            {deletingMatchId === item?.id ? '...' : '✕ Decline'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    // ─── RENDER: Confirmed Match Card ────────────────────────────────────────
    const renderConfirmed = ({ item }) => {
        const pairedPet = item?.requesterPetId === selectedMyPetId
            ? { id: item?.targetPetId, name: item?.targetPetName, owner: item?.targetOwnerName || item?.targetOwnerEmail }
            : { id: item?.requesterPetId, name: item?.requesterPetName, owner: item?.requesterOwnerName || item?.requesterOwnerEmail };

        const isRemoving = removingMatchId === item?.id;

        return (
            <View style={styles.confirmedCard}>
                <Image source={{ uri: getPetImageUrl(pairedPet?.id) }} style={styles.confirmedImage} />
                <View style={styles.confirmedOverlay}>
                    <View style={styles.confirmedBadge}>
                        <Text style={styles.confirmedBadgeText}>✓ Connected</Text>
                    </View>
                    <Text style={styles.confirmedPetName}>{pairedPet?.name}</Text>
                    <Text style={styles.confirmedOwner}>👤 {pairedPet?.owner}</Text>
                    <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleRemoveMatch(item)}
                        activeOpacity={0.85}
                        disabled={isRemoving}
                    >
                        <Text style={styles.removeBtnText}>
                            {isRemoving ? 'Removing...' : '✕ Remove Match'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // ─── SECTION HEADER ──────────────────────────────────────────────────────
    const SectionHeader = ({ title, count }) => (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {count !== undefined && count > 0 && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{count}</Text>
                    </View>
                )}
            </View>
            <View style={styles.sectionDivider} />
        </View>
    );

    // ─── LIST HEADER ─────────────────────────────────────────────────────────
    const ListHeader = () => (
        <View>
            {/* ── Hero Welcome Banner ── */}
            <View style={styles.heroBanner}>
                <View style={styles.heroContent}>
                    <Text style={styles.heroGreeting}>Hello 👋</Text>
                    <Text style={styles.heroTitle}>
                        {selectedMyPet ? `Welcome, ${selectedMyPet.name}!` : 'Pet Matching'}
                    </Text>
                    <Text style={styles.heroSubtitle}>Find the perfect breeding partner</Text>
                </View>

                {/* ── Pet Avatar (replaces 🐾 icon when pet is selected) ── */}
                <View style={styles.heroPaw}>
                    {selectedMyPet ? (
                        <Image
                            source={{ uri: getPetImageUrl(selectedMyPet?.id) }}
                            style={styles.heroPetAvatar}
                        />
                    ) : (
                        <Text style={{ fontSize: 52 }}>🐾</Text>
                    )}
                </View>
            </View>

            

            {/* ── Featured Profile ── */}
            {featuredTargetPet && (
                <>
                    <SectionHeader title="Featured Profile" />
                    <View style={styles.featureCard}>
                        <Image
                            source={{ uri: getPetImageUrl(featuredTargetPet?.id) }}
                            style={styles.featureImage}
                        />
                        <View style={styles.featureOverlay}>
                            <View style={styles.featureTag}>
                                <Text style={styles.featureTagText}>⭐ Featured</Text>
                            </View>
                            <Text style={styles.featureName}>{featuredTargetPet?.name}</Text>
                            <Text style={styles.featureOwner}>
                                {featuredTargetPet?.user?.name || featuredTargetPet?.user?.email}
                            </Text>
                            <TouchableOpacity
                                style={styles.featureBtn}
                                onPress={() => handleConnect(featuredTargetPet)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.featureBtnText}>
                                    {sendingConnectPetId === featuredTargetPet?.id ? 'Sending...' : '🐾 Connect Now'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </>
            )}

            {/* ── Breeding Match ── */}
            <SectionHeader title="Breeding Match" count={candidatePets.length} />
            {candidatePets.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>💝</Text>
                    <Text style={styles.emptyText}>No more candidates right now.</Text>
                </View>
            ) : (
                <FlatList
                    data={candidatePets}
                    horizontal
                    renderItem={renderMatch}
                    keyExtractor={(item, i) => item?.id?.toString() || i.toString()}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 8 }}
                />
            )}

            {/* ── Pending ── */}
            <SectionHeader title="Pending Requests" count={pendingRequests.length} />
            {pendingRequests.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>📭</Text>
                    <Text style={styles.emptyText}>No pending requests.</Text>
                </View>
            ) : (
                <FlatList
                    data={pendingRequests}
                    renderItem={renderPending}
                    keyExtractor={(item, i) => item?.id?.toString() || i.toString()}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingHorizontal: 14 }}
                />
            )}

            {/* ── Confirmed ── */}
            <SectionHeader title="Confirmed Matches" count={confirmedMatches.length} />
            {confirmedMatches.length === 0 && (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>🤝</Text>
                    <Text style={styles.emptyText}>No confirmed matches yet.</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Finding matches...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

            <View pointerEvents="none" style={styles.bgOrbTopRight} />
            <View pointerEvents="none" style={styles.bgOrbBottomLeft} />
            <View pointerEvents="none" style={styles.bgSoftBand} />
            <View pointerEvents="none" style={styles.bgHaloCenter} />
            <View pointerEvents="none" style={styles.bgPetalLeft} />
            <View pointerEvents="none" style={styles.bgPetalRight} />
            <Text pointerEvents="none" style={styles.bgPawMarkOne}>🐾</Text>
            <Text pointerEvents="none" style={styles.bgPawMarkTwo}>🐾</Text>

            <FlatList
                data={confirmedMatches}
                renderItem={renderConfirmed}
                keyExtractor={(item, i) => item?.id?.toString() || i.toString()}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
                style={{ backgroundColor: COLORS.bg }}
            />

            <View style={styles.bottomNavBar}>
    {renderBottomNavItem('Home', 'home-outline', false)}
    {renderBottomNavItem('AI-chat', 'chatbubble-ellipses-outline', false)}
    {renderBottomNavItem('Upload', 'cloud-upload-outline', false)}
    {renderBottomNavItem('Nearby', 'location-outline', false)}
    {renderBottomNavItem('Meal Plan', 'restaurant-outline', true)}
</View>
        </SafeAreaView>
    );
}

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const COLORS = {
    bg: '#bbbab8',
    card: '#FFFFFF',
    primary: '#a75c43',
    primaryLight: '#F2E8E3',
    accent: '#3D6B5E',
    accentLight: '#E2EDE9',
    dark: '#000000',
    mid: '#6B6560',
    light: '#B8B2AC',
    confirmed: '#3D6B5E',
    pending: '#B8860B',
    pendingBg: '#FFF8E7',
    danger: '#86817f',
    dangerLight: '#FDECEA',
    bestMatch: '#7C3AED',
    bestMatchBg: '#EDE9FE',
    white: '#FFFFFF',
    shadow: 'rgba(28, 25, 23, 0.10)',
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

    safeArea: { flex: 1, backgroundColor: COLORS.bg },

    bgOrbTopRight: {
        position: 'absolute',
        top: -55,
        right: -40,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.38)',
    },
    bgOrbBottomLeft: {
        position: 'absolute',
        left: -75,
        bottom: 130,
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: 'rgba(139,94,60,0.08)',
    },
    bgSoftBand: {
        position: 'absolute',
        top: 190,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    bgHaloCenter: {
        position: 'absolute',
        top: 250,
        left: '15%',
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    bgPetalLeft: {
        position: 'absolute',
        top: 90,
        left: -30,
        width: 120,
        height: 220,
        borderRadius: 80,
        transform: [{ rotate: '-18deg' }],
        backgroundColor: 'rgba(194,96,63,0.08)',
    },
    bgPetalRight: {
        position: 'absolute',
        top: 320,
        right: -25,
        width: 110,
        height: 200,
        borderRadius: 70,
        transform: [{ rotate: '15deg' }],
        backgroundColor: 'rgba(61,107,94,0.08)',
    },
    bgPawMarkOne: {
        position: 'absolute',
        top: 120,
        right: 26,
        fontSize: 42,
        color: 'rgba(139,94,60,0.14)',
    },
    bgPawMarkTwo: {
        position: 'absolute',
        bottom: 155,
        left: 22,
        fontSize: 48,
        color: 'rgba(61,107,94,0.12)',
        transform: [{ rotate: '-15deg' }],
    },

    loadingContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: COLORS.bg, gap: 12,
    },
    loadingText: { color: COLORS.mid, fontSize: 15, fontWeight: '500' },

    // ── Hero Banner ──
    heroBanner: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.dark,
        marginHorizontal: 14, marginTop: 16, marginBottom: 8,
        borderRadius: 22, padding: 20,
    },
    heroContent: { flex: 1 },
    heroGreeting: { color: COLORS.light, fontSize: 13, fontWeight: '500', marginBottom: 4 },
    heroTitle: { color: COLORS.white, fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: 4 },
    heroSubtitle: { color: '#9E9892', fontSize: 13 },
    heroPaw: { marginLeft: 10 },

    // ✅ Hero Pet Avatar — replaces 🐾 icon when a pet is selected
    heroPetAvatar: {
        width: 85,
        height: 85,
        borderRadius: 36,
        borderWidth: 3,
        borderColor: COLORS.primary,
    },

    // ── Section Header ──
    sectionHeader: { marginHorizontal: 14, marginTop: 22, marginBottom: 10 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.dark },
    sectionDivider: { height: 1.5, backgroundColor: '#E8E3DE', borderRadius: 2 },
    countBadge: {
        backgroundColor: COLORS.primary, borderRadius: 10,
        paddingHorizontal: 7, paddingVertical: 2,
    },
    countBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },

    // ── Empty Box ──
    emptyBox: {
        alignItems: 'center', paddingVertical: 20,
        marginHorizontal: 14, backgroundColor: COLORS.card,
        borderRadius: 16, marginBottom: 8,
        borderWidth: 1.5, borderColor: '#EDE8E3', borderStyle: 'dashed',
    },
    emptyIcon: { fontSize: 28, marginBottom: 6 },
    emptyText: { color: COLORS.light, fontSize: 13, fontWeight: '500' },

    // ── My Pet Picker ──
    myPetCard: {
        alignItems: 'center', marginRight: 10,
        paddingVertical: 10, paddingHorizontal: 12,
        borderRadius: 18, backgroundColor: COLORS.card,
        borderWidth: 1.5, borderColor: '#EDE8E3',
    },
    myPetCardSelected: { backgroundColor: COLORS.dark, borderColor: COLORS.dark },
    myPetImageWrapper: {
        width: 64, height: 64, borderRadius: 32,
        borderWidth: 2, borderColor: '#EDE8E3', overflow: 'hidden',
    },
    myPetImageWrapperSelected: { borderColor: COLORS.primary },
    myPetImage: { width: '100%', height: '100%' },
    myPetName: { marginTop: 6, color: COLORS.dark, fontWeight: '600', fontSize: 13 },
    myPetNameSelected: { color: COLORS.white },
    selectedDot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: COLORS.primary, marginTop: 4,
    },

    // ── Featured Card ──
    featureCard: {
        marginHorizontal: 14, marginBottom: 8,
        borderRadius: 22, overflow: 'hidden', height: 300,
    },
    featureImage: { width: '100%', height: '100%', position: 'absolute' },
    featureOverlay: {
        flex: 1, justifyContent: 'flex-end', padding: 20,
        backgroundColor: 'rgba(28,25,23,0.55)',
    },
    featureTag: {
        alignSelf: 'flex-start', backgroundColor: '#F7CB45',
        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10,
    },
    featureTagText: { color: COLORS.dark, fontWeight: '700', fontSize: 12 },
    featureName: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
    featureOwner: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2, marginBottom: 14 },
    featureBtn: {
        backgroundColor: COLORS.primary, borderRadius: 14,
        paddingVertical: 12, alignItems: 'center',
    },
    featureBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

    // ── Match Card ──
    matchCard: {
        width: 155, marginRight: 12,
        backgroundColor: COLORS.card,
        borderRadius: 18, overflow: 'hidden',
        borderWidth: 1, borderColor: '#EDE8E3',
    },
    matchCardBest: {
        borderWidth: 2.5,
        borderColor: COLORS.bestMatch,
    },
    matchImage: { width: '100%', height: 120 },
    bestMatchBadge: {
        position: 'absolute', top: 8, left: 6,
        backgroundColor: COLORS.bestMatch,
        borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
    },
    bestMatchBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '800' },
    matchInfoOverlay: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 },
    matchName: { fontWeight: '700', fontSize: 14, color: COLORS.dark },
    matchMetaRow: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
    metaPill: {
        backgroundColor: COLORS.primaryLight,
        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    },
    metaPillBreed: { backgroundColor: COLORS.accentLight },
    metaPillText: { fontSize: 10, color: COLORS.dark, fontWeight: '600' },
    matchOwner: { fontSize: 11, color: COLORS.mid, marginTop: 4 },
    connectBtn: {
        margin: 8, backgroundColor: COLORS.primary,
        borderRadius: 10, paddingVertical: 8, alignItems: 'center',
    },
    connectBtnBest: { backgroundColor: COLORS.bestMatch },
    connectBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },

    // ── Pending Card ──
    pendingCard: {
        flexDirection: 'row', backgroundColor: COLORS.card,
        borderRadius: 18, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: '#EDE8E3',
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1, shadowRadius: 8, elevation: 2,
    },
    pendingLeft: { alignItems: 'center', marginRight: 12 },
    pendingImage: { width: 58, height: 58, borderRadius: 29 },
    pendingBadge: {
        backgroundColor: COLORS.pendingBg,
        borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 5,
    },
    pendingBadgeText: { color: COLORS.pending, fontSize: 10, fontWeight: '700' },
    pendingInfo: { flex: 1 },
    pendingTitle: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
    pendingSubTitle: { fontSize: 12, color: COLORS.mid, marginTop: 2, marginBottom: 6 },
    buttonRow: { flexDirection: 'row', gap: 8 },
    confirmBtn: {
        flex: 1, backgroundColor: COLORS.accent,
        borderRadius: 10, paddingVertical: 8, alignItems: 'center',
    },
    confirmBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
    deleteBtn: {
        flex: 1, backgroundColor: COLORS.dangerLight,
        borderRadius: 10, paddingVertical: 8, alignItems: 'center',
        borderWidth: 1, borderColor: COLORS.primary,
    },
    deleteBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },

    // ── Confirmed Card ──
    confirmedCard: {
        marginHorizontal: 14, marginBottom: 14,
        borderRadius: 22, overflow: 'hidden', height: 260,
    },
    confirmedImage: { width: '100%', height: '100%', position: 'absolute' },
    confirmedOverlay: {
        flex: 1, justifyContent: 'flex-end', padding: 18,
        backgroundColor: 'rgba(28,25,23,0.55)',
    },
    confirmedBadge: {
        alignSelf: 'flex-start', backgroundColor: COLORS.accent,
        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8,
    },
    confirmedBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
    confirmedPetName: { color: COLORS.white, fontSize: 20, fontWeight: '800' },
    confirmedOwner: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3, marginBottom: 12 },

    // ── Remove Button ──
    removeBtn: {
        backgroundColor: 'rgba(194,96,63,0.18)',
        borderRadius: 10, paddingVertical: 9, alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(194,96,63,0.5)',
    },
    removeBtnText: { color: '#FFBFAA', fontWeight: '700', fontSize: 13 },

    // ── Bottom Navbar ──
    bottomNavBar: {
        position: 'absolute',
        left: 10,
        right: 10,
        bottom: 10,
        height: 70,
        borderRadius: 25,
        backgroundColor: '#787878',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderWidth: 2.5,
        borderColor: '#8f8d8d',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 2, height: 4 },
        elevation: 8,
    },
    bottomNavItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomNavLabel: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: '700',
        color: '#8F8A84',
    },
    bottomNavLabelActive: {
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.12)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
});