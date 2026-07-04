import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

// route.name eken navbar label ekata map karana object eka
// oyage navigator eke thiyena real screen names dala meka update karanna
const SCREEN_TO_NAV_LABEL = {
    PetDetails: 'Breeding',
    AIChat: 'AI-chat',
    MealPlane: 'Meal Plan',
    Vaccine: 'Vaccine',
    Nearby: 'Nearby',
};

export default function BottomNavBar() {
    const navigation = useNavigation();
    const route = useRoute();

    const activeLabel = SCREEN_TO_NAV_LABEL[route?.name] || 'Breeding';

    const handlePress = (tab) => {
        if (tab === 'Breeding') {
            navigation.navigate('PetDetails');
            return;
        }
        if (tab === 'AI-chat') {
            navigation.navigate('AIChat');
            return;
        }
        if (tab === 'Vaccine') {
            navigation.navigate('Vaccine');
            return;
        }
        if (tab === 'Meal Plan') {
            navigation.navigate('MealPlane');
            return;
        }
        if (tab === 'Nearby') {
            navigation.navigate('Nearby');
            return;
        }
    };

    const renderItem = (label, icon) => {
        const active = activeLabel === label;
        return (
            <TouchableOpacity
                key={label}
                style={styles.bottomNavItem}
                activeOpacity={0.8}
                onPress={() => handlePress(label)}
            >
                <Ionicons
                    name={icon}
                    size={27}
                    color={active ? NAV_TEXT_COLORS.active : NAV_COLORS[label]}
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
    };

    return (
        <View style={styles.bottomNavBar}>
            {renderItem('Breeding', 'heart-outline')}
            {renderItem('AI-chat', 'chatbubble-ellipses-outline')}
            {renderItem('Meal Plan', 'restaurant-outline')}
            {renderItem('Vaccine', 'medkit-outline')}
            {renderItem('Nearby', 'location-outline')}
        </View>
    );
}

const styles = StyleSheet.create({
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
        fontSize: 12,
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