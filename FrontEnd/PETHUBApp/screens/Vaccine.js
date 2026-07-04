import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomNavBar from './BottomNavBar';

export default function Vaccine() {
	return (
		<View style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.title}>Vaccine</Text>
				<Text style={styles.subtitle}>Track vaccinations and reminders.</Text>
			</View>
			<BottomNavBar />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f6f1e8',
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	title: {
		fontSize: 30,
		fontWeight: '800',
		color: '#1f2937',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: '#6b7280',
		textAlign: 'center',
	},
});
