import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, 
  ActivityIndicator, Image, Platform, Modal, Alert, ActionSheetIOS 
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { api } from '../../service/api';
import { customAlert } from '../../utils/alerthelper';
import { Ionicons } from '@expo/vector-icons';

const KATEGORI_LIST = ['Nasi', 'Mie', 'Snack', 'Minuman', 'Masakan Rumahan', 'Lainnya'];

const ProfileInput = ({ 
  iconName, placeholder, value, onChangeText, secureTextEntry, 
  keyboardType, autoCapitalize, showEyeToggle, multiline
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [passwordShown, setPasswordShown] = useState(!secureTextEntry);

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
          secureTextEntry={showEyeToggle ? !passwordShown : secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          autoComplete="off"
          textContentType="none"
          autoCorrect={false}
          importantForAutofill="no"
        />
        {showEyeToggle && (
           <TouchableOpacity onPress={() => setPasswordShown(!passwordShown)} style={styles.eyeIconBtn}>
             <Ionicons name={passwordShown ? "eye-outline" : "eye-off-outline"} size={20} color="#aaa" />
           </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// 🔥 Tambahin "route" ke props biar bisa nangkep parameter dari Dashboard
export default function VendorProfilScreen({ route, navigation, onLogout }) {
  const [loading, setLoading] = useState(true);
  
  // Ref & State buat Auto-Scroll
  const scrollViewRef = useRef(null);
  const [pembayaranY, setPembayaranY] = useState(0);

  // Data User
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');

  // Data Toko
  const [namaToko, setNamaToko] = useState('');
  const [kategoriArr, setKategoriArr] = useState([]);
  const [deskripsi, setDeskripsi] = useState('');
  const [jamBuka, setJamBuka] = useState('');
  const [jamTutup, setJamTutup] = useState('');
  
  // Data Pembayaran
  const [bank, setBank] = useState('');
  const [norek, setNorek] = useState('');
  const [atasNama, setAtasNama] = useState('');

  // Password
  const [passwordLama, setPasswordLama] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  
  // Image States
  const [fotoUrl, setFotoUrl] = useState(null);
  const [newPhotoBase64, setNewPhotoBase64] = useState(null);
  const [isPhotoDeleted, setIsPhotoDeleted] = useState(false);

  const [qrisUrl, setQrisUrl] = useState(null);
  const [newQrisBase64, setNewQrisBase64] = useState(null);
  const [isQrisDeleted, setIsQrisDeleted] = useState(false);

  // UI State
  const [saving, setSaving] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [fullImageModalVisible, setFullImageModalVisible] = useState(false);
  const [qrisModalVisible, setQrisModalVisible] = useState(false); 
  const [phoneFocused, setPhoneFocused] = useState(false);

  const initialData = useRef({});

  useEffect(() => {
    fetchProfileData();
    const unsubscribe = navigation.addListener('focus', fetchProfileData);
    return unsubscribe;
  }, [navigation]);

  // 🔥 Logika Auto-Scroll dieksekusi kalau parameternya match dan koordinat udah dapet
  useEffect(() => {
    if (route.params?.section === 'pembayaran' && pembayaranY > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: pembayaranY, animated: true });
        navigation.setParams({ section: undefined }); // Hapus parameter biar ga nge-scroll terus-terusan
      }, 100);
    }
  }, [route.params?.section, pembayaranY]);

  const fetchProfileData = async () => {
    try {
      let userData = Platform.OS === 'web' ? localStorage.getItem('userData') : await SecureStore.getItemAsync('userData');
      let profile = {};
      if (userData) {
        profile = JSON.parse(userData);
        const hp = profile?.no_hp ? profile.no_hp.replace('+62', '') : (profile?.no_hp || '');
        setNama(profile.nama || '');
        setEmail(profile.email || '');
        setNoHp(hp);
      }

      const resToko = await api.get('/toko/vendor/mytoko');
      const tokoData = resToko.data;
      
      setNamaToko(tokoData.nama || '');
      setKategoriArr(tokoData.kategori ? tokoData.kategori.split(', ') : []);
      setDeskripsi(tokoData.deskripsi || '');
      setJamBuka(tokoData.jam_buka || '07:00');
      setJamTutup(tokoData.jam_tutup || '16:00');
      
      const parts = (tokoData.norek || '').split(' - ');
      setBank(parts[0] || '');
      setNorek(parts[1] || '');
      setAtasNama(parts[2] || '');

      setFotoUrl(tokoData.foto_url || null);
      setQrisUrl(tokoData.qris || null);
      
      initialData.current = {
        nama: profile.nama || '', email: profile.email || '', noHp: profile?.no_hp ? profile.no_hp.replace('+62', '') : '',
        namaToko: tokoData.nama || '', kategori: tokoData.kategori || '', deskripsi: tokoData.deskripsi || '',
        jamBuka: tokoData.jam_buka || '07:00', jamTutup: tokoData.jam_tutup || '16:00',
        bank: parts[0] || '', norek: parts[1] || '', atasNama: parts[2] || '',
        fotoUrl: tokoData.foto_url || null, qrisUrl: tokoData.qris || null,
      };
    } catch (error) { console.log('Error fetch profile:', error.message); }
    setLoading(false);
  };

  useEffect(() => {
    const isDataChanged = (
      nama !== initialData.current.nama || email !== initialData.current.email || noHp !== initialData.current.noHp ||
      namaToko !== initialData.current.namaToko || kategoriArr.join(', ') !== initialData.current.kategori ||
      deskripsi !== initialData.current.deskripsi || jamBuka !== initialData.current.jamBuka || jamTutup !== initialData.current.jamTutup || 
      bank !== initialData.current.bank || norek !== initialData.current.norek || atasNama !== initialData.current.atasNama || 
      fotoUrl !== initialData.current.fotoUrl || qrisUrl !== initialData.current.qrisUrl || passwordBaru.length > 0
    );
    setIsModified(isDataChanged);
  }, [nama, email, noHp, namaToko, kategoriArr, deskripsi, jamBuka, jamTutup, bank, norek, atasNama, fotoUrl, qrisUrl, passwordBaru]);

  const toggleKategori = (kat) => {
    if (kategoriArr.includes(kat)) setKategoriArr(kategoriArr.filter(item => item !== kat));
    else setKategoriArr([...kategoriArr, kat]);
  };

  const handleUbahFotoClick = () => {
    setFullImageModalVisible(false);
    setTimeout(() => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { title: 'Ubah Foto Toko', options: fotoUrl ? ['Buka Kamera', 'Dari Galeri', 'Hapus Foto', 'Batal'] : ['Buka Kamera', 'Dari Galeri', 'Batal'], cancelButtonIndex: fotoUrl ? 3 : 2, destructiveButtonIndex: fotoUrl ? 2 : undefined },
          (btn) => { if (btn === 0) launchImage(true); else if (btn === 1) launchImage(false); else if (btn === 2 && fotoUrl) handleHapusFoto(); }
        );
      } else {
        const options = [{ text: 'Buka Kamera', onPress: () => launchImage(true) }, { text: 'Dari Galeri', onPress: () => launchImage(false) }];
        if (fotoUrl) options.push({ text: 'Hapus Foto', onPress: handleHapusFoto });
        Alert.alert("Ubah Foto Toko", "Pilih sumber foto", options, { cancelable: true });
      }
    }, 600); 
  };

  const launchImage = async (useCamera) => {
    const perm = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Izin Diperlukan', 'Akses dibutuhkan untuk mengambil foto.'); return; }
    
    const result = useCamera ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true }) : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true });
    
    if (!result.canceled) {
      setFotoUrl(result.assets[0].uri);
      setNewPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setIsPhotoDeleted(false);
    }
  };

  const handleHapusFoto = () => { setFotoUrl(null); setNewPhotoBase64(null); setIsPhotoDeleted(true); };

  const handleUploadQris = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Izin Diperlukan', 'Akses galeri dibutuhkan untuk upload QRIS.'); return; }
    
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true });
    if (!result.canceled) {
      setQrisUrl(result.assets[0].uri);
      setNewQrisBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setIsQrisDeleted(false);
    }
  };

  const handleUbahQrisClick = () => {
    setQrisModalVisible(false);
    setTimeout(() => {
      handleUploadQris();
    }, 600);
  };

  const handleSimpan = async () => {
    if (!nama.trim() || !email.trim() || !namaToko.trim()) { customAlert('Oops!', 'Nama Lengkap, Email, dan Nama Toko wajib diisi.'); return; }

    if (passwordBaru.trim().length > 0) {
      if (!passwordLama) { customAlert('Oops!', 'Masukkan password lama untuk verifikasi perubahan password.'); return; }
      if (passwordBaru.length < 6) { customAlert('Oops!', 'Password baru minimal 6 karakter.'); return; }
    }

    setSaving(true);
    try {
      let userPayload = { nama: nama.trim(), email: email.trim(), no_hp: noHp.trim() };
      if (passwordBaru.trim().length > 0) {
        userPayload.password_lama = passwordLama;
        userPayload.password_baru = passwordBaru;
      }

      const userRes = await api.put('/auth/update-profile', userPayload);
      if (Platform.OS === 'web') localStorage.setItem('userData', JSON.stringify(userRes.data.user));
      else await SecureStore.setItemAsync('userData', JSON.stringify(userRes.data.user));

      const combinedNorek = [bank.trim(), norek.trim(), atasNama.trim()].filter(Boolean).join(' - ');
      let tokoPayload = {
        nama: namaToko.trim(), 
        kategori: kategoriArr.join(', '), 
        deskripsi: deskripsi.trim(), 
        jam_buka: jamBuka.trim(),
        jam_tutup: jamTutup.trim(),
        norek: combinedNorek
      };
      
      if (newPhotoBase64) tokoPayload.foto_url = newPhotoBase64;
      if (isPhotoDeleted) tokoPayload.foto_url = ""; 
      
      if (newQrisBase64) tokoPayload.qris = newQrisBase64;
      if (isQrisDeleted) tokoPayload.qris = "";

      await api.put('/toko/vendor/update', tokoPayload);

      initialData.current = {
        nama: nama.trim(), email: email.trim(), noHp: noHp.trim(), 
        namaToko: namaToko.trim(), kategori: kategoriArr.join(', '), deskripsi: deskripsi.trim(), 
        jamBuka: jamBuka.trim(), jamTutup: jamTutup.trim(),
        bank: bank.trim(), norek: norek.trim(), atasNama: atasNama.trim(),
        fotoUrl: isPhotoDeleted ? null : (newPhotoBase64 ? fotoUrl : initialData.current.fotoUrl),
        qrisUrl: isQrisDeleted ? null : (newQrisBase64 ? qrisUrl : initialData.current.qrisUrl),
      };
      
      setIsModified(false); setNewPhotoBase64(null); setIsPhotoDeleted(false);
      setNewQrisBase64(null); setIsQrisDeleted(false);
      setPasswordLama(''); setPasswordBaru('');

      customAlert('Berhasil!', 'Profil toko dan akun kamu berhasil diperbarui.');
    } catch (err) {
      customAlert('Gagal', err.response?.data?.message || 'Terjadi kesalahan di server backend.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAction = () => {
    Alert.alert('Keluar Akun', 'Yakin ingin keluar dari aplikasi?', [{ text: 'Batal', style: 'cancel' }, { text: 'Keluar', style: 'destructive', onPress: () => onLogout && onLogout() }]);
  };

  const handleDeleteAccountAction = () => {
    Alert.alert('Hapus Akun', 'Perhatian! Akun kamu akan dihapus permanen dan tidak dapat dikembalikan.', [{ text: 'Batal', style: 'cancel' }, { text: 'Hapus Permanen', style: 'destructive', onPress: async () => { try { await api.delete('/auth/me'); onLogout(); } catch (e) { customAlert('Error', 'Gagal hapus akun'); } } }]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1565C0" /></View>;

  const phoneIconColor = phoneFocused ? '#1565C0' : '#888';
  const phoneBorderColor = phoneFocused ? '#1565C0' : '#E8ECF0';

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil Toko</Text>
        <TouchableOpacity 
          onPress={handleSimpan} 
          disabled={!isModified || saving} 
          activeOpacity={0.7} 
          style={[styles.headerSaveBtn, !isModified && styles.headerSaveBtnDisabled]}
        >
          {saving ? <ActivityIndicator size="small" color={isModified ? "#1565C0" : "#A0A0A0"} /> : <Text style={[styles.headerSaveText, !isModified && styles.headerSaveTextDisabled]}>Simpan</Text>}
        </TouchableOpacity>
      </View>

      {/* 🔥 Pasang ScrollView Ref di sini */}
      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.centeredProfileSection}>
          <TouchableOpacity onPress={() => setFullImageModalVisible(true)} activeOpacity={0.9}>
            {fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}><Ionicons name="storefront" size={44} color="#A0A0A0" /></View>
            )}
          </TouchableOpacity>
        </View>

        {/* SECTION 1: INFORMASI PRIBADI */}
        <Text style={styles.formSectionHeading}>Informasi Pribadi</Text>
        <View style={styles.formSectionFields}>
          <ProfileInput iconName="person-outline" placeholder="Nama Lengkap" value={nama} onChangeText={setNama} />
          <ProfileInput iconName="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          
          <View style={styles.inputRow}>
            <View style={styles.iconContainer}><Ionicons name="call-outline" size={22} color={phoneIconColor} /></View>
            <View style={styles.phoneRowWrapper}>
                 <TextInput 
                    style={[styles.phoneInputStyle, { borderBottomColor: phoneBorderColor }]} 
                    keyboardType="phone-pad" value={noHp} onChangeText={(t) => setNoHp(t.replace(/[^0-9]/g, ''))} 
                    placeholder="08123..." placeholderTextColor="#aaa" onFocus={() => setPhoneFocused(true)} onBlur={() => setPhoneFocused(false)}
                 />
            </View>
          </View>
        </View>

        {/* SECTION 2: INFORMASI TOKO */}
        <Text style={[styles.formSectionHeading, { marginTop: 16 }]}>Informasi Toko</Text>
        <View style={styles.formSectionFields}>
          <ProfileInput iconName="storefront-outline" placeholder="Nama Toko" value={namaToko} onChangeText={setNamaToko} />
          
          <View style={styles.kategoriSection}>
            <View style={styles.iconContainer}><Ionicons name="grid-outline" size={22} color="#888" /></View>
            <View style={styles.kategoriContent}>
              <View style={styles.kategoriGrid}>
                {KATEGORI_LIST.map((kat) => {
                  const isSelected = kategoriArr.includes(kat);
                  return (
                    <TouchableOpacity key={kat} style={[styles.kategoriChip, isSelected && styles.kategoriChipActive]} onPress={() => toggleKategori(kat)} activeOpacity={0.7}>
                      <Text style={[styles.kategoriChipText, isSelected && styles.kategoriChipTextActive]}>{kat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <ProfileInput iconName="document-text-outline" placeholder="Deskripsi Singkat" value={deskripsi} onChangeText={setDeskripsi} />

          <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <ProfileInput iconName="time-outline" placeholder="Jam Buka (07:00)" value={jamBuka} onChangeText={setJamBuka} />
            </View>
            <View style={{ flex: 1 }}>
              <ProfileInput iconName="time-outline" placeholder="Jam Tutup (16:00)" value={jamTutup} onChangeText={setJamTutup} />
            </View>
          </View>
        </View>

        {/* SECTION 3: PEMBAYARAN */}
        {/* 🔥 Tambahin onLayout biar kita tau koordinat Y dari tulisan Pembayaran ini */}
        <Text 
          style={[styles.formSectionHeading, { marginTop: 16 }]}
          onLayout={(event) => setPembayaranY(event.nativeEvent.layout.y)}
        >
          Pembayaran
        </Text>
        <View style={styles.formSectionFields}>
          
          <Text style={styles.pembayaranSubHeading}>Rekening Bank</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <ProfileInput iconName="business-outline" placeholder="Bank (BCA)" value={bank} onChangeText={setBank} />
            </View>
            <View style={{ flex: 1 }}>
              <ProfileInput iconName="card-outline" placeholder="No Rekening" value={norek} onChangeText={setNorek} keyboardType="numeric" />
            </View>
          </View>
          <ProfileInput iconName="person-circle-outline" placeholder="Atas Nama" value={atasNama} onChangeText={setAtasNama} />
          
          <Text style={[styles.pembayaranSubHeading, { marginTop: 16 }]}>QRIS</Text>
          <View style={styles.qrisSection}>
            <View style={styles.iconContainer}><Ionicons name="qr-code-outline" size={22} color="#888" /></View>
            <View style={styles.qrisContent}>
              <TouchableOpacity 
                style={[styles.qrisBox, qrisUrl && styles.qrisBoxSolid]} 
                onPress={() => qrisUrl ? setQrisModalVisible(true) : handleUploadQris()} 
                activeOpacity={0.8}
              >
                {qrisUrl ? (
                  <Image source={{ uri: qrisUrl }} style={styles.qrisPreview} resizeMode="contain" />
                ) : (
                  <View style={styles.qrisPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={32} color="#1565C0" />
                    <Text style={styles.qrisLabel}>Upload Barcode QRIS</Text>
                  </View>
                )}
              </TouchableOpacity>
              {qrisUrl && (
                <View style={styles.qrisActionRow}>
                  <TouchableOpacity onPress={handleUploadQris}><Text style={styles.qrisActionText}>Ubah QRIS</Text></TouchableOpacity>
                  <Text style={styles.qrisActionSeparator}>|</Text>
                  <TouchableOpacity onPress={() => { setQrisUrl(null); setNewQrisBase64(null); setIsQrisDeleted(true); }}><Text style={[styles.qrisActionText, {color: '#D32F2F'}]}>Hapus</Text></TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* SECTION 4: GANTI PASSWORD */}
        <Text style={[styles.formSectionHeading, { marginTop: 16 }]}>Ganti Password</Text>
        <View style={styles.formSectionFields}>
          <ProfileInput iconName="lock-closed-outline" placeholder="Password Lama" value={passwordLama} onChangeText={setPasswordLama} secureTextEntry={true} showEyeToggle={true} />
          <ProfileInput iconName="key-outline" placeholder="Password Baru" value={passwordBaru} onChangeText={setPasswordBaru} secureTextEntry={true} showEyeToggle={true} />
        </View>

        {/* SECTION 5: ZONA BAHAYA */}
        <Text style={[styles.formSectionHeading, { marginTop: 24, color: '#C62828' }]}>Zona Bahaya</Text>
        <View style={styles.dangerZoneContainer}>
          <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccountAction} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color="#D32F2F" style={{ marginRight: 16 }} />
            <Text style={styles.dangerText}>Hapus Akun Permanen</Text>
          </TouchableOpacity>
          <View style={styles.dangerDivider} />
          <TouchableOpacity style={styles.dangerItem} onPress={handleLogoutAction} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#D32F2F" style={{ marginRight: 16 }} />
            <Text style={styles.dangerText}>Keluar Akun</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} /> 
      </ScrollView>

      {/* MODAL FOTO DETAIL (TOKO) */}
      <Modal visible={fullImageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setFullImageModalVisible(false)}>
        <View style={styles.modalBackground}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setFullImageModalVisible(false)} activeOpacity={1} />
          <View style={styles.modalContent}>
            {fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={styles.fullImageAvatar} resizeMode="cover" />
            ) : (
              <View style={styles.fullImageAvatarPlaceholder}><Ionicons name="storefront" size={90} color="#A0A0A0" /></View>
            )}
            <TouchableOpacity onPress={handleUbahFotoClick} activeOpacity={0.7} style={{ padding: 10 }}>
              <Text style={styles.modalUbahFotoText}>Ubah Foto Toko</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setFullImageModalVisible(false)} activeOpacity={1} />
        </View>
      </Modal>

      {/* MODAL FOTO DETAIL (QRIS KOTAK) */}
      <Modal visible={qrisModalVisible} transparent={true} animationType="fade" onRequestClose={() => setQrisModalVisible(false)}>
        <View style={styles.modalBackground}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setQrisModalVisible(false)} activeOpacity={1} />
          <View style={styles.modalContent}>
            {qrisUrl && (
              <View style={styles.fullImageQrisWrapper}>
                <Image source={{ uri: qrisUrl }} style={styles.fullImageQris} resizeMode="contain" />
              </View>
            )}
            <TouchableOpacity onPress={handleUbahQrisClick} activeOpacity={0.7} style={{ padding: 10 }}>
              <Text style={styles.modalUbahFotoText}>Ubah Barcode QRIS</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseArea} onPress={() => setQrisModalVisible(false)} activeOpacity={1} />
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  headerSaveBtn: { paddingVertical: 6, paddingHorizontal: 18, backgroundColor: '#F0F4FF', borderRadius: 20 },
  headerSaveBtnDisabled: { backgroundColor: '#F5F5F5' },
  headerSaveText: { fontSize: 14, fontWeight: '700', color: '#1565C0' },
  headerSaveTextDisabled: { color: '#A0A0A0' },
  
  scrollContent: { paddingTop: 20 }, 
  
  centeredProfileSection: { alignItems: 'center', marginBottom: 24, marginTop: 4 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderColor: '#E8ECF0' }, 
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8ECF0' },
  
  formSectionHeading: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 24, marginTop: 16, marginBottom: 12 },
  formSectionFields: { paddingHorizontal: 24, marginBottom: 8 }, 
  
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconContainer: { width: 44, justifyContent: 'center', alignItems: 'flex-start', marginTop: 4 }, 
  
  textInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 14 },
  textInputStyle: { flex: 1, fontSize: 16, color: '#1a1a1a', padding: 0, margin: 0 },
  multilineStyle: { minHeight: 60, textAlignVertical: 'top', paddingTop: 4, paddingBottom: 10 },
  eyeIconBtn: { padding: 4, marginLeft: 8 }, 

  phoneRowWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  phoneInputInner: { flex: 1 },
  phoneInputStyle: { flex: 1, fontSize: 16, color: '#1a1a1a', padding: 0, margin: 0, borderBottomWidth: 1, paddingBottom: 14 },

  kategoriSection: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, marginBottom: 6 },
  kategoriContent: { flex: 1 },
  kategoriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kategoriChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: '#F5F7FA', borderWidth: 1, borderColor: '#E8ECF0' },
  kategoriChipActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  kategoriChipText: { fontSize: 13, fontWeight: '600', color: '#666' },
  kategoriChipTextActive: { color: '#fff' },

  pembayaranSubHeading: { fontSize: 12, fontWeight: '700', color: '#888', letterSpacing: 1, marginBottom: 8},
  qrisSection: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  qrisContent: { flex: 1 },
  
  qrisBox: { width: 160, height: 160, backgroundColor: '#F5F7FA', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#1565C0', overflow: 'hidden' },
  qrisBoxSolid: { borderStyle: 'solid', borderColor: '#E8ECF0', borderWidth: 1, backgroundColor: '#fff' }, 
  qrisPreview: { width: '100%', height: '100%' },
  qrisPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  qrisLabel: { fontSize: 12, fontWeight: '600', color: '#1565C0', marginTop: 8, marginBottom: 4 },
  qrisActionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  qrisActionText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  qrisActionSeparator: { marginHorizontal: 8, color: '#ccc' },

  dangerZoneContainer: { marginHorizontal: 24, backgroundColor: '#FFEBEE', borderRadius: 16, paddingHorizontal: 16 },
  dangerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  dangerText: { fontSize: 15, fontWeight: '600', color: '#D32F2F' },
  dangerDivider: { height: 1, backgroundColor: '#FFCDD2', marginLeft: 36 },

  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', flexDirection: 'column', justifyContent: 'center' },
  modalCloseArea: { flex: 1 },
  modalContent: { alignItems: 'center', paddingVertical: 20 },
  fullImageAvatar: { width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: '#E8ECF0' }, 
  fullImageAvatarPlaceholder: { width: 220, height: 220, borderRadius: 110, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#555' },
  
  fullImageQrisWrapper: { width: 320, height: 320, backgroundColor: '#fff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  fullImageQris: { width: '100%', height: '100%' },
  
  modalUbahFotoText: { marginTop: 24, fontSize: 15, fontWeight: '700', color: '#fff', textDecorationLine: 'underline' }
});