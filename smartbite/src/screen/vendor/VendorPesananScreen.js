import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { customAlert } from '../../utils/alerthelper';
import { api } from '../../service/api';
import { Ionicons } from '@expo/vector-icons';

const TABS = [
  { id: 'menunggu', label: 'Menunggu' },
  { id: 'diproses', label: 'Diproses' },
  { id: 'siap',     label: 'Siap' },
  { id: 'selesai',  label: 'Selesai' },
  { id: 'ditolak',  label: 'Ditolak' },
];

const TAB_COLORS = {
  menunggu: '#F57F17',
  diproses: '#1565C0',
  siap:     '#2E7D32',
  selesai:  '#888888',
  ditolak:  '#C62828' 
};

export default function VendorPesananScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('menunggu');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const tokoRes = await api.get('/toko/vendor/mytoko');
      const tokoId = tokoRes.data._id;

      const orderRes = await api.get(`/orders/vendor/${tokoId}`);
      setOrders(orderRes.data);
    } catch (error) {
      console.log("Error fetch orders:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      const intervalId = setInterval(fetchOrders, 3000);
      return () => clearInterval(intervalId);
    }, [])
  );

  const filtered = orders.filter(o => o.status === activeTab);
  const counts = Object.fromEntries(TABS.map(t => [t.id, orders.filter(o => o.status === t.id).length]));

  const updateStatus = async (id, newStatus) => {
    setOrders(prev => prev.map(o => (o._id || o.id) === id ? { ...o, status: newStatus } : o));
    
    try {
      await api.put(`/orders/${id}/status`, { status: newStatus });
      setActiveTab(newStatus); 
    } catch (error) {
      Alert.alert('Gagal', 'Tidak dapat mengupdate status pesanan.');
      fetchOrders(); 
    }
  };

  const handleTerima = (id) => {
    customAlert('Terima Pesanan?', 'Pesanan akan mulai diproses.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Terima', onPress: () => updateStatus(id, 'diproses') },
    ]);
  };

  const handleTolak = (id) => {
    customAlert('Tolak Pesanan?', 'Pesanan akan ditolak dan customer akan diberitahu.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Tolak', style: 'destructive', onPress: () => updateStatus(id, 'ditolak') },
    ]);
  };

  const handleSiap = (id) => {
    customAlert('Pesanan Siap?', 'Tandai pesanan siap diambil oleh customer.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Siap!', onPress: () => updateStatus(id, 'siap') },
    ]);
  };

  const handleSelesai = (id) => {
    customAlert('Tandai Selesai?', 'Pesanan sudah diambil oleh customer.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Selesai', onPress: () => updateStatus(id, 'selesai') },
    ]);
  };

  // 🔥 FUNGSI NOTIFIKASI REAL-TIME KE BACKEND
  const sendNotification = async (orderId, minutes) => {
    try {
      // 1. Tembak API Notifikasi (Harus dibuat di Node.js pakai Socket.io / Expo Push)
      await api.post(`/orders/${orderId}/notify`, { 
        title: "Pesanan Diproses! 👨‍🍳",
        message: `Toko sedang menyiapkan makananmu. Kira-kira siap dalam ${minutes} menit lagi!` 
      });
      
      customAlert('Terkirim!', `Customer sudah diberitahu pesanan siap dalam ${minutes} menit.`);
    } catch (error) {
      console.log("Error send notif:", error);
      // Kalau endpointnya belum dibikin di backend, kita munculin alert ini dulu
      customAlert('Sedang Dikembangkan', `Simulasi sukses! (Endpoint /orders/${orderId}/notify belum ada di backend).`);
    }
  };

  const handleNotifCustomer = (id) => {
    customAlert(
      'Kirim Notifikasi',
      'Pilih estimasi waktu untuk dikirim ke customer:',
      [
        { text: '10 menit', onPress: () => sendNotification(id, 10) },
        { text: '5 menit',  onPress: () => sendNotification(id, 5) },
        { text: '2 menit',  onPress: () => sendNotification(id, 2) },
        { text: 'Batal', style: 'cancel' },
      ]
    );
  };

  const handleChatPembeli = (order) => {
    navigation.navigate('RoomChat', {
      tokoId: order.toko_id, 
      tokoNama: order.customer_id.nama, 
      customerId: order.customer_id._id, 
      isVendor: true 
    });
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pesanan Masuk</Text>
        <Text style={styles.headerSub}>Kelola semua pesanan tokomu</Text>
      </View>

      {/* Tab Bar (Warna Dinamis) */}
      <View style={styles.topTabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const tabColor = TAB_COLORS[tab.id];

            return (
              <TouchableOpacity 
                key={tab.id} 
                style={[styles.topTabButton, isActive && { borderBottomColor: tabColor }]} 
                onPress={() => setActiveTab(tab.id)} 
                activeOpacity={0.8}
              >
                <View style={styles.tabContentRow}>
                  <Text style={[styles.topTabText, isActive && { color: tabColor }]}>
                    {tab.label}
                  </Text>
                  {counts[tab.id] > 0 && (
                    <View style={[styles.tabBadge, isActive && { backgroundColor: tabColor }]}>
                      <Text style={[styles.tabBadgeText, isActive && { color: '#fff' }]}>
                        {counts[tab.id]}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading && orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#1565C0" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={70} color="#D0D5DD" style={styles.emptyEmoji} />
          <Text style={styles.emptyTitle}>Tidak ada pesanan</Text>
          <Text style={styles.emptyDesc}>Pesanan "{TABS.find(t => t.id === activeTab)?.label}" akan muncul di sini</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {filtered.map((order) => {
            const orderId = order._id || order.id;
            const waktuOrder = new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            
            let metodeColor = '#2E7D32'; 
            if (order.metode_bayar === 'QRIS') metodeColor = '#6A1B9A';
            else if (order.metode_bayar === 'Transfer Bank') metodeColor = '#1565C0';

            return (
            <TouchableOpacity 
              key={orderId} 
              style={styles.orderCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('VendorDetailPesanan', { order: order })}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <Text style={styles.orderId}>{order.kode_pickup || `#${orderId.slice(0,6).toUpperCase()}`}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="time-outline" size={14} color="#888" />
                    <Text style={styles.orderTime}>{waktuOrder}</Text>
                  </View>
                </View>
                
                <View style={[
                  styles.metodeBadge,
                  order.metode_bayar === 'QRIS' && styles.metodeQris,
                  order.metode_bayar === 'Transfer Bank' && styles.metodeTransfer,
                  order.metode_bayar === 'Tunai' && styles.metodeTunai,
                ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="wallet-outline" size={12} color={metodeColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.metodeText, { color: metodeColor }]}>{order.metode_bayar}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Items */}
              {order.items.map((item, i) => (
                <View key={i} style={styles.itemRow}>
                  <Text style={styles.itemNama}>{item.nama_menu || item.nama}</Text>
                  <Text style={styles.itemQty}>x{item.qty}</Text>
                  <Text style={styles.itemHarga}>Rp {(item.harga * item.qty).toLocaleString('id-ID')}</Text>
                </View>
              ))}

              <View style={styles.divider} />

              <View style={styles.cardBottom}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 10 }}>
                  {order.catatan ? (
                    <>
                      <Ionicons name="document-text-outline" size={14} color="#F57F17" style={{ marginRight: 4 }} />
                      <Text style={styles.catatan} numberOfLines={1}>{order.catatan}</Text>
                    </>
                  ) : (
                    <Text style={styles.noCatatan}>Tidak ada catatan</Text>
                  )}
                </View>
                <Text style={styles.totalText}>Rp {(order.total_harga || order.total).toLocaleString('id-ID')}</Text>
              </View>

              {/* ── Action Buttons ── */}
              <View style={styles.actionContainer}>
                
                {/* 1. STATUS MENUNGGU */}
                {activeTab === 'menunggu' && (
                  <>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={[styles.btn, styles.btnOutlineRed]} onPress={() => handleTolak(orderId)} activeOpacity={0.8}>
                        <Ionicons name="close-circle" size={16} color="#EF5350" style={styles.btnIcon} />
                        <Text style={styles.btnTextRed}>Tolak Pesanan</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={[styles.btn, styles.btnOutlineGreen]} onPress={() => handleTerima(orderId)} activeOpacity={0.8}>
                        <Ionicons name="checkmark-circle" size={16} color="#2E7D32" style={styles.btnIcon} />
                        <Text style={styles.btnTextGreen}>Terima Pesanan</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity style={[styles.btnFull, styles.btnOutlineBlue, { marginTop: 8 }]} onPress={() => handleChatPembeli(order)} activeOpacity={0.8}>
                      <Ionicons name="chatbubbles" size={16} color="#1565C0" style={styles.btnIcon} />
                      <Text style={styles.btnTextBlue}>Chat Pembeli</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* 2. STATUS DIPROSES */}
                {activeTab === 'diproses' && (
                  <>
                    <View style={styles.actionRow}>
                      <TouchableOpacity style={[styles.btn, styles.btnOutlineYellow]} onPress={() => handleNotifCustomer(orderId)} activeOpacity={0.8}>
                        <Ionicons name="notifications" size={16} color="#F57F17" style={styles.btnIcon} />
                        <Text style={styles.btnTextYellow}>Notif Customer</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={[styles.btn, styles.btnOutlineGreen]} onPress={() => handleSiap(orderId)} activeOpacity={0.8}>
                        <Ionicons name="restaurant" size={16} color="#2E7D32" style={styles.btnIcon} />
                        <Text style={styles.btnTextGreen}>Tandai Siap</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={[styles.btnFull, styles.btnOutlineBlue, { marginTop: 8 }]} onPress={() => handleChatPembeli(order)} activeOpacity={0.8}>
                      <Ionicons name="chatbubbles" size={16} color="#1565C0" style={styles.btnIcon} />
                      <Text style={styles.btnTextBlue}>Chat Pembeli</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* 3. STATUS SIAP (Tombol Chat & Selesai Sejajar) */}
                {activeTab === 'siap' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.btn, styles.btnOutlineBlue]} onPress={() => handleChatPembeli(order)} activeOpacity={0.8}>
                      <Ionicons name="chatbubbles" size={16} color="#1565C0" style={styles.btnIcon} />
                      <Text style={styles.btnTextBlue}>Chat Pembeli</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.btn, styles.btnOutlineGreen]} onPress={() => handleSelesai(orderId)} activeOpacity={0.8}>
                      <Ionicons name="checkmark-done" size={18} color="#2E7D32" style={styles.btnIcon} />
                      <Text style={styles.btnTextGreen}>Sudah Diambil</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 4. STATUS SELESAI / DITOLAK */}
                {(activeTab === 'selesai' || activeTab === 'ditolak') && (
                  <TouchableOpacity style={[styles.btnFull, styles.btnOutlineBlue]} onPress={() => handleChatPembeli(order)} activeOpacity={0.8}>
                    <Ionicons name="chatbubbles" size={16} color="#1565C0" style={styles.btnIcon} />
                    <Text style={styles.btnTextBlue}>Chat Pembeli</Text>
                  </TouchableOpacity>
                )}

              </View>

            </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  header: { backgroundColor: '#fff', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  headerSub: { fontSize: 13, color: '#888', marginTop: 2 },

  topTabBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tabContainer: { paddingHorizontal: 16, paddingRight: 32 },
  topTabButton: { paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 4 },
  tabContentRow: { flexDirection: 'row', alignItems: 'center' },
  topTabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  
  tabBadge: { backgroundColor: '#F0F4FF', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  tabBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#1565C0' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyEmoji: { marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 },

  listContent: { padding: 16, paddingBottom: 120 },

  orderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTopLeft: { alignItems: 'flex-start', gap: 4 },
  orderId: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A' },
  orderTime: { fontSize: 12, color: '#888' },
  metodeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  metodeQris: { backgroundColor: '#F3E5F5' },
  metodeTransfer: { backgroundColor: '#E3F2FD' },
  metodeTunai: { backgroundColor: '#E8F5E9' },
  metodeText: { fontSize: 11, fontWeight: '700' },
  
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemNama: { flex: 1, fontSize: 13, color: '#1A1A1A' },
  itemQty: { fontSize: 13, color: '#888', marginRight: 10 },
  itemHarga: { fontSize: 13, fontWeight: '700', color: '#1565C0' },
  
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  catatan: { fontSize: 12, color: '#F57F17' },
  noCatatan: { fontSize: 12, color: '#ccc' },
  totalText: { fontSize: 15, fontWeight: 'bold', color: '#1565C0' },

  actionContainer: { marginTop: 12 },
  actionRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, flexDirection: 'row', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnFull: { width: '100%', flexDirection: 'row', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnIcon: { marginRight: 6 },

  btnOutlineRed: { backgroundColor: '#FFF3F3', borderWidth: 1, borderColor: '#EF5350' },
  btnTextRed: { color: '#EF5350', fontWeight: '700', fontSize: 13 },

  btnOutlineYellow: { backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFC107' },
  btnTextYellow: { color: '#F57F17', fontWeight: '700', fontSize: 13 },

  btnOutlineBlue: { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#1565C0' },
  btnTextBlue: { color: '#1565C0', fontWeight: '700', fontSize: 13 },

  btnOutlineGreen: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#2E7D32' },
  btnTextGreen: { color: '#2E7D32', fontWeight: '700', fontSize: 13 },
});