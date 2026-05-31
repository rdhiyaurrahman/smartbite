import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../service/api';
import { customAlert } from '../../utils/alerthelper';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const STATUS_INFO = {
  menunggu: { bg: '#FFF8E1', color: '#F57F17', label: 'Menunggu' },
  diproses: { bg: '#E3F2FD', color: '#1565C0', label: 'Diproses' },
  siap:     { bg: '#E8F5E9', color: '#2E7D32', label: 'Siap'     },
  selesai:  { bg: '#F5F5F5', color: '#888',    label: 'Selesai'  },
  ditolak:  { bg: '#FFEBEE', color: '#C62828', label: 'Ditolak'  },
};

export default function VendorDashboardScreen({ navigation }) {
  const [toko, setToko] = useState(null);
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({ hariIni: 0, orderAktif: 0, selesaiHariIni: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        let data = Platform.OS === 'web' ? localStorage.getItem('userData') : await SecureStore.getItemAsync('userData');
        if (data) {
          const parsed = JSON.parse(data);
          setUserName(parsed.nama || parsed.name || 'Penjual');
        }
      } catch (e) {
        console.log("Error get user data", e);
      }
    };
    fetchUserData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const resToko = await api.get('/toko/vendor/mytoko');
      const tokoData = resToko.data;
      setToko(tokoData);

      const resStats = await api.get(`/orders/vendor/${tokoData._id}/stats`)
        .catch(() => ({ data: { hariIni: 0, orderAktif: 0, selesaiHariIni: 0 }}));
      setStats(resStats.data);

      const resOrders = await api.get(`/orders/vendor/${tokoData._id}/terbaru`)
        .catch(() => ({ data: [] }));
      setRecentOrders(resOrders.data);

    } catch (error) {
      console.log("❌ ERROR FETCH DASHBOARD:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const checkJamOperasional = () => {
    const now = new Date();
    const hours = now.getHours();
    return hours >= 0 && hours < 24; 
  };

  const toggleStatusToko = async (newValue) => {
    if (!toko) return;

    if (newValue === true && !checkJamOperasional()) {
      customAlert('Di Luar Jam Operasional', 'Toko hanya dapat dibuka pada jam operasional kantin (07:00 - 16:00).');
      return;
    }

    const actionTitle = newValue ? 'Buka Toko?' : 'Tutup Toko?';
    const actionDesc = newValue 
      ? 'Apakah kamu yakin ingin membuka toko sekarang?' 
      : 'Menutup toko akan otomatis menyelesaikan semua pesanan, Lanjutkan?';

    Alert.alert(
      actionTitle,
      actionDesc,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Lanjutkan',
          style: newValue ? 'default' : 'destructive',
          onPress: async () => {
            setIsUpdating(true);
            setToko({ ...toko, aktif: newValue });

            try {
              await api.put('/toko/vendor/update', { aktif: newValue });
              
              if (!newValue) {
                fetchDashboardData();
              }
            } catch (error) {
              customAlert('Gagal', 'Tidak dapat mengubah status toko. Cek koneksi.');
              setToko({ ...toko, aktif: !newValue });
            } finally {
              setIsUpdating(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !toko) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <ActivityIndicator size="large" color="#1565C0" />
        <Text style={{ marginTop: 10, color: '#888' }}>Memuat dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── Header ── */}
        <LinearGradient colors={['#1565C0', '#42A5F5']} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerDate}>{today}</Text>
              <Text style={styles.headerGreeting}>Halo, Kantin {userName}!</Text>
              <Text style={styles.headerKategori}>{toko?.kategori || 'Kategori'}</Text>
            </View>
          </View>

          <View style={styles.toggleCard}>
            <View style={styles.toggleLeft}>
              <View style={[styles.toggleDot, { backgroundColor: toko?.aktif ? '#4CAF50' : '#EF5350' }]} />
              <View>
                <Text style={styles.toggleLabel}>
                  {toko?.nama || 'Toko'} {toko?.aktif ? 'Sedang Buka' : 'Sedang Tutup'}
                </Text>
                <Text style={styles.toggleSub}>Jam operasional: 07:00 – 16:00</Text>
              </View>
            </View>
            <Switch
              value={toko?.aktif || false}
              onValueChange={toggleStatusToko}
              disabled={isUpdating}
              trackColor={{ false: 'rgba(239,83,80,0.35)', true: 'rgba(76,175,80,0.35)' }}
              thumbColor={toko?.aktif ? '#4CAF50' : '#EF5350'}
            />
          </View>
        </LinearGradient>

        {/* ── Body Container ── */}
        <View style={styles.bodyContainer}>

          {/* ── Statistik 3 Kolom ── */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => navigation.navigate('VendorPesanan')}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={24} color="#E65100" style={styles.statIcon} />
              <Text style={[styles.statValue, { color: '#E65100' }]}>{stats.orderAktif || 0}</Text>
              <Text style={styles.statLabel}>Pesanan{'\n'}Aktif</Text>
              {stats.orderAktif > 0 && <View style={styles.alertDot} />}
            </TouchableOpacity>

            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={24} color="#1565C0" style={styles.statIcon} />
              <Text style={styles.statValue}>Rp {((stats.hariIni || 0) / 1000).toFixed(0)}k</Text>
              <Text style={styles.statLabel}>Pemasukan{'\n'}Hari Ini</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#2E7D32" style={styles.statIcon} />
              <Text style={styles.statValue}>{stats.selesaiHariIni || 0}</Text>
              <Text style={styles.statLabel}>Selesai{'\n'}Hari Ini</Text>
            </View>
          </View>

          {/* ── Pintasan Cepat (Card Style) ── */}
          <View style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <Text style={styles.featureTitle}>Pintasan Cepat</Text>
            </View>

            <View style={styles.shortcutGrid}>
              <TouchableOpacity style={styles.shortcutItem} onPress={() => navigation.navigate('VendorMenu')}>
                <View style={[styles.shortcutIconBg, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="cube" size={24} color="#E65100" />
                </View>
                <Text style={styles.shortcutLabel}>Atur Stok</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shortcutItem} onPress={() => navigation.navigate('VendorProfil', { section: 'pembayaran' })}>
                <View style={[styles.shortcutIconBg, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="wallet" size={24} color="#2E7D32" />
                </View>
                <Text style={styles.shortcutLabel}>Pembayaran</Text>
              </TouchableOpacity>

              {/* 🔥 Pintasan Kata Pembeli */}
              <TouchableOpacity style={styles.shortcutItem} onPress={() => customAlert('Info', 'Fitur Kata Pembeli Segera Hadir')}>
                <View style={[styles.shortcutIconBg, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="chatbubble" size={24} color="#1565C0" />
                </View>
                <Text style={styles.shortcutLabel}>Kata Pembeli</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.shortcutItem} onPress={() => customAlert('Info', 'Fitur Laporan Segera Hadir')}>
                <View style={[styles.shortcutIconBg, { backgroundColor: '#FFEBEE' }]}>
                  <Ionicons name="stats-chart" size={24} color="#C62828" />
                </View>
                <Text style={styles.shortcutLabel}>Laporan</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Pesanan Terbaru ── */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Pesanan Terbaru</Text>
            <TouchableOpacity onPress={() => navigation.navigate('VendorPesanan')} activeOpacity={0.7}>
              <Text style={styles.seeAll}>Lihat semua →</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <View style={styles.emptyOrderContainer}>
              <Text style={styles.emptyOrderText}>Belum ada pesanan masuk hari ini.</Text>
            </View>
          ) : (
            recentOrders.map((order) => {
              const s = STATUS_INFO[order.status?.toLowerCase()] || STATUS_INFO.menunggu;
              let itemsSummary = "Pesanan";
              if (order.items && order.items.length > 0) {
                itemsSummary = order.items.map(i => `${i.nama_menu} x${i.jumlah || i.qty}`).join(', ');
              }
              const orderTime = new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

              return (
                <TouchableOpacity
                  key={order._id || order.id}
                  style={styles.orderCard}
                  onPress={() => navigation.navigate('VendorDetailPesanan', { order: order })}
                  activeOpacity={0.8}
                >
                  <View style={styles.orderLeft}>
                    <Text style={styles.orderId}>{order.kode_pickup || `#${String(order._id || order.id).slice(-6).toUpperCase()}`}</Text>
                    <Text style={styles.orderItems} numberOfLines={1}>{itemsSummary}</Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                       <Ionicons name="time-outline" size={15} color="#aaa" />
                       <Text style={styles.orderTime}>{orderTime}</Text>
                    </View>
                  </View>
                  <View style={styles.orderRight}>
                    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                      <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                    </View>
                    <Text style={styles.orderTotal}>Rp {(order.total_harga || order.total || 0).toLocaleString('id-ID')}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  header: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 32 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerDate: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 5 },
  headerGreeting: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 3 },
  headerKategori: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },

  toggleCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  toggleDot: { width: 10, height: 10, borderRadius: 5 },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  toggleSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  bodyContainer: {
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -20, padding: 20,
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    alignItems: 'center', position: 'relative',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  statIcon: { marginBottom: 6 },
  statValue: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4, textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#888', fontWeight: '500', textAlign: 'center', lineHeight: 14 },
  alertDot: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#E65100',
  },

  featureCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  featureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  featureTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  shortcutGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shortcutItem: { flex: 1, alignItems: 'center' },
  shortcutIconBg: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  shortcutLabel: { fontSize: 11, fontWeight: '600', color: '#444', textAlign: 'center' },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  seeAll: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  
  emptyOrderContainer: { padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
  emptyOrderText: { color: '#888', fontSize: 13 },

  orderCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  orderLeft: { flex: 1, marginRight: 12 },
  orderId: { fontSize: 13, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 3 },
  orderItems: { fontSize: 12, color: '#888', marginBottom: 3 },
  orderTime: { fontSize: 11, color: '#aaa' },
  orderRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderTotal: { fontSize: 13, fontWeight: 'bold', color: '#1565C0' },
});