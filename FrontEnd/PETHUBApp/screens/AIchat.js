import React, { useEffect, useRef, useState } from 'react';
import {
	Alert,
	ActivityIndicator,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import BottomNavBar from './BottomNavBar';
import { sendChatMessage } from '../services/chatApi';

const emptyIntroMessage = {
	id: 'intro',
	role: 'assistant',
	content: 'Ask a pet care question. Answers come from the Python AI backend only.',
	createdAt: null,
};

export default function AIchat() {
	const scrollRef = useRef(null);
	const typingTimerRef = useRef(null);

	const [messages, setMessages] = useState([emptyIntroMessage]);
	const [draftMessage, setDraftMessage] = useState('');
	const [isSending, setIsSending] = useState(false);
	const [isTyping, setIsTyping] = useState(false);
	const [historyVisible, setHistoryVisible] = useState(false);
	const [lastModel, setLastModel] = useState('');

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollToEnd({ animated: true });
		}
	}, [messages]);

	useEffect(() => {
		return () => {
			if (typingTimerRef.current) {
				clearInterval(typingTimerRef.current);
			}
		};
	}, []);

	const startNewChat = () => {
		if (typingTimerRef.current) {
			clearInterval(typingTimerRef.current);
		}
		setIsTyping(false);
		setMessages([emptyIntroMessage]);
		setDraftMessage('');
		setLastModel('');
	};

	const openHistory = () => {
		setHistoryVisible(true);
	};

	const handleSend = async () => {
		const trimmedMessage = draftMessage.trim();
		if (!trimmedMessage || isSending || isTyping) {
			return;
		}

		if (typingTimerRef.current) {
			clearInterval(typingTimerRef.current);
		}

		const pendingUserMessage = {
			id: `pending-${Date.now()}`,
			role: 'user',
			content: trimmedMessage,
		};

		const historyPayload = messages
			.filter((message) => message.role === 'user' || message.role === 'assistant')
			.map((message) => ({
				role: message.role,
				content: message.content,
				reasoning_details: message.reasoning_details,
			}));

		setMessages((currentMessages) => [...currentMessages.filter((message) => message.id !== 'intro'), pendingUserMessage]);
		setDraftMessage('');
		setIsSending(true);
		setIsTyping(true);

		const showTypingResponse = (fullText) => new Promise((resolve) => {
			const typingMessageId = `typing-${Date.now()}`;
			let currentIndex = 0;

			setMessages((currentMessages) => [
				...currentMessages,
				{
					id: typingMessageId,
					role: 'assistant',
					content: '',
				},
			]);

			typingTimerRef.current = setInterval(() => {
				currentIndex += 2;
				const visibleText = fullText.slice(0, currentIndex);

				setMessages((currentMessages) =>
					currentMessages.map((message) =>
						message.id === typingMessageId
							? { ...message, content: visibleText }
							: message
					)
				);

				if (currentIndex >= fullText.length) {
					clearInterval(typingTimerRef.current);
					typingTimerRef.current = null;
					setIsTyping(false);
					resolve();
				}
			}, 18);
		});

		try {
			const response = await sendChatMessage({
				message: trimmedMessage,
				history: [...historyPayload, { role: 'user', content: trimmedMessage }],
			});

			const assistantText = response?.answer || response?.aiResponse || 'No response returned.';
			setLastModel(response?.model || '');
			await showTypingResponse(assistantText);
			setMessages((currentMessages) =>
				currentMessages.map((message) =>
					message.content === assistantText || message.id?.toString().startsWith('typing-')
						? { ...message, reasoning_details: response?.reasoning_details }
						: message
				)
			);
		} catch (error) {
			setIsTyping(false);
			if (typingTimerRef.current) {
				clearInterval(typingTimerRef.current);
				typingTimerRef.current = null;
			}
			setMessages((currentMessages) => [
				...currentMessages,
				{
					id: `error-${Date.now()}`,
					role: 'assistant',
					content: error.message || 'Failed to get a response.',
				},
			]);
			Alert.alert('Send failed', error.message);
		} finally {
			setIsSending(false);
			setIsTyping(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.topCard}>
				<View style={styles.topRow}>
					<View>
						<View style={styles.badge}>
							<Ionicons name="sparkles-outline" size={14} color="#7C4A13" />
							<Text style={styles.badgeText}>PETHUB Agentic AI</Text>
						</View>
						<Text style={styles.title}>AI Chat</Text>
						<Text style={styles.subtitle}>Answers come only from the Python backend.</Text>
					</View>

					<View style={styles.actionRow}>
						<TouchableOpacity style={styles.iconButton} onPress={startNewChat}>
							<Ionicons name="add-circle-outline" size={22} color="#8B5E3C" />
						</TouchableOpacity>
						<TouchableOpacity style={styles.iconButton} onPress={openHistory}>
							<Ionicons name="time-outline" size={22} color="#8B5E3C" />
						</TouchableOpacity>
					</View>
				</View>

				<View style={styles.statusRow}>
					<View style={styles.statusPill}>
						<View style={styles.statusDot} />
						<Text style={styles.statusText}>Python backend connected</Text>
					</View>
					{lastModel ? (
						<View style={styles.statusPillMuted}>
							<Ionicons name="chatbubble-ellipses-outline" size={14} color="#8B5E3C" />
							<Text style={styles.statusTextMuted}>{lastModel}</Text>
						</View>
					) : null}
				</View>
			</View>

			<View style={styles.chatCard}>
				<View style={styles.chatHeaderRow}>
					<Text style={styles.sectionTitle}>Conversation</Text>
					<Text style={styles.sectionHint}>{isTyping ? 'Typing response...' : `${messages.length} message${messages.length === 1 ? '' : 's'}`}</Text>
				</View>

				{(isSending || isTyping) && (
					<View style={styles.workingBanner}>
						<ActivityIndicator size="small" color="#8B5E3C" />
						<View style={styles.workingTextWrap}>
							<Text style={styles.workingTitle}>AI is working</Text>
							<Text style={styles.workingSubtitle}>
								{isTyping ? 'Formatting the reply...' : 'Sending your question to Python backend...'}
							</Text>
						</View>
					</View>
				)}

				<ScrollView ref={scrollRef} style={styles.messageList} contentContainerStyle={styles.messageListContent}>
					{messages.map((message) => {
						const isUser = message.role === 'user';
						return (
							<View key={String(message.id)} style={[styles.bubbleRow, isUser ? styles.userBubbleRow : styles.assistantBubbleRow]}>
								<View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
									<Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.assistantBubbleText]}>{message.content}</Text>
								</View>
							</View>
						);
					})}
				</ScrollView>

				<View style={styles.composerCard}>
					<TextInput
						style={styles.composerInput}
						placeholder="Ask your pet question here..."
						placeholderTextColor="#8B7C72"
						value={draftMessage}
						onChangeText={setDraftMessage}
						multiline
						editable={!isSending}
					/>
					<TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={isSending}>
						<Ionicons name={isSending ? 'hourglass-outline' : 'send'} size={18} color="#FFFFFF" />
						<Text style={styles.sendButtonText}>{isSending ? 'Sending' : 'Send'}</Text>
					</TouchableOpacity>
				</View>
			</View>

			<Modal visible={historyVisible} transparent animationType="slide" onRequestClose={() => setHistoryVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<View style={styles.modalHeader}>
							<View>
								<Text style={styles.modalTitle}>Current History</Text>
								<Text style={styles.modalSubtitle}>Messages from this chat session only</Text>
							</View>
							<TouchableOpacity style={styles.iconButton} onPress={() => setHistoryVisible(false)}>
								<Ionicons name="close" size={22} color="#8B5E3C" />
							</TouchableOpacity>
						</View>

						<ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyScrollContent} showsVerticalScrollIndicator={false}>
							{messages.length <= 1 ? (
								<View style={styles.modalEmptyState}>
									<Ionicons name="time-outline" size={28} color="#B08968" />
									<Text style={styles.modalEmptyText}>No conversation yet.</Text>
								</View>
							) : (
								messages
									.filter((message) => message.id !== 'intro')
									.map((message) => (
										<View key={`history-${message.id}`} style={styles.historyItem}>
											<Text style={styles.historyRole}>{message.role === 'user' ? 'You' : 'AI'}</Text>
											<Text style={styles.historyText}>{message.content}</Text>
											{message.reasoning_details ? (
												<Text style={styles.historyReasoning}>Reasoning kept for next turn</Text>
											) : null}
										</View>
									))
							)}
						</ScrollView>

						<TouchableOpacity style={styles.newChatButton} onPress={startNewChat}>
							<Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
							<Text style={styles.newChatButtonText}>Clear chat</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			<BottomNavBar />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F6F1E8',
	},
	topCard: {
		marginHorizontal: 16,
		marginTop: 16,
		padding: 18,
		borderRadius: 28,
		backgroundColor: '#FFF8EF',
		borderWidth: 1,
		borderColor: '#E8D7C1',
	},
	topRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: 12,
	},
	actionRow: {
		flexDirection: 'row',
		gap: 10,
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: 999,
		backgroundColor: '#F8E2C7',
		alignSelf: 'flex-start',
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '800',
		color: '#7C4A13',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
	},
	title: {
		fontSize: 30,
		lineHeight: 36,
		fontWeight: '900',
		color: '#1F2937',
		marginTop: 10,
	},
	subtitle: {
		fontSize: 13,
		lineHeight: 19,
		color: '#6B5A4E',
		marginTop: 4,
	},
	iconButton: {
		width: 40,
		height: 40,
		borderRadius: 14,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E8D7C1',
		alignItems: 'center',
		justifyContent: 'center',
	},
	statusRow: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 16,
		flexWrap: 'wrap',
	},
	statusPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: 999,
		backgroundColor: '#EBF3EA',
	},
	statusPillMuted: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 7,
		borderRadius: 999,
		backgroundColor: '#FFF',
		borderWidth: 1,
		borderColor: '#E8D7C1',
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 999,
		backgroundColor: '#2F855A',
	},
	statusText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#24513D',
	},
	statusTextMuted: {
		fontSize: 11,
		fontWeight: '700',
		color: '#7B6B61',
	},
	chatCard: {
		flex: 1,
		marginHorizontal: 16,
		marginTop: 12,
		marginBottom: 98,
		padding: 16,
		borderRadius: 28,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E8DCCB',
	},
	chatHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '900',
		color: '#222222',
	},
	sectionHint: {
		fontSize: 12,
		color: '#7A6A60',
		fontWeight: '600',
	},
	messageList: {
		flex: 1,
	},
	messageListContent: {
		paddingVertical: 10,
		gap: 10,
	},
	historyScroll: {
		maxHeight: 280,
	},
	historyScrollContent: {
		gap: 10,
		paddingBottom: 8,
	},
	workingBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 18,
		backgroundColor: '#FFF7EE',
		borderWidth: 1,
		borderColor: '#ECDCC7',
		marginBottom: 10,
	},
	workingTextWrap: {
		flex: 1,
	},
	workingTitle: {
		fontSize: 13,
		fontWeight: '800',
		color: '#1F2937',
	},
	workingSubtitle: {
		fontSize: 12,
		lineHeight: 17,
		color: '#7A6A60',
		marginTop: 2,
	},
	bubbleRow: {
		flexDirection: 'row',
	},
	userBubbleRow: {
		justifyContent: 'flex-end',
	},
	assistantBubbleRow: {
		justifyContent: 'flex-start',
	},
	bubble: {
		maxWidth: '88%',
		paddingHorizontal: 14,
		paddingVertical: 12,
		borderRadius: 20,
	},
	userBubble: {
		backgroundColor: '#2F855A',
		borderBottomRightRadius: 6,
	},
	assistantBubble: {
		backgroundColor: '#FAF5EF',
		borderBottomLeftRadius: 6,
		borderWidth: 1,
		borderColor: '#ECE0D0',
	},
	bubbleText: {
		fontSize: 14,
		lineHeight: 21,
	},
	historyItem: {
		padding: 12,
		borderRadius: 16,
		backgroundColor: '#FAF5EF',
		borderWidth: 1,
		borderColor: '#ECE0D0',
	},
	historyRole: {
		fontSize: 11,
		fontWeight: '800',
		color: '#8B5E3C',
		textTransform: 'uppercase',
		letterSpacing: 0.6,
		marginBottom: 4,
	},
	historyText: {
		fontSize: 13,
		lineHeight: 20,
		color: '#2D2A28',
	},
	userBubbleText: {
		color: '#FFFFFF',
	},
	assistantBubbleText: {
		color: '#2D2A28',
	},
	composerCard: {
		marginTop: 10,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#E8D7C1',
		gap: 10,
	},
	composerInput: {
		minHeight: 92,
		maxHeight: 130,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#E8D7C1',
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 14,
		color: '#1F2937',
		textAlignVertical: 'top',
		backgroundColor: '#FFF',
	},
	sendButton: {
		alignSelf: 'flex-end',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 16,
		backgroundColor: '#8B5E3C',
	},
	sendButtonText: {
		fontSize: 14,
		fontWeight: '800',
		color: '#FFFFFF',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(30, 24, 20, 0.42)',
		justifyContent: 'flex-end',
	},
	modalCard: {
		maxHeight: '82%',
		backgroundColor: '#FFF8EF',
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
		padding: 18,
		borderTopWidth: 1,
		borderColor: '#E8D7C1',
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 14,
	},
	modalTitle: {
		fontSize: 22,
		fontWeight: '900',
		color: '#1F2937',
	},
	modalSubtitle: {
		fontSize: 12,
		color: '#7A6A60',
		marginTop: 4,
	},
	modalLoading: {
		paddingVertical: 20,
		textAlign: 'center',
		color: '#6B5A4E',
	},
	modalEmptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
		gap: 8,
	},
	modalEmptyText: {
		color: '#6B5A4E',
		fontSize: 14,
	},
	newChatButton: {
		marginTop: 6,
		alignSelf: 'stretch',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 14,
		borderRadius: 18,
		backgroundColor: '#2F855A',
	},
	newChatButtonText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '800',
	},
});
