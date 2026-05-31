import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, Image } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../service/api';
import { Ionicons } from '@expo/vector-icons';

export default function VendorMenuScreen({ navigation }) {
  const [menus, setMenus] = useState([]);
  const [activeTab, setActiveTab] = useState('semua');
  const [loading, setLoading] = useState(true);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const resToko = await api.get('/toko/vendor/mytoko');
      const idToko = resToko.data._id;
      const resMenu = await api.get(`/menu/toko/${idToko}`);
      setMenus(resMenu.data);
    } catch (error) {
      console.log("❌ ERROR FETCH MENU:", error.response?.data || error.message);
      Alert.alert('Gagal', 'Tidak dapat memuat daftar menu. Cek log terminal.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMenu();
    }, [])
  );

  const toggleTersedia = async (id, statusSaatIni) => {
    setMenus(prev => prev.map(m => m._id === id ? { ...m, tersedia: !statusSaatIni } : m));
    try {
      await api.put(`/menu/${id}`, { tersedia: !statusSaatIni });
    } catch (error) {
      Alert.alert('Gagal', 'Koneksi terputus, gagal mengubah status.');
      setMenus(prev => prev.map(m => m._id === id ? { ...m, tersedia: statusSaatIni } : m));
    }
  };

  const handleHapus = (id, nama) => {
    Alert.alert('Hapus Menu?', `"${nama}" akan dihapus permanen dari tokomu.`, [
      { text: 'Batal', style: 'cancel' },
      { 
        text: 'Hapus', 
        style: 'destructive', 
        onPress: async () => {
          try {
            setLoading(true);
            await api.delete(`/menu/${id}`);
            setMenus(prev => prev.filter(m => m._id !== id));
            Alert.alert('Terhapus', 'Menu berhasil dihapus.');
          } catch (error) {
            Alert.alert('Gagal', 'Tidak dapat menghapus menu dari server.');
          } finally {
            setLoading(false);
          }
        } 
      },
    ]);
  };

  const filtered = activeTab === 'semua' ? menus : activeTab === 'tersedia' ? menus.filter(m => m.tersedia) : menus.filter(m => !m.tersedia);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Kelola Menu</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('VendorAddMenu')} activeOpacity={0.8}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {/* ── Top Tab Bar ── */}
      <View style={styles.topTabBar}>
        <TouchableOpacity 
          style={[styles.topTabButton, activeTab === 'semua' && styles.topTabActive]} 
          onPress={() => setActiveTab('semua')}
          activeOpacity={0.8}
        >
          <View style={styles.tabContentRow}>
            <Text style={[styles.topTabText, activeTab === 'semua' && styles.topTabTextActive]}>Semua</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.topTabButton, activeTab === 'tersedia' && styles.topTabActive]} 
          onPress={() => setActiveTab('tersedia')}
          activeOpacity={0.8}
        >
          <View style={styles.tabContentRow}>
            <Text style={[styles.topTabText, activeTab === 'tersedia' && styles.topTabTextActive]}>Tersedia</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.topTabButton, activeTab === 'habis' && styles.topTabActive]} 
          onPress={() => setActiveTab('habis')}
          activeOpacity={0.8}
        >
          <View style={styles.tabContentRow}>
            <Text style={[styles.topTabText, activeTab === 'habis' && styles.topTabTextActive]}>Habis</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Menu List */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {loading ? (
           <View style={styles.centerContainer}>
             <ActivityIndicator size="large" color="#1565C0" />
             <Text style={styles.loadingText}>Memuat menu...</Text>
           </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={70} color="#D0D5DD" style={styles.emptyEmoji} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'semua' ? 'Belum ada menu' : activeTab === 'tersedia' ? 'Tidak ada menu tersedia' : 'Tidak ada menu habis'}
            </Text>
            {activeTab === 'semua' && (
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('VendorAddMenu')}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Tambah Menu Baru</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((menu) => (
            <View key={menu._id} style={styles.menuCard}>

              <View style={styles.menuCardTop}>
                
                <View style={styles.menuImageBox}>
                  {menu.foto_url ? (
                    <Image source={{ uri: menu.foto_url }} style={styles.menuImage} resizeMode="cover" />
                  ) : (
                    <Ionicons name="fast-food" size={36} color="#1565C0" />
                  )}
                </View>

                {/* INFO MENU DIRAPIKAN (Max 2 Varian Teks) */}
                <View style={styles.menuInfo}>
                  
                  {/* Baris 1: Nama Menu & Toggle */}
                  <View style={styles.menuRow}>
                    <Text style={[styles.textPrimary, { flex: 1, paddingRight: 8 }]} numberOfLines={1}>
                      {menu.nama}
                    </Text>
                    {!menu.tersedia && (
                      <View style={styles.habisTag}>
                        <Text style={styles.habisTagText}>Habis</Text>
                      </View>
                    )}
                    <Switch
                      value={menu.tersedia}
                      onValueChange={() => toggleTersedia(menu._id, menu.tersedia)}
                      trackColor={{ false: '#E0E0E0', true: '#BBDEFB' }}
                      thumbColor={menu.tersedia ? '#1565C0' : '#bbb'}
                      style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }], marginRight: -6 }}
                    />
                  </View>

                  {/* Baris 2: Deskripsi */}
                  <Text style={[styles.textSecondary, { marginBottom: 8 }]} numberOfLines={1}>
                    {menu.deskripsi || 'Tidak ada deskripsi'}
                  </Text>
                  
                  {/* Baris 3: Harga & Stats (Stok/Terjual) */}
                  <View style={styles.menuRow}>
                    <Text style={[styles.textPrimary, { color: '#1565C0' }]}>
                      Rp {menu.harga ? menu.harga.toLocaleString('id-ID') : '0'}
                    </Text>
                    <Text style={styles.textSecondary}>
                      Stok: {menu.stok !== undefined ? menu.stok : 0}  •  {menu.terjual || 0} Terjual
                    </Text>
                  </View>

                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnOutlineGray]}
                  onPress={() => navigation.navigate('VendorEditMenu', { menu: menu })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil" size={14} color="#555" style={{ marginRight: 6 }} />
                  <Text style={styles.btnTextGray}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnOutlineRed]}
                  onPress={() => handleHapus(menu._id, menu.nama)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash" size={14} color="#EF5350" style={{ marginRight: 6 }} />
                  <Text style={styles.btnTextRed}>Hapus</Text>
                </TouchableOpacity>
              </View>

            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#fff', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1565C0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  
  topTabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  topTabButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  topTabActive: { borderBottomColor: '#1565C0' },
  tabContentRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topTabText: { fontSize: 15, fontWeight: '600', color: '#888' },
  topTabTextActive: { color: '#1565C0' },

  listContent: { padding: 16, paddingBottom: 80 },
  
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, gap: 12 },
  loadingText: { fontSize: 14, color: '#888' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1565C0', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  menuCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  menuCardTop: { flexDirection: 'row', alignItems: 'center' },
  
  menuImageBox: { width: 76, height: 76, borderRadius: 14, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  menuImage: { width: '100%', height: '100%' },
  
  menuInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  textPrimary: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  textSecondary: { fontSize: 13, color: '#666' },

  habisTag: { backgroundColor: '#FFEBEE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4 },
  habisTagText: { fontSize: 10, fontWeight: 'bold', color: '#C62828' },
  
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 14 },
  
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnOutlineGray: { backgroundColor: '#F5F7FA', borderWidth: 1, borderColor: '#E0E0E0' },
  btnTextGray: { color: '#555', fontWeight: '700', fontSize: 14 },
  btnOutlineRed: { backgroundColor: '#FFF3F3', borderWidth: 1, borderColor: '#EF5350' },
  btnTextRed: { color: '#EF5350', fontWeight: '700', fontSize: 14 },
});