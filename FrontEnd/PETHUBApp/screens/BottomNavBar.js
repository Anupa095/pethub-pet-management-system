import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

const NAV_COLORS = {
    Breeding: '#edf4f1',
    'AI-chat': '#edf4f1',
    Nearby: '#edf4f1',
    Vaccine: '#edf4f1',
    'Meal Plan': '#edf4f1',
};

const NAV_TEXT_COLORS = {
    active: '#FF8A00',
    inactive: '#F2ECE5',
};

const SCREEN_TO_NAV_LABEL = {
    PetDetails: 'Breeding',
    AIChat: 'AI-chat',
    MealPlane: 'Meal Plan',
    Vaccine: 'Vaccine',
    Nearby: 'Nearby',
};

// 🌟 Icon එක ලස්සනට බවුන්ස් වෙන්න හදපු ඇනිමේටඩ් කම්පෝනන්ට් එක
const AnimatedTabItem = ({ label, icon, active, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (active) {
            Animated.spring(scaleAnim, {
                toValue: 1.2,
                friction: 4,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }).start();
        }
    }, [active]);

    return (
        <TouchableOpacity
            style={styles.bottomNavItem}
            activeOpacity={0.9}
            onPress={onPress}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons
                    name={icon}
                    size={26}
                    color={active ? NAV_TEXT_COLORS.active : NAV_COLORS[label]}
                />
            </Animated.View>

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
};

export default function BottomNavBar() {
    const navigation = useNavigation();
    const route = useRoute();

    const activeLabel = SCREEN_TO_NAV_LABEL[route?.name] || 'Breeding';

    // 🔑 දැනට open වෙලා තියෙන screen එකේ params එකේ pet එකක් තිබ්බොත්,
    // ඒ pet එකම තමයි "current pet" කියලා ගන්නේ. Tab මාරු කරද්දී මේක ඕන
    // තැනට ම forward කරනවා, එතකොට pet එක වෙනස් වෙන්නේ නෑ.
    const currentPet = route?.params?.pet ?? null;

    const handlePress = (tab) => {
        // Params object එක හැම තැනකටම එකම විදිහට pass කරනවා.
        // pet එකක් තියෙනවා නම් විතරක් ඇතුළත් කරනවා (නැත්නම් params නෑ).
        const params = currentPet ? { pet: currentPet } : undefined;

        if (tab === 'Breeding') return navigation.push('PetDetails', params);
        if (tab === 'AI-chat') return navigation.push('AIChat', params);
        if (tab === 'Vaccine') return navigation.push('Vaccine', params);
        if (tab === 'Meal Plan') return navigation.push('MealPlane', params);
        if (tab === 'Nearby') return navigation.push('Nearby', params);
    };

    return (
        <View style={styles.bottomNavBar}>
            <AnimatedTabItem label="Breeding" icon="heart-outline" active={activeLabel === 'Breeding'} onPress={() => handlePress('Breeding')} />
            <AnimatedTabItem label="AI-chat" icon="chatbubble-ellipses-outline" active={activeLabel === 'AI-chat'} onPress={() => handlePress('AI-chat')} />
            <AnimatedTabItem label="Meal Plan" icon="restaurant-outline" active={activeLabel === 'Meal Plan'} onPress={() => handlePress('Meal Plan')} />
            <AnimatedTabItem label="Vaccine" icon="medkit-outline" active={activeLabel === 'Vaccine'} onPress={() => handlePress('Vaccine')} />
            <AnimatedTabItem label="Nearby" icon="location-outline" active={activeLabel === 'Nearby'} onPress={() => handlePress('Nearby')} />
        </View>
    );
}

const styles = StyleSheet.create({
    bottomNavBar: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
        height: 72,
        borderRadius: 24,
        backgroundColor: '#2A2A2A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
    },
    bottomNavItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    bottomNavLabel: {
        marginTop: 5,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    bottomNavLabelActive: {
        fontWeight: '800',
    },
});