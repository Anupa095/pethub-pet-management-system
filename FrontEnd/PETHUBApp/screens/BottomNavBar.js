import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

// 🎨 Theme Colors (Deep Cream Theme Edition)
const NAV_COLORS = {
    barBg: '#EAE5DB',            // UPDATE: සුදු පාට වෙනුවට දාපු ලස්සන තද ක්‍රීම් (Deep Cream) පසුබිම
    activeIcon: '#a75c43',       // Active වුනාම ලැබෙන තද බ්‍රවුන් (Terracotta) පාට
    inactiveIcon: '#8C857B',     // Inactive Icon වලට තද ක්‍රීම් එකට ගැලපෙන Darker Muted Gray-Gold
    activeText: '#a75c43',       // Active Text Color
    inactiveText: '#736B62',     // Inactive Text Color
    border: '#DFD9CE',           // බාර් එක වටේට යන සියුම් Border එක
};

const SCREEN_TO_NAV_LABEL = {
    PetDetails: 'Breeding',
    AIChat: 'AI-chat',
    MealPlane: 'Meal Plan',
    Vaccine: 'Vaccine',
    Nearby: 'Nearby',
};

// 🌟 Icon Bounce Animation Component
const AnimatedTabItem = ({ label, icon, active, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (active) {
            Animated.spring(scaleAnim, {
                toValue: 1.15,
                friction: 5,
                tension: 50,
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
            activeOpacity={0.8}
            onPress={onPress}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons
                    name={icon}
                    size={24}
                    color={active ? NAV_COLORS.activeIcon : NAV_COLORS.inactiveIcon}
                />
            </Animated.View>

            <Text
                style={[
                    styles.bottomNavLabel,
                    { color: active ? NAV_COLORS.activeText : NAV_COLORS.inactiveText },
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
    const currentPet = route?.params?.pet ?? null;

    const handlePress = (tab) => {
        const params = currentPet ? { pet: currentPet } : undefined;

        if (tab === 'Breeding') return navigation.push('PetDetails', params);
        if (tab === 'AI-chat') return navigation.push('AIChat', params);
        if (tab === 'Vaccine') return navigation.push('Vaccine', params);
        if (tab === 'Meal Plan') return navigation.push('MealPlane', params);
        if (tab === 'Nearby') return navigation.push('Nearby', params);
    };

    return (
        <View style={styles.bottomNavBar}>
            <AnimatedTabItem label="Breeding" icon={activeLabel === 'Breeding' ? 'heart' : 'heart-outline'} active={activeLabel === 'Breeding'} onPress={() => handlePress('Breeding')} />
            <AnimatedTabItem label="AI-chat" icon={activeLabel === 'AI-chat' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} active={activeLabel === 'AI-chat'} onPress={() => handlePress('AI-chat')} />
            <AnimatedTabItem label="Meal Plan" icon={activeLabel === 'Meal Plan' ? 'restaurant' : 'restaurant-outline'} active={activeLabel === 'Meal Plan'} onPress={() => handlePress('Meal Plan')} />
            <AnimatedTabItem label="Vaccine" icon={activeLabel === 'Vaccine' ? 'medkit' : 'medkit-outline'} active={activeLabel === 'Vaccine'} onPress={() => handlePress('Vaccine')} />
            <AnimatedTabItem label="Nearby" icon={activeLabel === 'Nearby' ? 'location' : 'location-outline'} active={activeLabel === 'Nearby'} onPress={() => handlePress('Nearby')} />
        </View>
    );
}

const styles = StyleSheet.create({
    bottomNavBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
        height: 70,
        borderRadius: 22,
        backgroundColor: NAV_COLORS.barBg, // UPDATE: Deep Cream Color background
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: NAV_COLORS.border,
        
        // Soft Shadow
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    bottomNavItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    bottomNavLabel: {
        marginTop: 4,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    bottomNavLabelActive: {
        fontWeight: '700',
    },
});