import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, 
  Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform,
  Modal, ActionSheetIOS 
} from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../service/api';
import { customAlert } from '../../utils/alerthelper';
import { Ionicons } from '@expo/vector-icons';

// KOMPONEN INPUT GAYA BARU
const MenuInput = ({ 
  iconName, placeholder, value, onChangeText, 
  keyboardType, autoCapitalize, multiline
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const iconColor = isFocused ? '#1565C0' : '#888';
  const borderBottomColor = isFocused ? '#1565C0' : '#E8ECF0';

  return (
    <View style={styles.inputRow}>
      <View style={[styles.iconContainer, multiline && { paddingTop: 14, justifyContent: 'flex-start' }]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>
      <View style={[styles.textInputWrapper, { borderBottomColor }, multiline && { borderBottomWidth: 1 }]}>
        <TextInput
          style={[styles.textInputStyle, multiline && styles.multilineStyle]}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          autoComplete="off"
          textContentType="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );
};

export default function VendorAddMenuScreen({ navigation }) {
  const [namaMenu, setNamaMenu] = useState('');
  const [harga, setHarga] = useState('');
  const [stok, setStok] = useState(''); 
  const [deskripsi, setDeskripsi] = useState('');
  
  const [fotoMenu, setFotoMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // State untuk modal foto
  const [modalVisible, setModalVisible] = useState(false);

  // 🔥 FUNGSI BARU: Logika Jeda Pintar!
  const showImageOptions = (isFromModal = false) => {
    
    // Ini isi menunya (Kamera / Galeri)
    const openMenu = () => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: 'Upload Foto Menu',
            options: ['Buka Kamera', 'Dari Galeri', 'Batal'],
            cancelButtonIndex: 2,
          },
          (btnIndex) => {
            if (btnIndex === 0) launchImage(true);
            else if (btnIndex === 1) launchImage(false);
          }
        );
      } else {
        Alert.alert("Upload Foto Menu", "Pilih sumber foto", [
          { text: 'Buka Kamera', onPress: () => launchImage(true) },
          { text: 'Dari Galeri', onPress: () => launchImage(false) },
        ], { cancelable: true });
      }
    };

    // Pengecekan pintarnya ada di sini:
    if (isFromModal) {
      setModalVisible(false);
      setTimeout(openMenu, 500); // Kasih jeda HANYA kalau nutup modal dulu
    } else {
      openMenu(); // Langsung ngebut tanpa delay!
    }
  };

  const launchImage = async (useCamera) => {
    const perm = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync() 
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) { 
      customAlert('Izin diperlukan', 'Akses dibutuhkan untuk mengambil foto.');
      return; 
    }

    try {
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Menu bentuk kotak
        quality: 0.3,
        base64: true
      };

      const result = useCamera 
        ? await ImagePicker.launchCameraAsync(options) 
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled) {
        setFotoMenu(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      customAlert('Error', 'Gagal memproses foto menu.');
    }
  };

  const handleSimpanMenu = async () => {
    if (!namaMenu.trim() || !harga.trim() || !stok.trim() || !fotoMenu) {
      customAlert('Mau kemana?', 'Masih ada data yang kosong tuh');
      return;
    }

    setLoading(true);
    try {
      const resToko = await api.get('/toko/vendor/mytoko'); 
      const idToko = resToko.data._id || resToko.data.toko?._id || resToko.data.data?._id;

      if (!idToko) {
        customAlert('Ups!', 'Data tokomu tidak ditemukan di server!');
        setLoading(false);
        return;
      }

      await api.post('/menu', {
        toko_id: idToko,
        nama: namaMenu.trim(),
        deskripsi: deskripsi.trim(),
        harga: Number(harga),
        stok: Number(stok),
        kategori: 'Makanan', 
        foto_url: fotoMenu
      });

      customAlert('Berhasil!', 'Menu baru sudah ditambahkan ke tokomu.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      
    } catch (error) {
      console.log("❌ ERROR SIMPAN MENU:", error.response ? error.response.data : error.message);
      if (error.response?.status === 404 && error.config.url.includes('/toko/me')) {
        customAlert('Jalur API Hilang', 'Di backend Node.js kamu sepertinya belum ada jalur untuk GET /toko/me');
      } else {
        const errorMsg = error.response?.data?.message || 'Gagal menyimpan menu. Cek koneksi servermu.';
        customAlert('Gagal Menyimpan', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tambah Menu</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <Text style={styles.formSectionHeading}>Informasi Menu</Text>
          <View style={styles.formSectionFields}>
            
            <MenuInput iconName="fast-food-outline" placeholder="Nama Menu" value={namaMenu} onChangeText={setNamaMenu} />
            <MenuInput iconName="pricetag-outline" placeholder="Harga Menu" value={harga} onChangeText={setHarga} keyboardType="numeric" />
            <MenuInput iconName="cube-outline" placeholder="Jumlah Stok Menu" value={stok} onChangeText={setStok} keyboardType="numeric" />
            <MenuInput iconName="document-text-outline" placeholder="Deskripsi Menu (Opsional)" value={deskripsi} onChangeText={setDeskripsi} />
          
          </View>

          {/* FOTO MENU */}
          <Text style={[styles.formSectionHeading, { marginTop: 16 }]}>Foto Menu</Text>
          <View style={styles.formSectionFields}>
            <View style={styles.fotoSection}>
              <View style={styles.iconContainer}><Ionicons name="image-outline" size={22} color="#888" /></View>
              <View style={styles.fotoContent}>
                
                <TouchableOpacity 
                  style={[styles.fotoBox, fotoMenu && styles.fotoBoxSolid]} 
                  onPress={() => fotoMenu ? setModalVisible(true) : showImageOptions(false)} 
                  activeOpacity={0.8}
                >
                  {fotoMenu ? (
                    <Image source={{ uri: fotoMenu }} style={styles.fotoPreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.fotoPlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={32} color="#1565C0" />
                      <Text style={styles.fotoLabel}>Upload Foto Menu</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {fotoMenu && (
                  <View style={styles.fotoActionRow}>
                    <TouchableOpacity onPress={() => showImageOptions(false)}>
                      <Text style={styles.fotoActionText}>Ubah Foto</Text>
                    </TouchableOpacity>
                    <Text style={styles.fotoActionSeparator}>|</Text>
                    <TouchableOpacity onPress={() => setFotoMenu(null)}>
                      <Text style={[styles.fotoActionText, { color: '#D32F2F' }]}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.bottomArea}>
          <TouchableOpacity 
            style={[styles.btnSimpan, loading && styles.btnSimpanDisabled]} 
            onPress={handleSimpanMenu} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnSimpanText}>Simpan Menu Baru</Text>}
          </TouchableOpacity>
        </View>

      </View>

      {/* MODAL FOTO DETAIL */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackground}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setModalVisible(false)} activeOpacity={1} />
          <View style={styles.modalContent}>
            {fotoMenu && (
              <View style={styles.fullImageWrapper}>
                <Image source={{ uri: fotoMenu }} style={styles.fullImage} resizeMode="contain" />
              </View>
            )}
            {/* 🔥 Kalau tombol dari dalam Modal di klik, lempar true biar dia jeda dulu */}
            <TouchableOpacity onPress={() => showImageOptions(true)} activeOpacity={0.7} style={{ padding: 10 }}>
              <Text style={styles.modalUbahFotoText}>Ubah Foto Menu</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setModalVisible(false)} activeOpacity={1} />
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 55, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backIcon: { fontSize: 26, color: '#1a1a1a', lineHeight: 30, marginTop: -2 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  
  scrollContent: { paddingTop: 20, paddingBottom: 40 },
  
  formSectionHeading: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 24, marginTop: 4, marginBottom: 12 },
  formSectionFields: { paddingHorizontal: 24, marginBottom: 8 },
  
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconContainer: { width: 44, justifyContent: 'center', alignItems: 'flex-start', marginTop: 4 }, 
  textInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 14 },
  textInputStyle: { flex: 1, fontSize: 16, color: '#1a1a1a', padding: 0, margin: 0 },
  multilineStyle: { minHeight: 60, textAlignVertical: 'top', paddingTop: 4, paddingBottom: 10 },

  fotoSection: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  fotoContent: { flex: 1 },
  fotoBox: { width: 160, height: 160, backgroundColor: '#F5F7FA', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#1565C0', overflow: 'hidden' },
  fotoBoxSolid: { borderStyle: 'solid', borderColor: '#E8ECF0', borderWidth: 1, backgroundColor: '#fff' }, 
  fotoPreview: { width: '100%', height: '100%' },
  fotoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  fotoLabel: { fontSize: 12, fontWeight: '600', color: '#1565C0', marginTop: 8 },
  fotoActionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  fotoActionText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  fotoActionSeparator: { marginHorizontal: 8, color: '#ccc' },

  bottomArea: { padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, backgroundColor: '#fff', borderTopColor: '#F0F0F0' },
  btnSimpan: { backgroundColor: '#1565C0', paddingVertical: 16, borderRadius: 100, alignItems: 'center'},
  btnSimpanDisabled: { backgroundColor: '#A0A0A0', elevation: 0, shadowOpacity: 0 },
  btnSimpanText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', flexDirection: 'column', justifyContent: 'center' },
  modalCloseArea: { flex: 1 },
  modalContent: { alignItems: 'center', paddingVertical: 20 },
  fullImageWrapper: { width: 320, height: 320, backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  fullImage: { width: '100%', height: '100%' },
  modalUbahFotoText: { marginTop: 24, fontSize: 15, fontWeight: '700', color: '#fff', textDecorationLine: 'underline' }
});