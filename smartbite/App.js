import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, Platform, Alert, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { api } from './src/service/api';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { CartProvider } from './src/context/CartContext';
import FloatingCart from './src/component/FloatingCart';
import LoginScreen from './src/screen/LoginScreen';
import RegisterScreen from './src/screen/RegisterScreen';
import RolePickerScreen from './src/screen/RolePickerScreen';
import RegisterVendorScreen from './src/screen/RegisterVendorScreen';
import PendingVendorScreen from './src/screen/PendingVendorScreen';
import HomeScreen from './src/screen/HomeScreen';
import DetailTokoScreen from './src/screen/DetailTokoScreen';
import KeranjangScreen from './src/screen/KeranjangScreen';
import CheckoutScreen from './src/screen/CheckoutScreen';
import StatusOrderScreen from './src/screen/StatusOrderScreen';
import ChatScreen from './src/screen/ChatScreen';
import ProfilScreen from './src/screen/ProfilScreen';
import AktivitasScreen from './src/screen/AktivitasScreen';
import SearchScreen from './src/screen/SearchScreen';
import UlasanScreen from './src/screen/UlasanScreen';
import SplashScreen from './src/screen/SplashScreen';
import EditProfilScreen from './src/screen/EditProfilScreen';
import RoomChatScreen from './src/screen/RoomChatScreen';

import VendorDashboardScreen from './src/screen/vendor/VendorDashboardScreen';
import VendorPesananScreen from './src/screen/vendor/VendorPesananScreen';
import VendorMenuScreen from './src/screen/vendor/VendorMenuScreen';
import VendorTokoScreen from './src/screen/vendor/VendorTokoScreen';
import VendorProfilScreen from './src/screen/vendor/VendorProfilScreen';
import VendorAddMenuScreen from './src/screen/vendor/VendorAddMenuScreen';
import VendorEditMenuScreen from './src/screen/vendor/VendorEditMenuScreen';
import VendorDetailPesananScreen from './src/screen/vendor/VendorDetailPesananScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTab({ onLogout }) {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF', position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 80, borderTopLeftRadius: 40, borderTopRightRadius: 40, borderTopWidth: 0,
            elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 10,
          },
          tabBarActiveTintColor: '#1565C0', tabBarInactiveTintColor: '#A0A0A0', 
          tabBarIcon: ({ focused, color }) => {
            let iconName;
            if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'Aktivitas') iconName = focused ? 'receipt' : 'receipt-outline';
            else if (route.name === 'Chat') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
            else if (route.name === 'Profil') iconName = focused ? 'person' : 'person-outline';

            if (route.name === 'KeranjangTab') {
              return (
                <View style={{ top: -2, justifyContent: 'center', alignItems: 'center', width: 58, height: 58, borderRadius: 29, backgroundColor: '#1565C0', borderWidth: 4, borderColor: '#FFFFFF' }}>
                  <Ionicons name="cart" size={24} color="#FFFFFF" />
                </View>
              );
            }
            return (
              <View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ translateY: 10 }] }}>
                <Ionicons name={iconName} size={24} color={color} />
              </View>
            );
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Beranda', tabBarLabelStyle: styles.labelStyle }} />
        <Tab.Screen name="Aktivitas" component={AktivitasScreen} options={{ tabBarLabel: 'Pesanan', tabBarLabelStyle: styles.labelStyle }} />
        
        {/* 🔥 GAK ADA LAGI TRIK LISTENER! Langsung pasang KeranjangScreen di sini biar bottom nav-nya tetap ada */}
        <Tab.Screen name="KeranjangTab" component={KeranjangScreen} options={{ tabBarLabel: 'Keranjang', tabBarLabelStyle: styles.labelStyle }} />
        
        <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: 'Chat', tabBarLabelStyle: styles.labelStyle }} />
        <Tab.Screen name="Profil" options={{ tabBarLabel: 'Profil', tabBarLabelStyle: styles.labelStyle }}>
          {props => <ProfilScreen {...props} onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
      
      <FloatingCart bottom={95} />
    </View>
  );
}

function VendorTab({ onLogout }) { 
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF', position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
          borderTopLeftRadius: 40, borderTopRightRadius: 40, borderTopWidth: 0, elevation: 15,
        },
        tabBarActiveTintColor: '#1565C0', tabBarInactiveTintColor: '#A0A0A0',
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'VendorDashboard') iconName = focused ? 'home' : 'home-outline'; 
          else if (route.name === 'VendorMenu') iconName = focused ? 'fast-food' : 'fast-food-outline'; 
          else if (route.name === 'VendorPesanan') iconName = 'receipt'; 
          else if (route.name === 'VendorChat') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline'; 
          else if (route.name === 'VendorProfil') iconName = focused ? 'person' : 'person-outline'; 

          if (route.name === 'VendorPesanan') {
            return (
              <View style={{ top: -10, justifyContent: 'center', alignItems: 'center', width: 58, height: 58, borderRadius: 29, backgroundColor: '#1565C0', borderWidth: 4, borderColor: '#FFFFFF' }}>
                <Ionicons name={iconName} size={24} color="#FFFFFF" />
              </View>
            );
          }
          return (
            <View style={{ alignItems: 'center', justifyContent: 'center', transform: [{ translateY: 10 }] }}>
              <Ionicons name={iconName} size={24} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="VendorDashboard" component={VendorDashboardScreen} options={{ tabBarLabel: 'Beranda', tabBarLabelStyle: styles.labelStyle }} />
      <Tab.Screen name="VendorMenu"      component={VendorMenuScreen}      options={{ tabBarLabel: 'Menu', tabBarLabelStyle: styles.labelStyle }} />
      <Tab.Screen name="VendorPesanan"   component={VendorPesananScreen}   options={{ tabBarLabel: 'Pesanan', tabBarLabelStyle: styles.labelStyle }} />
      <Tab.Screen name="VendorChat"      component={ChatScreen}            options={{ tabBarLabel: 'Chat', tabBarLabelStyle: styles.labelStyle }} />
      <Tab.Screen name="VendorProfil" options={{ tabBarLabel: 'Profil', tabBarLabelStyle: styles.labelStyle }}>
        {props => <VendorProfilScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      let token = Platform.OS === 'web' ? localStorage.getItem('userToken') : await SecureStore.getItemAsync('userToken');
      let userData = Platform.OS === 'web' ? localStorage.getItem('userData') : await SecureStore.getItemAsync('userData');
      if (token && userData) {
        const parsed = JSON.parse(userData);
        setSession(token);
        setRole(parsed.role);
      }
    } catch (e) {}
    setLoading(false);
  };

  const handleLoginSuccess = async (token, user) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('userToken', token);
        localStorage.setItem('userData', JSON.stringify(user));
      } else {
        await SecureStore.setItemAsync('userToken', token);
        await SecureStore.setItemAsync('userData', JSON.stringify(user));
      }
      setSession(token);
      setRole(user.role);
    } catch (error) {}
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('userToken');
      localStorage.removeItem('userData');
    } else {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
    }
    setSession(null);
    setRole(null);
  };

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 60, marginBottom: 20 }}>🍱</Text>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return (
    <CartProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <>
              <Stack.Screen name="Login">
                {props => <LoginScreen {...props} onLogin={handleLoginSuccess} />}
              </Stack.Screen>
              <Stack.Screen name="RolePicker"     component={RolePickerScreen} />
              <Stack.Screen name="Register"       component={RegisterScreen} />
              <Stack.Screen name="RegisterVendor" component={RegisterVendorScreen} />
            </>
          ) : role === 'pending_vendor' ? (
            <>
              <Stack.Screen name="PendingVendor">
                {props => <PendingVendorScreen {...props} onLogout={handleLogout} />}
              </Stack.Screen>
            </>
          ) : role === 'vendor' ? (
            <>
              <Stack.Screen name="VendorMain">
                {props => <VendorTab {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen name="VendorToko"          component={VendorTokoScreen} />
              <Stack.Screen name="VendorDetailPesanan" component={VendorDetailPesananScreen} />
              <Stack.Screen name="VendorAddMenu"       component={VendorAddMenuScreen} />
              <Stack.Screen name="VendorEditMenu"      component={VendorEditMenuScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Main">
                {props => <MainTab {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              
              {/* Ini versi Stack-nya, dipanggil khusus kalo dipencet dari DetailToko atau FloatingCart */}
              <Stack.Screen name="Keranjang"   component={KeranjangScreen} />
              
              <Stack.Screen name="DetailToko"  component={DetailTokoScreen} />
              <Stack.Screen name="Checkout"    component={CheckoutScreen} />
              <Stack.Screen name="StatusOrder" component={StatusOrderScreen} />
              <Stack.Screen name="Search"      component={SearchScreen} />
              <Stack.Screen name="Ulasan"      component={UlasanScreen} />
              <Stack.Screen name="EditProfil"  component={EditProfilScreen} />
              <Stack.Screen name="RoomChat" component={RoomChatScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}

const styles = StyleSheet.create({
  labelStyle: { fontSize: 10, fontWeight: '600', marginTop: 12 }
});