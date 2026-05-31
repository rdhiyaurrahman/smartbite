import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef } from 'react';
import { api } from '../service/api'; 
import { sendOrderStatusNotification } from '../service/notification';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const STATUS_STEPS = [
  { id: 1, key: 'menunggu', label: 'Pesanan Diterima', desc: 'Pesanan kamu sudah masuk ke toko', icon: 'time-outline', lib: 'Ionicons' },
  { id: 2, key: 'diproses', label: 'Sedang Diproses', desc: 'Penjual sedang menyiapkan pesananmu', icon: 'chef-hat', lib: 'MaterialCommunityIcons' },
  { id: 3, key: 'siap', label: 'Pesanan Siap', desc: 'Pesanan siap diambil di toko!', icon: 'bag-check-outline', lib: 'Ionicons' },
];

export default function StatusOrderScreen({ route, navigation }) {
  const { toko: initialToko, totalHarga, catatan, metodeBayar, itemDiKeranjang: initialItems, keranjang, orderId } = route.params;
  
  const [fullToko, setFullToko] = useState(initialToko);
  const [fullItems, setFullItems] = useState(initialItems);

  const [currentStatus, setCurrentStatus] = useState(1);
  const [orderData, setOrderData] = useState(null); 
  
  const lastStatusRef = useRef(null);
  const isFirstFetch = useRef(true); 

  const routes = navigation.getState()?.routes;
  const prevRoute = routes ? routes[routes.length - 2]?.name : '';
  const isFromCheckout = prevRoute === 'Checkout';

  useEffect(() => {
    let intervalId; // Pindahin ke atas biar bisa di-clear dari dalam fetchStatus
    let isMounted = true; // Guard component unmount

    const fetchStatus = async () => {
      try {
        const timestamp = new Date().getTime();
        const response = await api.get(`/orders/me?t=${timestamp}`);
        
        if (!isMounted) return; // Kalau user udah pindah layar, gausah update state

        const myOrder = response.data.find(o => (o._id === orderId) || (o.id === orderId));
        
        if (myOrder) {
          
          // 🔥 GEMBOK ANTI-MUNDUR (Race Condition Fix)
          const terminalStates = ['siap', 'selesai', 'ditolak'];
          if (terminalStates.includes(lastStatusRef.current) && !terminalStates.includes(myOrder.status)) {
            // Kalau udah ditolak/selesai, tapi dapet data nyasar 'menunggu' (karena sinyal lemot), abaikan!
            return; 
          }

          setOrderData(myOrder);
          
          // 🔥 LOGIKA ANTI-SPAM NOTIF
          if (isFirstFetch.current) {
            lastStatusRef.current = myOrder.status;
            isFirstFetch.current = false;
          } else {
            if (myOrder.status !== lastStatusRef.current) {
              if (['diproses', 'siap', 'ditolak'].includes(myOrder.status)) {
                sendOrderStatusNotification(myOrder.status, fullToko.nama, orderId);
              }
              lastStatusRef.current = myOrder.status;
            }
          }

          if (myOrder.status === 'menunggu') setCurrentStatus(1);
          else if (myOrder.status === 'diproses') setCurrentStatus(2);
          else if (myOrder.status === 'siap' || myOrder.status === 'selesai') setCurrentStatus(3);
          else if (myOrder.status === 'ditolak') setCurrentStatus(0); 

          // 🔥 MATIKAN INTERVAL KALAU UDAH TAMAT
          if (terminalStates.includes(myOrder.status) && intervalId) {
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.log("Gagal cek status:", error.message);
      }
    };

    const fetchMissingImages = async () => {
      try {
        const tId = fullToko._id || fullToko.id || fullToko.toko_id;
        if (!tId) return;

        const menuRes = await api.get(`/menu/toko/${tId}`);
        if (menuRes.data) {
          setFullItems(prev => prev.map(item => {
            const match = menuRes.data.find(m => (m._id || m.id) === (item._id || item.id || item.menu_id));
            return match && match.foto_url ? { ...item, foto_url: match.foto_url } : item;
          }));
        }

        if (!fullToko.foto_url) {
          const tokoRes = await api.get('/toko');
          const matchToko = tokoRes.data.find(t => (t._id || t.id) === tId);
          if (matchToko && matchToko.foto_url) {
            setFullToko(prev => ({ ...prev, foto_url: matchToko.foto_url, estimasi: matchToko.estimasi || prev.estimasi }));
          }
        }
      } catch (error) {
        console.log("Gagal fetch gambar:", error.message);
      }
    };

    fetchStatus(); // Tarikan pertama
    
    if (!fullToko.foto_url || fullItems.some(item => !item.foto_url)) {
      fetchMissingImages();
    }

    // Jalankan interval tiap 3 detik
    intervalId = setInterval(fetchStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [orderId]);

  const getStepColor = (stepId) => {
    if (stepId < currentStatus) return '#4CAF50';
    if (stepId === currentStatus) return '#1565C0';
    return '#E8ECF0';
  };

  const getMetodeIcon = (label) => {
    const lbl = (label || '').toLowerCase();
    if (lbl.includes('qris')) return 'qr-code-outline';
    if (lbl.includes('transfer')) return 'swap-horizontal-outline';
    return 'cash-outline';
  };

  const handleChatPenjual = () => {
    navigation.navigate('RoomChat', { 
      tokoId: fullToko._id || fullToko.id || fullToko.toko_id,
      tokoNama: fullToko.nama,
      orderId: orderId,
      autoCreateRoom: true 
    });
  };

  const isRejected = orderData?.status === 'ditolak';
  const statusLabel = isRejected ? 'Ditolak' : currentStatus === 3 ? 'Siap Diambil!' : currentStatus === 2 ? 'Sedang Dimasak' : 'Menunggu Konfirmasi';

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        {!isFromCheckout && (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
        )}

        <View style={styles.headerInner}>
          <Text style={styles.headerLabel}>Status Pesanan</Text>
          <Text style={styles.headerOrderId}>
            {orderData?.kode_pickup ? orderData.kode_pickup : 'Memuat Kode...'}
          </Text>
          <View style={[styles.statusPill, currentStatus === 3 && styles.statusPillGreen, isRejected && styles.statusPillRed]}>
            {isRejected && <Ionicons name="close-circle" size={14} color="#C62828" style={{ marginRight: 6 }} />}
            {currentStatus === 3 && <Ionicons name="checkmark-circle" size={14} color="#2E7D32" style={{ marginRight: 6 }} />}
            <Text style={[styles.statusPillText, currentStatus === 3 && { color: '#2E7D32' }, isRejected && { color: '#C62828' }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Alert siap pickup */}
        {currentStatus === 3 && (
          <View style={styles.pickupAlert}>
            <Ionicons name="checkmark-circle" size={32} color="#2E7D32" />
            <View style={{ flex: 1 }}>
              <Text style={styles.pickupAlertTitle}>Pesanan Siap Diambil!</Text>
              <Text style={styles.pickupAlertDesc}>Segera ke {fullToko.nama} untuk pickup</Text>
            </View>
          </View>
        )}

        {/* Tracking Pesanan (Abu-abu kalau ditolak) */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="location-outline" size={18} color="#1a1a1a" />
            <Text style={styles.cardTitle}>Tracking Pesanan</Text>
          </View>

          {STATUS_STEPS.map((step, index) => {
            const IconStatus = step.lib === 'MaterialCommunityIcons' ? MaterialCommunityIcons : Ionicons;
            return (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepLeft}>
                  <View style={[styles.stepCircle, { backgroundColor: getStepColor(step.id) }]}>
                    {step.id < currentStatus ? (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    ) : step.id === currentStatus ? (
                      <View style={styles.stepDot} />
                    ) : (
                      <Text style={styles.stepNum}>{step.id}</Text>
                    )}
                  </View>
                  {index < STATUS_STEPS.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: step.id < currentStatus ? '#4CAF50' : '#E8ECF0' }]} />
                  )}
                </View>
                <View style={styles.stepInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <IconStatus name={step.icon} size={15} color={step.id <= currentStatus ? '#1a1a1a' : '#bbb'} style={{ marginRight: 6 }} />
                    <Text style={[styles.stepLabel, { color: step.id <= currentStatus ? '#1a1a1a' : '#bbb' }]}>
                      {step.label}
                    </Text>
                  </View>
                  <Text style={[styles.stepDesc, { color: step.id <= currentStatus ? '#666' : '#ccc' }]}>
                    {step.desc}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Info Toko */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="storefront-outline" size={18} color="#1a1a1a" />
            <Text style={styles.cardTitle}>Info Pengambilan</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.tokoIconBox}>
              {fullToko.foto_url ? (
                <Image source={{ uri: fullToko.foto_url }} style={styles.tokoImage} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 40 }}>{fullToko.emoji || '🏪'}</Text>
              )}
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text style={styles.infoNama}>{fullToko.nama}</Text>
              <Text style={styles.infoKategori}>{fullToko.kategori}</Text>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.infoDetail}>
            <View style={styles.infoDetailLeft}>
              <Ionicons name="time-outline" size={15} color="#888" />
              <Text style={styles.infoDetailLabel}>Estimasi</Text>
            </View>
            <Text style={styles.infoDetailValue}>{fullToko.estimasi || fullToko.waktu || '10-15 mnt'}</Text>
          </View>
          
          <View style={styles.infoDetail}>
            <View style={styles.infoDetailLeft}>
              <Ionicons name="card-outline" size={15} color="#888" />
              <Text style={styles.infoDetailLabel}>Pembayaran</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '60%', flexShrink: 1 }}>
              <Ionicons name={getMetodeIcon(metodeBayar.label)} size={14} color="#1a1a1a" />
              <Text style={[styles.infoDetailValue, { maxWidth: '100%' }]} numberOfLines={1}>{metodeBayar.label}</Text>
            </View>
          </View>

          {catatan ? (
            <View style={styles.infoDetail}>
              <View style={styles.infoDetailLeft}>
                <Ionicons name="document-text-outline" size={15} color="#888" />
                <Text style={styles.infoDetailLabel}>Catatan</Text>
              </View>
              <Text style={styles.infoDetailValue}>{catatan}</Text>
            </View>
          ) : null}
        </View>

        {/* Detail Pesanan */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="receipt-outline" size={18} color="#1a1a1a" />
            <Text style={styles.cardTitle}>Detail Pesanan</Text>
          </View>

          {fullItems.map((menu) => (
            <View key={menu._id || menu.id} style={styles.orderRow}>
              <View style={styles.orderImageBox}>
                {menu.foto_url ? (
                   <Image source={{ uri: menu.foto_url }} style={styles.orderImage} resizeMode="cover" />
                ) : (
                   <Text style={{ fontSize: 32 }}>{menu.emoji || '🍽️'}</Text>
                )}
              </View>
              
              <View style={styles.orderTextWrapper}>
                <Text style={styles.orderNama} numberOfLines={2}>{menu.nama}</Text>
                <Text style={styles.orderHargaText}>
                  Rp {((menu.harga || 0)).toLocaleString('id-ID')}
                </Text>
              </View>

              <Text style={styles.orderQty}>x{keranjang[menu._id || menu.id] || menu.qty}</Text>
              <Text style={styles.orderHargaTotal}>
                Rp {((menu.harga || 0) * (keranjang[menu._id || menu.id] || menu.qty)).toLocaleString('id-ID')}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Bayar</Text>
            <Text style={styles.totalValue}>Rp {totalHarga.toLocaleString('id-ID')}</Text>
          </View>
        </View>

        {/* AREA BUTTON DINAMIS */}
        {isFromCheckout ? (
          <View style={styles.bottomButtonsRow}>
            <TouchableOpacity style={[styles.bottomButton, styles.chatButtonHalf]} activeOpacity={0.8} onPress={handleChatPenjual}>
              <Ionicons name="chatbubbles-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.chatButtonText}>Chat Penjual</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bottomButton, styles.homeButtonHalf]} activeOpacity={0.8} onPress={() => navigation.navigate('Main')}>
              <Ionicons name="home-outline" size={18} color="#1565C0" style={{ marginRight: 6 }} />
              <Text style={styles.homeButtonText}>Beranda</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.chatButtonFull} activeOpacity={0.8} onPress={handleChatPenjual}>
            <Ionicons name="chatbubbles-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.chatButtonText}>Chat Penjual</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    backgroundColor: '#fff',
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
    position: 'relative',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 55, 
    width: 36, height: 36, borderRadius: 18, 
    backgroundColor: '#F5F7FA',
    justifyContent: 'center', alignItems: 'center'
  },
  backIcon: { fontSize: 26, color: '#1a1a1a', lineHeight: 30, marginTop: -2 },
  
  headerInner: { alignItems: 'center' },
  headerLabel: { fontSize: 13, color: '#888', fontWeight: '500', marginBottom: 4 },
  headerOrderId: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 10, letterSpacing: 1 },
  
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  statusPillGreen: { backgroundColor: '#E8F5E9' },
  statusPillRed: { backgroundColor: '#FFEBEE' },
  statusPillText: { fontSize: 13, fontWeight: '700', color: '#1565C0' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  pickupAlert: { backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, borderWidth: 1.5, borderColor: '#4CAF50' },
  pickupAlertTitle: { fontSize: 14, fontWeight: 'bold', color: '#2E7D32' },
  pickupAlertDesc: { fontSize: 12, color: '#555', marginTop: 2 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },

  stepRow: { flexDirection: 'row', marginBottom: 4 },
  stepLeft: { alignItems: 'center', marginRight: 14, width: 32 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  stepNum: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  stepLine: { width: 2, flex: 1, minHeight: 30, marginVertical: 2 },
  stepInfo: { flex: 1, paddingBottom: 20 },
  stepLabel: { fontSize: 14, fontWeight: '600' },
  stepDesc: { fontSize: 12, lineHeight: 18 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  tokoIconBox: { width: 84, height: 84, borderRadius: 18, backgroundColor: '#F0F4FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  tokoImage: { width: '100%', height: '100%' },
  infoNama: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  infoKategori: { fontSize: 13, color: '#888' },
  
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  
  infoDetail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  infoDetailLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoDetailLabel: { fontSize: 13, color: '#888' },
  infoDetailValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },

  orderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  orderImageBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  orderImage: { width: '100%', height: '100%' },
  orderTextWrapper: { flex: 1, justifyContent: 'center' },
  orderNama: { fontSize: 14, color: '#1a1a1a', fontWeight: '600', marginBottom: 2 },
  orderHargaText: { fontSize: 12, color: '#888' }, 
  orderQty: { fontSize: 13, color: '#888', fontWeight: '500', marginHorizontal: 6 },
  orderHargaTotal: { fontSize: 14, fontWeight: '700', color: '#1565C0', minWidth: 70, textAlign: 'right' }, 
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#1565C0' },

  bottomButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  bottomButton: { flex: 1, flexDirection: 'row', borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  chatButtonHalf: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  homeButtonHalf: { backgroundColor: '#fff', borderColor: '#1565C0' },
  chatButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  homeButtonText: { color: '#1565C0', fontSize: 15, fontWeight: 'bold' },
  
  chatButtonFull: { flexDirection: 'row', backgroundColor: '#1565C0', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1.5, borderColor: '#1565C0' },
});