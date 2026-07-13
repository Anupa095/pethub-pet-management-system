import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function MenuSide({ visible, onClose, onNavigate, onLogout, selectedMyPet }) {
    const drawerAnim = useRef(new Animated.Value(-280)).current;

    useEffect(() => {
        Animated.timing(drawerAnim, {
            toValue: visible ? 0 : -280,
            duration: 250,
            useNativeDriver: true,
        }).start();
    }, [drawerAnim, visible]);

    const handleNavigate = (screenName) => {
        if (onNavigate) {
            onNavigate(screenName);
        }
        if (onClose) {
            onClose();
        }
    };

    // සිලෙක්ට් වෙලා ඉන්න පෙට්ගේ නම අනුව ලේබල් එක සකස් කිරීම
    const petProfileLabel = selectedMyPet?.name ? `${selectedMyPet.name}'s Profile` : 'Pet Profile';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                
                <Animated.View 
                    style={[styles.panel, { transform: [{ translateX: drawerAnim }] }]}
                    onTouchStart={(e) => e.stopPropagation()} 
                >
                    <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1, width: '100%' }}>
                        
                        {/* ── HEADER SECTION ── */}
                        <View style={styles.headerContainer}>
                            <View style={styles.logoRow}>
                                <Text style={styles.logoIcon}>🐾</Text>
                                <Text style={styles.title}>PETHUB</Text>
                            </View>
                            <Text style={styles.subtitle}>Premium Pet Care Platform</Text>
                            <View style={styles.divider} />
                        </View>

                        {/* ── SCROLLABLE MENU ITEMS SECTION ── */}
                        <ScrollView 
                            style={styles.menuScrollView} 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                        >
                            <DrawerButton icon="favorite" label="Breeding Match" onPress={() => handleNavigate('PetDetails')} />
                            <DrawerButton icon="chat" label="AI Chat Hub" onPress={() => handleNavigate('AIChat')} />
                            <DrawerButton icon="restaurant" label="Meal Plan" onPress={() => handleNavigate('MealPlane')} />
                            <DrawerButton icon="vaccines" label="Vaccine Tracker" onPress={() => handleNavigate('Vaccine')} />
                            <DrawerButton icon="place" label="Nearby Stores" onPress={() => handleNavigate('Nearby')} />
                            
                            {/* 1. Pet Profile ක්ලික් කල විට අලුතින් හදපු 'PetProfile' එකට යයි */}
                            <DrawerButton icon="person" label={petProfileLabel} onPress={() => handleNavigate('PetProfile')} />
                            
                            {/* 2. Change Pet Profile ක්ලික් කල විට 'Home' (ප්‍රධාන) එකට යයි */}
                            <DrawerButton icon="switch-account" label="Change Pet Profile" onPress={() => handleNavigate('Home')} />
                        </ScrollView>

                        {/* ── FOOTER SECTION ── */}
                        {onLogout && (
                            <View style={styles.footer}>
                                <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.85}>
                                    <MaterialIcons name="logout" size={18} color="#a75c43" />
                                    <Text style={styles.logoutText}>Logout</Text>
                                </TouchableOpacity>
                                <Text style={styles.versionText}>v1.0.0</Text>
                            </View>
                        )}
                    </Pressable>
                </Animated.View>
                
            </Pressable>
        </Modal>
    );
}

/* ── CUSTOM DRAWER BUTTON COMPONENT ── */
function DrawerButton({ icon, label, onPress }) {
    return (
        <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.itemLeft}>
                <View style={styles.iconBackground}>
                    <MaterialIcons name={icon} size={20} color="#a75c43" />
                </View>
                <Text style={styles.itemText}>{label}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color="#B0B0B0" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', flexDirection: 'row' },
    panel: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, backgroundColor: '#FFFFFF', paddingTop: 65, paddingHorizontal: 20, borderTopRightRadius: 25, borderBottomRightRadius: 25, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 4, height: 0 }, elevation: 10 },
    headerContainer: { marginBottom: 15 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logoIcon: { fontSize: 24 },
    title: { fontSize: 24, fontWeight: '900', color: '#000000', letterSpacing: 0.5 },
    subtitle: { marginTop: 4, color: '#666666', fontSize: 12, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#EAEAEA', marginTop: 15 },
    menuScrollView: { flex: 1 },
    scrollContent: { paddingVertical: 10 },
    item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 6, marginBottom: 12, borderRadius: 12 },
    itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBackground: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F9F1EE', alignItems: 'center', justifyContent: 'center' },
    itemText: { color: '#333333', fontSize: 15, fontWeight: '600' },
    footer: { marginTop: 'auto', paddingTop: 10, paddingBottom: 30, backgroundColor: '#FFFFFF' },
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F9F1EE', borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(167, 92, 67, 0.15)' },
    logoutText: { color: '#a75c43', fontSize: 15, fontWeight: '700' },
    versionText: { textAlign: 'center', color: '#BBBBBB', fontSize: 11, marginTop: 10 }
});