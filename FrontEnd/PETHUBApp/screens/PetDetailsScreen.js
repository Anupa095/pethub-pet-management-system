import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, Image,
    FlatList, TouchableOpacity,
    ActivityIndicator, Alert, StatusBar,
    SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
} from '../services/matchApi';
import BottomNavBar from './BottomNavBar';
import MenuSide from './menuside';

export default function PetDetailsScreen() {

    const [pets, setPets] = useState([]);
    const [myPets, setMyPets] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [confirmedMatches, setConfirmedMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sendingConnectPetId, setSendingConnectPetId] = useState(null);
    const [confirmingMatchId, setConfirmingMatchId] = useState(null);
    const [deletingMatchId, setDeletingMatchId] = useState(null);
    const [selectedMyPetId, setSelectedMyPetId] = useState(null);
    const [drawerVisible, setDrawerVisible] = useState(false);

    const { user, handleLogout } = useAuth();
    const navigation = useNavigation();
    const route = useRoute();

    const viewedPet = route?.params?.pet ?? null;

    const openDrawer = () => setDrawerVisible(true);
    const closeDrawer = () => setDrawerVisible(false);

    const goToScreen = (screenName) => {
        closeDrawer();
        if (screenName === 'PetProfile') {
            navigation.navigate('PetProfile', { pet: selectedMyPet, isOwnPet: true });
        } else {
            navigation.navigate(screenName);
        }
    };

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

    // ─── Incoming Pending Requests filter (තමන්ට ලැබුණු ඒවා විතරයි) ──────────
    const incomingPendingRequests = useMemo(() => {
        return pendingRequests.filter((req) => req?.targetPetId === selectedMyPetId);
    }, [pendingRequests, selectedMyPetId]);

    // ─── Best Match Logic with Age Ranges ───────────────────────────
    const isBestMatch = (candidatePet) => {
        if (!selectedMyPet || !candidatePet) return false;

        const sameBreed =
            selectedMyPet?.breed &&
            candidatePet?.breed &&
            selectedMyPet.breed.trim().toLowerCase() === candidatePet.breed.trim().toLowerCase();

        const oppositeGender =
            selectedMyPet?.gender &&
            candidatePet?.gender &&
            selectedMyPet.gender.trim().toLowerCase() !== candidatePet.gender.trim().toLowerCase();

        if (!sameBreed || !oppositeGender) return false;

        const isOptimalAge = (pet) => {
            const age = parseFloat(pet?.age);
            if (isNaN(age)) return false;

            const species = (pet?.species || pet?.category || pet?.type || '').toLowerCase();

            if (species.includes('dog')) {
                return age >= 1.6 && age <= 7.0;
            } else if (species.includes('cat')) {
                return age >= 1.4 && age <= 8.0;
            }

            return false;
        };

        return isOptimalAge(selectedMyPet) && isOptimalAge(candidatePet);
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

            if (effectivePetId && effectivePetId !== selectedMyPetId) {
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
    }, [user?.email, viewedPet?.id]);

    // ─── CONNECT HANDLER ───
    const handleConnect = async (targetPet) => {
        if (!user?.email) { Alert.alert('Login required'); return; }
        if (!myPets.length) { Alert.alert('Add your pet first'); return; }
        if (!selectedMyPet) { Alert.alert('Select your pet first'); return; }
        if (targetPet?.user?.email === user.email) { Alert.alert('Cannot connect to your own pet'); return; }

        setSendingConnectPetId(targetPet.id);
        const result = await sendMatchRequest(user.email, selectedMyPet.id, targetPet.id);
        setSendingConnectPetId(null);

        if (!result.success) { 
            Alert.alert(result.message); 
            return; 
        }

        Alert.alert('Success', 'Match request sent successfully!');

        setPendingRequests((prev) => [
            ...prev,
            {
                id: result?.data?.id || Date.now(),
                requesterPetId: selectedMyPet.id,
                targetPetId: targetPet.id,
            }
        ]);
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

    // ─── RENDER: Breeding Match Card ─────────────────────────────────────────
    const renderMatch = ({ item }) => {
        const bestMatch = isBestMatch(item);
        return (
            <View style={[styles.matchCardFrame, bestMatch && styles.matchCardFrameBest]}>
                <View style={[styles.matchCard, bestMatch && styles.matchCardBest]}>
                    <View>
                        <Image source={{ uri: getPetImageUrl(item?.id) }} style={styles.matchImage} />
                        {bestMatch && (
                            <View style={styles.bestMatchBadge}>
                                <Text style={styles.bestMatchBadgeText}>✨ Best Match</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.matchInfoOverlay}>
                        <Text style={styles.matchName} numberOfLines={1}>{item?.name}</Text>
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
                            👤 {item?.user?.name || item?.user?.email}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.connectBtn, bestMatch && styles.connectBtnBest]}
                        onPress={() => handleConnect(item)}
                        activeOpacity={0.85}
                        disabled={sendingConnectPetId === item?.id}
                    >
                        <Text style={styles.connectBtnText}>
                            {sendingConnectPetId === item?.id ? '...' : '🐾 Connect'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // ─── RENDER: Pending Card (Incoming Requests) ────────────────────────────
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

    // ─── RENDER: Confirmed Match Card (View Profile එක සහිතයි) ─────────────────
    const renderConfirmed = ({ item }) => {
        // 1. අනික් Pet ගේ ID එක සොයාගැනීම
        const pairedPetId = item?.requesterPetId === selectedMyPetId
            ? item?.targetPetId
            : item?.requesterPetId;

        // 2. All Pets (pets) ලැයිස්තුවෙන් අදාළ සම්පූර්ණ pet object එක ලබාගැනීම
        const fullPetDetails = pets.find((p) => p?.id === pairedPetId);

        // 3. full pet details නැතිවිට match details මගින් fallback object එකක් සැකසීම
        const pairedPet = fullPetDetails || { 
            id: pairedPetId, 
            name: item?.requesterPetId === selectedMyPetId ? item?.targetPetName : item?.requesterPetName, 
            user: {
                name: item?.requesterPetId === selectedMyPetId ? item?.targetOwnerName : item?.requesterOwnerName,
                email: item?.requesterPetId === selectedMyPetId ? item?.targetOwnerEmail : item?.requesterOwnerEmail,
            },
            species: item?.requesterPetId === selectedMyPetId ? item?.targetPetSpecies : item?.requesterPetSpecies,
            breed: item?.requesterPetId === selectedMyPetId ? item?.targetPetBreed : item?.requesterPetBreed,
            gender: item?.requesterPetId === selectedMyPetId ? item?.targetPetGender : item?.requesterPetGender,
            age: item?.requesterPetId === selectedMyPetId ? item?.targetPetAge : item?.requesterPetAge,
        };

        return (
            <View style={styles.confirmedCard}>
                <Image source={{ uri: getPetImageUrl(pairedPet?.id) }} style={styles.confirmedImage} />
                <View style={styles.confirmedOverlay}>
                    <View style={styles.confirmedBadge}>
                        <Text style={styles.confirmedBadgeText}>✓ Connected</Text>
                    </View>
                    <Text style={styles.confirmedPetName}>{pairedPet?.name}</Text>
                    <Text style={styles.confirmedOwner}>
                        👤 {pairedPet?.user?.name || pairedPet?.user?.email || pairedPet?.owner}
                    </Text>
                    
                    <TouchableOpacity
                        style={styles.viewProfileBtn}
                        onPress={() => navigation.navigate('PetProfile', { pet: pairedPet, isOwnPet: false })}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.viewProfileBtnText}>👤 View Profile</Text>
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
            {/* Hero Welcome Banner */}
            <View style={styles.heroBanner}>
                <View style={styles.cutoutContainer}>
                    <TouchableOpacity
                        style={styles.drawerToggle}
                        onPress={openDrawer}
                        activeOpacity={0.85}
                    >
                        <MaterialIcons name="menu" size={22} color={COLORS.white} />
                    </TouchableOpacity>
                </View>

                <View style={styles.heroContent}>
                    <Text style={styles.heroGreeting}>Hello</Text>
                    <Text style={styles.heroTitle}>
                        {selectedMyPet ? `Welcome, ${selectedMyPet.name}!` : 'Pet Matching'}
                    </Text>
                    <Text style={styles.heroSubtitle}>Find the perfect breeding partner</Text>
                </View>

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

            {/* Featured Profile */}
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

            {/* Breeding Match */}
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

            {/* Pending Requests */}
            {incomingPendingRequests.length > 0 && (
                <>
                    <SectionHeader title="Pending Requests" count={incomingPendingRequests.length} />
                    <FlatList
                        data={incomingPendingRequests}
                        renderItem={renderPending}
                        keyExtractor={(item, i) => item?.id?.toString() || i.toString()}
                        scrollEnabled={false}
                        contentContainerStyle={{ paddingHorizontal: 14 }}
                    />
                </>
            )}

            {/* Confirmed */}
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

            <MenuSide
                visible={drawerVisible}
                onClose={closeDrawer}
                onNavigate={goToScreen}
                onLogout={handleLogout}
                selectedMyPet={selectedMyPet}
            />

            <FlatList
                data={confirmedMatches}
                renderItem={renderConfirmed}
                keyExtractor={(item, i) => item?.id?.toString() || i.toString()}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={{ paddingBottom: 110 }}
                showsVerticalScrollIndicator={false}
                style={{ backgroundColor: COLORS.bg }}
            />

            <BottomNavBar />
        </SafeAreaView>
    );
}

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const COLORS = {
    bg: '#f6f1e8',            
    card: '#FFFFFF',
    primary: '#a75c43',
    primaryLight: '#F2E8E3',
    accent: '#3D6B5E',
    accentLight: '#E2EDE9',
    dark: '#111827',          
    mid: '#6B7280',
    light: '#9CA3AF',
    confirmed: '#3D6B5E',
    pending: '#B8860B',
    pendingBg: '#FFF8E7',
    danger: '#EF4444',        
    dangerLight: '#FEE2E2',
    bestMatch: '#7C3AED',
    bestMatchBg: '#EDE9FE',
    white: '#FFFFFF',
    shadow: 'rgba(0, 0, 0, 0.04)',
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

    safeArea: { flex: 1, backgroundColor: COLORS.bg },

    bgOrbTopRight: {
        position: 'absolute', top: -55, right: -40, width: 200, height: 200,
        borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.38)',
    },
    bgOrbBottomLeft: {
        position: 'absolute', left: -75, bottom: 130, width: 240, height: 240,
        borderRadius: 120, backgroundColor: 'rgba(139,94,60,0.08)',
    },
    bgSoftBand: {
        position: 'absolute', top: 190, left: 0, right: 0, height: 120,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    bgHaloCenter: {
        position: 'absolute', top: 250, left: '15%', width: 260, height: 260,
        borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.16)',
    },
    bgPetalLeft: {
        position: 'absolute', top: 90, left: -30, width: 120, height: 220,
        borderRadius: 80, transform: [{ rotate: '-18deg' }], backgroundColor: 'rgba(194,96,63,0.08)',
    },
    bgPetalRight: {
        position: 'absolute', top: 320, right: -25, width: 110, height: 200,
        borderRadius: 70, transform: [{ rotate: '15deg' }], backgroundColor: 'rgba(61,107,94,0.08)',
    },
    bgPawMarkOne: {
        position: 'absolute', top: 120, right: 26, fontSize: 42, color: 'rgba(139,94,60,0.14)',
    },
    bgPawMarkTwo: {
        position: 'absolute', bottom: 155, left: 22, fontSize: 48, color: 'rgba(61,107,94,0.12)',
        transform: [{ rotate: '-15deg' }],
    },

    loadingContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: COLORS.bg, gap: 12,
    },
    loadingText: { color: COLORS.mid, fontSize: 15, fontWeight: '500' },

    heroBanner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: COLORS.dark, marginRight: 18, marginLeft: 0, marginTop: 50, marginBottom: 15,
        borderTopRightRadius: 22, borderBottomRightRadius: 22, paddingVertical: 10, paddingRight: 16,
        paddingLeft: 0, position: 'relative',
    },
    
    cutoutContainer: {
        backgroundColor: COLORS.bg, width: 55, height: 64, justifyContent: 'center',
        alignItems: 'center', borderTopRightRadius: 32, borderBottomRightRadius: 32, marginRight: 12,
    },

    drawerToggle: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#111111', 
        alignItems: 'center', justifyContent: 'center', shadowColor: '#000',
        shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 1, height: 2 }, elevation: 4,
    },

    heroContent: { flex: 1, paddingRight: 95, justifyContent: 'center' },
    heroGreeting: { color: COLORS.light, fontSize: 13, fontWeight: '500', marginBottom: 2 },
    heroTitle: { color: COLORS.white, fontSize: 21, fontWeight: '800', lineHeight: 26, marginBottom: 2 },
    heroSubtitle: { color: '#9E9892', fontSize: 12 },
    
    heroPaw: { position: 'absolute', right: 14, top: -15, bottom: -15, justifyContent: 'center', alignItems: 'center' },
    heroPetAvatar: {
        width: 87, height: 87, borderRadius: 45, borderWidth: 2.0, borderColor: COLORS.primary, 
        backgroundColor: COLORS.card, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5,
        shadowOffset: { width: 0, height: 3 },
    },

    sectionHeader: { marginHorizontal: 14, marginTop: 22, marginBottom: 10 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.dark },
    sectionDivider: { height: 1.5, backgroundColor: '#E8E3DE', borderRadius: 2 },
    countBadge: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
    countBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },

    emptyBox: {
        alignItems: 'center', paddingVertical: 20, marginHorizontal: 14, backgroundColor: COLORS.card,
        borderRadius: 16, marginBottom: 8, borderWidth: 1.5, borderColor: '#EDE8E3', borderStyle: 'dashed',
    },
    emptyIcon: { fontSize: 28, marginBottom: 6 },
    emptyText: { color: COLORS.light, fontSize: 13, fontWeight: '500' },

    featureCard: { marginHorizontal: 14, marginBottom: 8, borderRadius: 22, overflow: 'hidden', height: 300 },
    featureImage: { width: '100%', height: '100%', position: 'absolute' },
    featureOverlay: { flex: 1, justifyContent: 'flex-end', padding: 20, backgroundColor: 'rgba(28,25,23,0.55)' },
    featureTag: { alignSelf: 'flex-start', backgroundColor: '#F7CB45', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
    featureTagText: { color: COLORS.dark, fontWeight: '700', fontSize: 12 },
    featureName: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
    featureOwner: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 2, marginBottom: 14 },
    featureBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
    featureBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

    matchCardFrame: {
        marginRight: 14,
        padding: 5,                  
        borderRadius: 22,
        backgroundColor: '#FFFFFF',  
        borderWidth: 1,
        borderColor: '#E1D9CD',      
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    matchCardFrameBest: {
        borderColor: COLORS.bestMatch, 
        borderWidth: 1.5,
        shadowColor: COLORS.bestMatch,
        shadowOpacity: 0.1,
        elevation: 4,
    },
    matchCard: {
        width: 150,
        backgroundColor: COLORS.card,
        borderRadius: 16, 
        overflow: 'hidden',
    },
    matchCardBest: {},
    matchImage: { width: '100%', height: 115, borderRadius: 12 },
    bestMatchBadge: {
        position: 'absolute', top: 8, left: 6,
        backgroundColor: COLORS.bestMatch, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
    },
    bestMatchBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '800' },
    matchInfoOverlay: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
    matchName: { fontWeight: '700', fontSize: 14, color: COLORS.dark },
    matchMetaRow: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
    metaPill: { backgroundColor: COLORS.primaryLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    metaPillBreed: { backgroundColor: COLORS.accentLight },
    metaPillText: { fontSize: 10, color: COLORS.dark, fontWeight: '600' },
    matchOwner: { fontSize: 11, color: COLORS.mid, marginTop: 5 },
    connectBtn: { margin: 8, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
    connectBtnBest: { backgroundColor: COLORS.bestMatch },
    connectBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },

    pendingCard: {
        flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 18, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: '#EDE8E3', shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1, shadowRadius: 8, elevation: 2,
    },
    pendingLeft: { alignItems: 'center', marginRight: 12 },
    pendingImage: { width: 58, height: 58, borderRadius: 29 },
    pendingBadge: { backgroundColor: COLORS.pendingBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 5 },
    pendingBadgeText: { color: COLORS.pending, fontSize: 10, fontWeight: '700' },
    pendingInfo: { flex: 1 },
    pendingTitle: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
    pendingSubTitle: { fontSize: 12, color: COLORS.mid, marginTop: 2, marginBottom: 6 },
    buttonRow: { flexDirection: 'row', gap: 8 },
    confirmBtn: { flex: 1, backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
    confirmBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
    deleteBtn: { flex: 1, backgroundColor: COLORS.dangerLight, borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary },
    deleteBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },

    confirmedCard: { marginHorizontal: 14, marginBottom: 14, borderRadius: 22, overflow: 'hidden', height: 260 },
    confirmedImage: { width: '100%', height: '100%', position: 'absolute' },
    confirmedOverlay: { flex: 1, justifyContent: 'flex-end', padding: 18, backgroundColor: 'rgba(0,0,0,0.35)' },
    confirmedBadge: { alignSelf: 'flex-start', backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8 },
    confirmedBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
    confirmedPetName: { color: COLORS.white, fontSize: 20, fontWeight: '800' },
    confirmedOwner: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 3, marginBottom: 12 },

    viewProfileBtn: { 
        backgroundColor: COLORS.primary, 
        borderRadius: 10, 
        paddingVertical: 9, 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    viewProfileBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
});