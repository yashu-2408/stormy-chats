import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { useAuth, API_URL } from './AuthContext';

export function SettingsScreen({ navigation }) {
  const { user, token, updateUser, logout } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [preferredLang, setPreferredLang] = useState(user?.preferred_language || 'en');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [languages, setLanguages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      const res = await fetch(`${API_URL}/languages`);
      const data = await res.json();
      setLanguages(data);
    } catch (e) {
      console.log('Error fetching languages:', e);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await updateUser({
        username: username.trim(),
        preferred_language: preferredLang,
        avatar: avatar
      });
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredLangs = languages.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll}>
        <View style={styles.header}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Info</Text>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferred Language (Auto-Translate)</Text>
          <Text style={styles.subtext}>
            Incoming messages will automatically translate into this language.
          </Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search language..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.langList}>
            {filteredLangs.slice(0, 15).map(item => (
              <TouchableOpacity
                key={item.code}
                style={[
                  styles.langItem,
                  preferredLang === item.code && styles.langItemActive
                ]}
                onPress={() => setPreferredLang(item.code)}
              >
                <Text style={[
                  styles.langText,
                  preferredLang === item.code && styles.langTextActive
                ]}>
                  {item.name} ({item.code})
                </Text>
                {preferredLang === item.code && (
                  <Text style={styles.checkMark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  scroll: { padding: 16 },
  header: { alignItems: 'center', marginVertical: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e1e5ee' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#0066fe' },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  emailText: { marginTop: 8, fontSize: 16, color: '#6e738d' },
  section: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: '#1a1d2e' },
  subtext: { fontSize: 14, color: '#6e738d', marginBottom: 12 },
  label: { fontSize: 14, color: '#6e738d', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e1e5ee', borderRadius: 8, padding: 12, fontSize: 16 },
  searchInput: { borderWidth: 1, borderColor: '#e1e5ee', borderRadius: 8, padding: 10, marginBottom: 12 },
  langList: { maxHeight: 200 },
  langItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  langItemActive: { backgroundColor: '#eaf2ff' },
  langText: { fontSize: 15, color: '#1a1d2e' },
  langTextActive: { color: '#0066fe', fontWeight: 'bold' },
  checkMark: { color: '#0066fe', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#0066fe', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#fee2e2', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 30 },
  logoutBtnText: { color: '#dc2626', fontSize: 16, fontWeight: 'bold' },
});
