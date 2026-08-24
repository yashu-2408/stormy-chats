import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, API_URL, SOCKET_URL } from './AuthContext';

export function ChatScreen({ route, navigation }) {
  const { chatId, name } = route.params;
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggledOriginals, setToggledOriginals] = useState({});
  const [isOffline, setIsOffline] = useState(false);
  const socketRef = useRef(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: name || 'Chat' });
    fetchMessages();
    setupSocket();
    checkOfflineQueue();

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_chat', chatId);
        socketRef.current.disconnect();
      }
    };
  }, [chatId]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/chats/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data);
        setIsOffline(false);
      }
    } catch (e) {
      console.log('Failed to fetch messages, working offline:', e);
      setIsOffline(true);
      // Load cached messages from AsyncStorage
      const cached = await AsyncStorage.getItem(`chat_msgs_${chatId}`);
      if (cached) {
        setMessages(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_chat', chatId);
      // Flush offline queue on reconnect
      checkOfflineQueue();
    });

    socketRef.current.on('new_message', (msg) => {
      if (msg.chat_id === Number(chatId)) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some(m => m.id === msg.id || (msg.client_msg_id && m.client_msg_id === msg.client_msg_id))) {
            return prev.map(m => m.client_msg_id === msg.client_msg_id ? msg : m);
          }
          return [...prev, msg];
        });
      }
    });
  };

  // Cache messages locally
  useEffect(() => {
    if (messages.length > 0) {
      AsyncStorage.setItem(`chat_msgs_${chatId}`, JSON.stringify(messages));
    }
  }, [messages, chatId]);

  const checkOfflineQueue = async () => {
    try {
      const queueRaw = await AsyncStorage.getItem(`offline_queue_${chatId}`);
      if (!queueRaw) return;
      const queue = JSON.parse(queueRaw);
      if (queue.length === 0) return;

      const remainingQueue = [];

      for (const msgData of queue) {
        try {
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('send_message', msgData);
          } else {
            remainingQueue.push(msgData);
          }
        } catch (e) {
          remainingQueue.push(msgData);
        }
      }

      await AsyncStorage.setItem(`offline_queue_${chatId}`, JSON.stringify(remainingQueue));
    } catch (e) {
      console.log('Error processing offline queue:', e);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    const clientMsgId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const localMsg = {
      id: clientMsgId,
      chat_id: Number(chatId),
      sender_id: user.id,
      sender_name: user.username,
      sender_avatar: user.avatar,
      text: textToSend,
      translated_text: textToSend,
      detected_language: user.preferred_language || 'en',
      client_msg_id: clientMsgId,
      created_at: new Date().toISOString(),
      pending: true
    };

    setMessages(prev => [...prev, localMsg]);

    const msgPayload = {
      chatId,
      senderId: user.id,
      text: textToSend,
      clientMsgId
    };

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('send_message', msgPayload, (response) => {
        if (response && response.error) {
          console.log('Error sending via socket:', response.error);
        }
      });
    } else {
      // Queue offline
      const queueRaw = await AsyncStorage.getItem(`offline_queue_${chatId}`);
      const queue = queueRaw ? JSON.parse(queueRaw) : [];
      queue.push(msgPayload);
      await AsyncStorage.setItem(`offline_queue_${chatId}`, JSON.stringify(queue));
    }
  };

  const toggleOriginal = (msgId) => {
    setToggledOriginals(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const renderMessageItem = ({ item }) => {
    const isMe = item.sender_id === user.id;
    const showOriginal = toggledOriginals[item.id];
    const hasTranslation = item.translated_text && item.translated_text !== item.text;

    return (
      <View style={[styles.msgContainer, isMe ? styles.myMsgContainer : styles.otherMsgContainer]}>
        {!isMe && (
          <Image source={{ uri: item.sender_avatar }} style={styles.msgAvatar} />
        )}
        <View style={[styles.msgBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          {!isMe && <Text style={styles.senderName}>{item.sender_name}</Text>}

          {/* Message Content */}
          <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.otherMsgText]}>
            {showOriginal || !hasTranslation ? item.text : item.translated_text}
          </Text>

          {/* Translation Controls & Indicators */}
          <View style={styles.metaRow}>
            {hasTranslation && (
              <TouchableOpacity onPress={() => toggleOriginal(item.id)} style={styles.toggleBtn}>
                <Text style={styles.toggleBtnText}>
                  {showOriginal ? `Show Trans (${item.target_language || 'Translated'})` : 'Show Orig'}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={styles.langBadge}>
              {item.detected_language ? item.detected_language.toUpperCase() : ''}
            </Text>

            <Text style={styles.timeText}>
              {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              {item.pending ? ' 🕒' : ''}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066fe" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {isOffline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>Offline Mode - Messages will sync when reconnected</Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => (item.id || item.client_msg_id).toString()}
          renderItem={renderMessageItem}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineBanner: { backgroundColor: '#fef3c7', padding: 8, alignItems: 'center' },
  offlineText: { color: '#92400e', fontSize: 13, fontWeight: '500' },
  listContent: { padding: 16 },
  msgContainer: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  myMsgContainer: { justifyContent: 'flex-end' },
  otherMsgContainer: { justifyContent: 'flex-start' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, backgroundColor: '#cbd5e1' },
  msgBubble: { maxWidth: '75%', borderRadius: 16, padding: 12 },
  myBubble: { backgroundColor: '#0066fe', borderBottomRightRadius: 2 },
  otherBubble: { backgroundColor: '#ffffff', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  senderName: { fontSize: 12, fontWeight: 'bold', color: '#64748b', marginBottom: 4 },
  msgText: { fontSize: 15, lineHeight: 20 },
  myMsgText: { color: '#ffffff' },
  otherMsgText: { color: '#1e293b' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 6, gap: 6 },
  toggleBtn: { backgroundColor: 'rgba(0,0,0,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  toggleBtnText: { fontSize: 10, fontWeight: '600', color: '#475569' },
  langBadge: { fontSize: 10, fontWeight: 'bold', opacity: 0.6, color: '#64748b' },
  timeText: { fontSize: 10, opacity: 0.6, color: '#64748b' },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#ffffff', borderTopWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { marginLeft: 8, backgroundColor: '#0066fe', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20 },
  sendBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});
