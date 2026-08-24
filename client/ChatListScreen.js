import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, RefreshControl, Image, Modal, TextInput, Alert } from 'react-native';
import { useAuth, API_URL } from './AuthContext';

export function ChatListScreen({ navigation }) {
  const { user, token } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [isGroup, setIsGroup] = useState(false);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setChats(data);
    } catch (e) {
      console.log('Error fetching chats:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchChats();
    const unsubscribe = navigation.addListener('focus', fetchChats);
    return unsubscribe;
  }, [navigation, fetchChats]);

  const openNewChatModal = async () => {
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
        setSelectedUsers([]);
        setGroupName('');
        setIsGroup(false);
        setModalVisible(true);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch users');
    }
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one user');
      return;
    }
    if (isGroup && !groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          participant_ids: selectedUsers,
          name: isGroup ? groupName.trim() : '',
          is_group: isGroup
        })
      });
      const data = await res.json();
      if (res.ok) {
        setModalVisible(false);
        fetchChats();
        navigation.navigate('Chat', { chatId: data.chat_id, name: data.name || 'Chat' });
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const toggleSelectUser = (id) => {
    if (isGroup) {
      if (selectedUsers.includes(id)) {
        setSelectedUsers(selectedUsers.filter(u => u !== id));
      } else {
        setSelectedUsers([...selectedUsers, id]);
      }
    } else {
      setSelectedUsers([id]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.topBarBtns}>
          <TouchableOpacity style={styles.newBtn} onPress={openNewChatModal}>
            <Text style={styles.newBtnText}>+ New Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchChats} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.chatCard}
            onPress={() => navigation.navigate('Chat', { chatId: item.id, name: item.display_name })}
          >
            {item.display_avatar ? (
              <Image source={{ uri: item.display_avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.groupAvatar]}>
                <Text style={styles.groupAvatarText}>{item.is_group ? '👥' : '👤'}</Text>
              </View>
            )}

            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName}>{item.display_name}</Text>
                {item.last_message_at && (
                  <Text style={styles.timeText}>
                    {new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
              <Text style={styles.lastMsg} numberOfLines={1}>
                {item.last_message || 'No messages yet'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No chats yet. Tap '+ New Chat' to start!</Text>
          </View>
        )}
      />

      {/* New Chat Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Conversation</Text>

            <TouchableOpacity
              style={styles.toggleGroupBtn}
              onPress={() => { setIsGroup(!isGroup); setSelectedUsers([]); }}
            >
              <Text style={styles.toggleGroupText}>
                {isGroup ? 'Switch to 1-on-1 Chat' : 'Switch to Group Chat'}
              </Text>
            </TouchableOpacity>

            {isGroup && (
              <TextInput
                style={styles.input}
                placeholder="Group Name"
                value={groupName}
                onChangeText={setGroupName}
              />
            )}

            <Text style={styles.selectLabel}>Select Participant(s):</Text>
            <FlatList
              data={users}
              keyExtractor={(item) => item.id.toString()}
              style={{ maxHeight: 200 }}
              renderItem={({ item }) => {
                const isSelected = selectedUsers.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.userItem, isSelected && styles.userItemSelected]}
                    onPress={() => toggleSelectUser(item.id)}
                  >
                    <Text style={styles.userName}>{item.username} ({item.preferred_language})</Text>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreateChat}>
                <Text style={styles.createText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e1e5ee' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1d2e' },
  topBarBtns: { flexDirection: 'row', alignItems: 'center' },
  newBtn: { backgroundColor: '#0066fe', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  newBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  settingsBtn: { padding: 6 },
  settingsBtnText: { fontSize: 22 },
  chatCard: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f0f2f5', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e1e5ee' },
  groupAvatar: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#e2e8f0' },
  groupAvatarText: { fontSize: 22 },
  chatContent: { flex: 1, marginLeft: 12 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '600', color: '#1a1d2e' },
  timeText: { fontSize: 12, color: '#94a3b8' },
  lastMsg: { fontSize: 14, color: '#64748b' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  toggleGroupBtn: { backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  toggleGroupText: { color: '#0066fe', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', padding: 10, borderRadius: 8, marginBottom: 12 },
  selectLabel: { fontWeight: '600', marginBottom: 8 },
  userItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 6 },
  userItemSelected: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  userName: { fontSize: 15 },
  checkMark: { color: '#3b82f6', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  cancelBtn: { padding: 12, marginRight: 8 },
  cancelText: { color: '#64748b', fontWeight: '600' },
  createBtn: { backgroundColor: '#0066fe', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  createText: { color: '#fff', fontWeight: 'bold' },
});
