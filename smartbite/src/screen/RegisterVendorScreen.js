import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
  ActivityIndicator, Image, ActionSheetIOS
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api, setToken } from '../service/api';
import { customAlert } from '../utils/alerthelper';

const KATEGORI_LIST = ['Nasi', 'Mie', 'Snack', 'Minuman', 'Masakan Rumahan', 'Lainnya'];

const VendorInput = ({ 
  iconName, placeholder, value, onChangeText, secureTextEntry, 
  keyboardType, autoCapitalize, showEyeToggle, warningText 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [passwordShown, setPasswordShown] = useState(!secureTextEntry);

  const iconColor = isFocused ? '#1565C0' : '#888';
  const borderBottomColor = isFocused ? '#1565C0' : '#E8ECF0';

  return (
    <View style={styles.inputRow}>
      <View style={styles.iconContainer}>
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>
      <View style={[styles.textInputWrapper, { borderBottomColor }]}>
        <TextInput
          style={styles.textInputStyle}
          placeholder={placeholder}
          placeholderTextColor="#aaa"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={showEyeToggle ? !passwordShown : secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoComplete="off"
          textContentType="none"
          autoCorrect={false}
        />
        
        {warningText ? (
          <View style={styles.inlineWarningRow}>
            <Ionicons name="warning-outline" size={14} color="#EF5350" />
            <Text style={styles.inlineWarningText}>{warningText}</Text>
          </View>
        ) : null}

        {showEyeToggle && (
           <TouchableOpacity onPress={() => setPasswordShown(!passwordShown)} style={styles.eyeIconBtn}>
             <Ionicons name={passwordShown ? "eye-outline" : "eye-off-outline"} size={20} color="#aaa" />
           </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function RegisterVendorScreen({ navigation }) {
  const [step, setStep] = useState(1);

  // ── Tahap 1: Data Diri ──
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [fotoKtp, setFotoKtp] = useState(null);
  const [fotoDiri, setFotoDiri] = useState(null);
  const [uploadingKtp, setUploadingKtp] = useState(false);
  const [uploadingDiri, setUploadingDiri] = useState(false);

  // ── Tahap 2: Data Toko ──
  const [namaToko, setNamaToko] = useState('');
  const [kategori, setKategori] = useState([]); 
  const [deskripsi, setDeskripsi] = useState('');
  const [fotoToko, setFotoToko] = useState(null);
  const [uploadingToko, setUploadingToko] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleUploadClick = (type) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Upload Foto',
          options: ['Buka Kamera', 'Dari Galeri', 'Batal'],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) uploadFoto(type, true);
          else if (buttonIndex === 1) uploadFoto(type, false);
        }
      );
    } else {
      Alert.alert("Upload Foto", "Pilih sumber foto", [
        { text: 'Buka Kamera', onPress: () => uploadFoto(type, true) },
        { text: 'Dari Galeri', onPress: () => uploadFoto(type, false) },
        { text: 'Batal', style: 'cancel' }
      ], { cancelable: true });
    }
  };

  const uploadFoto = async (type, useCamera) => {
    const perm = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) { customAlert('Izin Diperlukan', 'Izinkan akses untuk unggah foto.'); return; }

    if (type === 'ktp') setUploadingKtp(true);
    else if (type === 'diri') setUploadingDiri(true);
    else setUploadingToko(true);

    try {
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, 
        aspect: type === 'ktp' ? [16, 9] : [1, 1], 
        quality: 0.1, 
        base64: true  
      };
      
      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      
      if (!result.canceled) {
        const base64String = `data:image/jpeg;base64,${result.assets[0].base64}`;
        if (type === 'ktp') setFotoKtp(base64String);
        else if (type === 'diri') setFotoDiri(base64String);
        else setFotoToko(base64String);
      }
    } catch (e) {
      Alert.alert('Error', 'Gagal memproses foto');
    } finally {
      if (type === 'ktp') setUploadingKtp(false);
      else if (type === 'diri') setUploadingDiri(false);
      else setUploadingToko(false);
    }
  };

  const toggleKategori = (kat) => {
    if (kategori.includes(kat)) {
      setKategori(kategori.filter(item => item !== kat));
    } else {
      setKategori([...kategori, kat]);
    }
  };

  const handleNext = () => {
    if (!nama || !email || !noHp || !password || !konfirmasi || !fotoKtp || !fotoDiri) {
      Alert.alert('Oops!', 'Semua data dan foto wajib diisi untuk verifikasi!'); return;
    }
    if (noHp.length < 9) { Alert.alert('Oops!', 'Nomor HP minimal 9 angka ya!'); return; }
    if (password !== konfirmasi) { Alert.alert('Oops!', 'Password dan konfirmasi tidak sama!'); return; }
    if (password.length < 6) { Alert.alert('Oops!', 'Password minimal 6 karakter!'); return; }
    
    setStep(2);
  };

  const handleRegisterVendor = async () => {
    if (!namaToko.trim() || kategori.length === 0 || !fotoToko) {
      Alert.alert('Oops!', 'Nama toko, kategori, dan foto toko wajib diisi ya!');
      return;
    }

    setLoading(true);

    try {
      const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
      await api.post('/auth/register', {
        nama: nama.trim(),
        username: username.toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        no_hp: noHp.trim(),
        role: 'pending_vendor'
      });

      const loginRes = await api.post('/auth/login', {
        identifier: email.trim().toLowerCase(),
        password
      });
      const token = loginRes.data.token;
      await setToken(token);

      const kategoriString = kategori.join(', ');
      await api.post('/toko', {
        nama: namaToko.trim(),
        kategori: kategoriString,
        deskripsi: deskripsi.trim() || `Selamat datang di ${namaToko.trim()}!`,
        foto_url: fotoToko,
        foto_ktp: fotoKtp,   
        foto_diri: fotoDiri  
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      customAlert('Berhasil! 🎉', 'Pendaftaran Mitra berhasil! Tim kami akan segera memverifikasi tokomu.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);

    } catch (error) {
      console.log("ERROR DETAIL:", error.message);
      const errorMsg = error.response?.data?.message || 'Gagal mendaftar, cek koneksi internetmu.';
      customAlert('Registrasi Gagal', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={{ flex: 1 }} bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <LinearGradient colors={['#1565C0', '#42A5F5']} style={styles.header}>
          {step === 2 && (
            <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)} activeOpacity={0.8}>
               <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
          )}
          <Ionicons name="create-outline" size={60} color="#fff" style={{ marginBottom: 12 }} />
          <Text style={styles.appName}>Buat Akun Penjual</Text>
          <Text style={styles.tagline}>Buka toko dan capai lebih banyak pembeli!</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          
          <View style={styles.stepRow}>
            {[
              { n: 1, label: 'Data Diri' },
              { n: 2, label: 'Data Toko' },
            ].map(({ n, label }, i) => (
              <View key={n} style={styles.stepItem}>
                <View style={[styles.stepCircle, step >= n && styles.stepCircleActive, step > n && styles.stepCircleDone]}>
                  {step > n ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : (
                    <Text style={[styles.stepNum, step >= n && styles.stepNumActive]}>{n}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, step >= n && styles.stepLabelActive]}>{label}</Text>
                {i < 1 && <View style={[styles.stepLine, step > n && styles.stepLineActive]} />}
              </View>
            ))}
          </View>

          {/* ────────── STEP 1: DATA DIRI & DOKUMEN ────────── */}
          {step === 1 && (
            <View>
              <VendorInput 
                iconName="person-outline" 
                placeholder="Nama Lengkap" 
                value={nama} 
                onChangeText={setNama} 
              />
              <View style={{ height: 8 }} />
              <VendorInput 
                iconName="at-outline" 
                placeholder="Email" 
                value={email} 
                onChangeText={setEmail} 
                keyboardType="email-address" 
                autoCapitalize="none" 
              />
              <View style={{ height: 8 }} />
              <VendorInput 
                iconName="call-outline" 
                placeholder="Nomor Handphone" 
                value={noHp} 
                onChangeText={(t) => setNoHp(t.replace(/[^0-9]/g, ''))} 
                keyboardType="phone-pad" 
                warningText={(noHp.length > 0 && noHp.length < 9) ? "Minimal 9 angka" : null}
              />
              <View style={{ height: 8 }} />
              <VendorInput 
                iconName="lock-closed-outline" 
                placeholder="Password (Min. 6 karakter)" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry={true} 
                showEyeToggle={true} 
              />
              <View style={{ height: 8 }} />
              <VendorInput 
                iconName="shield-checkmark-outline" 
                placeholder="Ulangi Password" 
                value={konfirmasi} 
                onChangeText={setKonfirmasi} 
                secureTextEntry={true} 
                showEyeToggle={true} 
              />

              <View style={styles.warningBanner}>
                <Ionicons name="shield-checkmark" size={24} color="#F57F17" />
                <Text style={styles.warningText}>Data KTP dan foto diri diperlukan untuk verifikasi keamanan. Data Anda terenkripsi.</Text>
              </View>

              <View style={styles.uploadSection}>
                <Text style={styles.uploadTitle}>Foto Diri</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={() => handleUploadClick('diri')} activeOpacity={0.8}>
                  {uploadingDiri ? <ActivityIndicator color="#1565C0" /> : fotoDiri ? (
                    <Image source={{ uri: fotoDiri }} style={styles.uploadPreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={36} color="#1565C0" />
                      <Text style={styles.uploadLabel}>Upload Foto Diri</Text>
                      <Text style={styles.uploadSub}>Wajah harus terlihat jelas</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {fotoDiri && (
                  <TouchableOpacity onPress={() => handleUploadClick('diri')}>
                    <Text style={styles.gantiFotoText}>Ubah foto diri</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.uploadSection}>
                <Text style={styles.uploadTitle}>Foto KTP</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={() => handleUploadClick('ktp')} activeOpacity={0.8}>
                  {uploadingKtp ? <ActivityIndicator color="#1565C0" /> : fotoKtp ? (
                    <Image source={{ uri: fotoKtp }} style={styles.uploadPreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={36} color="#1565C0" />
                      <Text style={styles.uploadLabel}>Upload Foto KTP</Text>
                      <Text style={styles.uploadSub}>Tulisan pada KTP harus terbaca</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {fotoKtp && (
                  <TouchableOpacity onPress={() => handleUploadClick('ktp')}>
                    <Text style={styles.gantiFotoText}>Ubah foto KTP</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* ────────── STEP 2: DATA TOKO ────────── */}
          {step === 2 && (
            <View>
              <VendorInput iconName="storefront-outline" placeholder="Nama Toko (Contoh: Warung Bu Sari)" value={namaToko} onChangeText={setNamaToko} />
              
              <View style={styles.kategoriSection}>
                <View style={styles.iconContainer}>
                  <Ionicons name="grid-outline" size={22} color="#888" />
                </View>
                <View style={styles.kategoriContent}>
                  <Text style={styles.sectionLabel}>Pilih Kategori (Bisa lebih dari 1)</Text>
                  <View style={styles.kategoriGrid}>
                    {KATEGORI_LIST.map((kat) => {
                      const isSelected = kategori.includes(kat);
                      return (
                        <TouchableOpacity 
                          key={kat} 
                          style={[styles.kategoriChip, isSelected && styles.kategoriChipActive]} 
                          onPress={() => toggleKategori(kat)} 
                          activeOpacity={0.7}
                        >
                          {isSelected && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />}
                          <Text style={[styles.kategoriChipText, isSelected && styles.kategoriChipTextActive]}>{kat}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={{ height: 8 }} />

              <VendorInput 
                iconName="document-text-outline" 
                placeholder="Deskripsi singkat toko..." 
                value={deskripsi} 
                onChangeText={setDeskripsi} 
              />

              <View style={{ height: 24 }} />

              <View style={styles.uploadSection}>
                <Text style={styles.uploadTitle}>Foto Toko / Logo</Text>
                <TouchableOpacity style={styles.uploadBox} onPress={() => handleUploadClick('toko')} activeOpacity={0.8}>
                  {uploadingToko ? <ActivityIndicator color="#1565C0" /> : fotoToko ? (
                    <Image source={{ uri: fotoToko }} style={styles.uploadPreview} resizeMode="cover" />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={36} color="#1565C0" />
                      <Text style={styles.uploadLabel}>Upload Foto Toko</Text>
                      <Text style={styles.uploadSub}>Agar pelanggan mudah mengenali</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {fotoToko && (
                  <TouchableOpacity onPress={() => handleUploadClick('toko')}>
                    <Text style={styles.gantiFotoText}>Ubah foto toko</Text>
                  </TouchableOpacity>
                )}
              </View>

            </View>
          )}

          <View style={{ flex: 1, minHeight: 30 }} />

          <View style={styles.bottomArea}>
            {step === 1 ? (
              <TouchableOpacity style={styles.mainButton} onPress={handleNext} activeOpacity={0.8}>
                <LinearGradient colors={['#1565C0', '#42A5F5']} style={styles.mainButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={styles.mainButtonText}>Lanjut ke Data Toko</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.mainButton} onPress={handleRegisterVendor} disabled={loading} activeOpacity={0.8}>
                <LinearGradient colors={loading ? ['#B0BEC5', '#CFD8DC'] : ['#1565C0', '#42A5F5']} style={styles.mainButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.mainButtonText}>Dafter</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Sudah punya akun? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
                <Text style={styles.loginLink}>Masuk di sini</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { flexGrow: 1 }, 
  
  header: { height: 280, justifyContent: 'center', alignItems: 'center', paddingTop: 20 },
  illustrationEmoji: { fontSize: 55, marginBottom: 8 },
  appName: { fontSize: 26, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5, marginBottom: 6 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  
  backButton: { 
    position: 'absolute', top: 50, left: 16, width: 36, height: 36, borderRadius: 18, 
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 
  },

  formContainer: { 
    flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, 
    marginTop: -24, paddingHorizontal: 28, paddingTop: 32, paddingBottom: 30 
  },

  stepRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  stepCircleActive: { backgroundColor: '#E3F2FD', borderColor: '#1565C0' },
  stepCircleDone: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  stepNum: { fontSize: 12, fontWeight: 'bold', color: '#888' },
  stepNumActive: { color: '#1565C0' },
  stepLabel: { fontSize: 12, color: '#888', marginLeft: 8, fontWeight: '600' },
  stepLabelActive: { color: '#1565C0' },
  stepLine: { width: 50, height: 2, backgroundColor: '#E0E0E0', marginHorizontal: 12 },
  stepLineActive: { backgroundColor: '#1565C0' },

  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconContainer: { width: 44, justifyContent: 'center', alignItems: 'flex-start', marginTop: 4 }, 
  textInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 14 }, 
  textInputStyle: { flex: 1, fontSize: 16, color: '#1a1a1a', padding: 0, margin: 0 }, 
  eyeIconBtn: { padding: 4, marginLeft: 8 }, 
  
  inlineWarningRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, gap: 4 },
  inlineWarningText: { fontSize: 12, color: '#EF5350', fontWeight: '500' },

  kategoriSection: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, marginBottom: 16 },
  kategoriContent: { flex: 1, paddingBottom: 10 },
  sectionLabel: { fontSize: 16, color: '#aaa', marginBottom: 12, marginTop: 4 },
  kategoriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kategoriChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: '#F5F7FA', borderWidth: 1, borderColor: '#E8ECF0' },
  kategoriChipActive: { backgroundColor: '#1565C0', borderColor: '#1565C0' },
  kategoriChipText: { fontSize: 13, fontWeight: '600', color: '#666' },
  kategoriChipTextActive: { color: '#fff' },

  warningBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14, marginTop: 12, marginBottom: 24, borderWidth: 1, borderColor: '#FFE082', gap: 10 },
  warningText: { flex: 1, fontSize: 12, color: '#F57F17', lineHeight: 18 },
  
  uploadSection: { alignItems: 'center', marginBottom: 20 },
  uploadTitle: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 12 },
  uploadBox: { width: '100%', backgroundColor: '#F5F7FA', borderRadius: 16, height: 150, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#1565C0', overflow: 'hidden' },
  uploadPreview: { width: '100%', height: '100%' },
  uploadPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  uploadLabel: { fontSize: 14, fontWeight: '600', color: '#1565C0', marginTop: 8, marginBottom: 4 },
  uploadSub: { fontSize: 12, color: '#888' },
  gantiFotoText: { fontSize: 13, color: '#1565C0', fontWeight: '600', marginTop: 12, textDecorationLine: 'underline' },

  bottomArea: { width: '100%' },
  mainButton: { borderRadius: 100, overflow: 'hidden', elevation: 6, shadowColor: '#1565C0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  mainButtonGradient: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  mainButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 }, 
  loginText: { fontSize: 14, color: '#888' },
  loginLink: { fontSize: 14, color: '#1565C0', fontWeight: 'bold' },
});