import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';
import Constants from 'expo-constants'; 

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // Memastikan suara diizinkan
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('⚠️ Push notification cuma jalan di HP beneran!');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('❌ Izin notifikasi ditolak!');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX, // MAX bikin dia muncul dari atas layar (Heads-up)
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1565C0',
    });
  }

  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.log('❌ Project ID tidak ditemukan! Pastikan sudah jalankan "eas init" di terminal.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    
    const token = tokenData.data;
    console.log("📱 Expo Push Token didapat:", token);

    await api.put('/auth/update-profile', { expo_push_token: token });
    console.log("✅ Token berhasil disimpan ke database!");
    
    return token;
  } catch (error) {
    console.log("❌ Gagal mengambil/menyimpan token:", error);
    return null;
  }
}

// 🔥 INI DIA YANG DIBIKIN JADI BUNYI & GETER
export async function sendOrderStatusNotification(status, tokoNama, orderId) {
  let title = '';
  let body = '';

  // 💡 Ini teks yang kamu tanyain tadi! Bisa diganti sesuka hati.
  if (status === 'diproses') {
    title = '👨‍🍳 Pesanan Diproses!';
    body = `${tokoNama} sedang menyiapkan pesananmu.`;
  } else if (status === 'siap') {
    title = '✅ Pesanan Siap Diambil!';
    body = `Pesananmu di ${tokoNama} sudah siap! Segera ambil ya.`;
  } else if (status === 'ditolak') {
    title = '❌ Pesanan Ditolak';
    body = `Maaf, pesananmu di ${tokoNama} ditolak oleh penjual.`;
  } else {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { orderId, status },
      sound: true, // 🔥 Pemicu bunyi di iOS dan Android
      vibrate: [0, 250, 250, 250], // 🔥 Pemicu getar di Android
    },
    trigger: null, // trigger null artinya notifikasi langsung dikirim detik itu juga
  });
}