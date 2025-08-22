import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Image } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../hooks/useDarkMode';
import { USER_KEY, BASE_URL } from '../constants';

import TabNavigator from './TabNavigator';
import SettingsStackNavigator from './SettingsStackNavigator';
import CategoriesStackNavigator from './CategoriesStackNavigator';
import ProfileScreen from '../screens/settings/ProfileScreen';
import StatisticsScreen from '../screens/settings/StatisticsScreen';
import HelpScreen from '../screens/settings/HelpScreen';

// Enhanced feature screens
import SocialFeedScreen from '../screens/social/SocialFeedScreen';
import CameraScreen from '../screens/media/CameraScreen';
import PhotoGalleryScreen from '../screens/media/PhotoGalleryScreen';



const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props) => {
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const { logout, user } = useAuth();
  
  const [userProfile, setUserProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    initials: 'JD',
    profilePicture: null
  });

  // Function to get initials from name
  const getInitials = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return 'JD';
    
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
    if (nameParts.length === 0) return 'JD';
    
    if (nameParts.length === 1) {
      // Single name - take first two characters
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    
    // Multiple names - take first letter of first and last name
    const firstInitial = nameParts[0].charAt(0);
    const lastInitial = nameParts[nameParts.length - 1].charAt(0);
    return (firstInitial + lastInitial).toUpperCase();
  };

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        console.log('=== DRAWER NAVIGATION DEBUG ===');
        console.log('Loading user profile for drawer...');
        
        // Try to load from AsyncStorage first (use same key as AuthContext)
        const storedProfile = await AsyncStorage.getItem(USER_KEY);
        if (storedProfile) {
          const profileData = JSON.parse(storedProfile);
          console.log('Found stored profile for drawer:', profileData);
          console.log('Drawer profile picture:', profileData.profilePicture);
          
          const name = profileData.name || 'John Doe';
          const email = profileData.email || 'john.doe@example.com';
          const initials = getInitials(name);
          const profilePicture = profileData.profilePicture || null;
          
          setUserProfile({ name, email, initials, profilePicture });
        } else if (user) {
          // Use auth context user data if available
          console.log('Using auth context user data for drawer:', user);
          console.log('Drawer user profile picture:', user.profilePicture);
          const name = user.name || user.username || 'John Doe';
          const email = user.email || 'john.doe@example.com';
          const initials = getInitials(name);
          const profilePicture = user.profilePicture || null;
          
          setUserProfile({ name, email, initials, profilePicture });
        }
        console.log('=== END DRAWER NAVIGATION DEBUG ===');
      } catch (error) {
        console.log('Error loading user profile for drawer:', error);
      }
    };

    loadUserProfile();
  }, [user]);
  
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await logout();
              // The AuthContext will update isAuthenticated and AppNavigator will show auth screens
            } catch (error) {
              console.log('Error logging out:', error);
            }
          }
        }
      ]
    );
  };

  // Function to get complete image URL
  const getCompleteImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath; // Already complete URL
    return `${BASE_URL}${imagePath}`; // Add base URL to relative path
  };

  return (
    <DrawerContentScrollView 
      {...props}
      style={isDarkMode ? { backgroundColor: '#121212' } : {}}
    >
      <View style={[
        styles.drawerHeader, 
        isDarkMode && { 
          backgroundColor: '#1a1a1a',
          borderBottomColor: '#333333'
        }
      ]}>
        <View style={styles.userInfoSection}>
          <View style={styles.profileIcon}>
            {userProfile.profilePicture ? (
              <Image 
                source={{ uri: getCompleteImageUrl(userProfile.profilePicture) }} 
                style={styles.profileIconImage}
                onError={(error) => {
                  console.log('=== DRAWER PICTURE ERROR ===');
                  console.log('Drawer profile picture failed to load:', userProfile.profilePicture);
                  console.log('Error details:', error.nativeEvent);
                  console.log('=== END DRAWER PICTURE ERROR ===');
                  setUserProfile(prev => ({ ...prev, profilePicture: null }));
                }}
                onLoad={() => {
                  console.log('Drawer profile picture loaded successfully:', userProfile.profilePicture);
                }}
                onLoadStart={() => {
                  console.log('Drawer profile picture load started:', userProfile.profilePicture);
                }}
              />
            ) : (
              <Text style={styles.profileIconText}>{userProfile.initials}</Text>
            )}
          </View>
          <Text style={[styles.displayName, isDarkMode && { color: '#f0f0f0' }]}>{userProfile.name}</Text>
          <Text style={[styles.email, isDarkMode && { color: '#b0b0b0' }]}>{userProfile.email}</Text>
        </View>
      </View>
      <DrawerItemList {...props} />
      <TouchableOpacity 
        style={[styles.logoutButton, isDarkMode && { borderTopColor: '#333333' }]} 
        onPress={handleLogout}
      >
        <View style={styles.logoutItem}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </View>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
};

const DrawerNavigator = () => {
  const { isDarkMode } = useDarkMode();
  
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: isDarkMode ? '#1a1a1a' : (Platform.OS === 'ios' ? '#F9F9F9' : '#f5f5f5'),
          borderBottomWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
          borderBottomColor: isDarkMode ? '#333333' : (Platform.OS === 'ios' ? '#C6C6C8' : '#e0e0e0'),
          shadowOpacity: Platform.OS === 'ios' ? 0 : 0.1,
          elevation: Platform.OS === 'ios' ? 0 : 4,
        },
        headerTintColor: isDarkMode ? '#f0f0f0' : (Platform.OS === 'ios' ? '#000000' : '#333'),
        headerTitleStyle: {
          fontSize: Platform.OS === 'ios' ? 17 : 18,
          fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
        },
        drawerActiveTintColor: isDarkMode ? '#4a9eff' : '#007AFF',
        drawerInactiveTintColor: isDarkMode ? '#b0b0b0' : (Platform.OS === 'ios' ? '#000000' : '#555'),
        drawerStyle: {
          backgroundColor: isDarkMode ? '#121212' : (Platform.OS === 'ios' ? '#F2F2F7' : '#fff'),
        },
        drawerLabelStyle: {
          fontSize: Platform.OS === 'ios' ? 17 : 16,
          fontWeight: Platform.OS === 'ios' ? '400' : 'normal',
          marginLeft: Platform.OS === 'ios' ? -16 : 0,
        },
        drawerItemStyle: {
          marginVertical: Platform.OS === 'ios' ? 0 : 4,
          paddingVertical: Platform.OS === 'ios' ? 8 : 0,
        },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="Home"
        component={TabNavigator}
        options={{
          title: 'Notes',
          drawerIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Categories"
        component={CategoriesStackNavigator}
        options={{
          title: 'Categories',
          drawerIcon: ({ color }) => (
            <Ionicons name="pricetag-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Camera"
        component={CameraScreen}
        options={{
          title: 'Camera',
          drawerIcon: ({ color }) => (
            <Ionicons name="camera-outline" size={24} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="PhotoGallery"
        component={PhotoGalleryScreen}
        options={{
          title: 'Photo Gallery',
          drawerIcon: ({ color }) => (
            <Ionicons name="images-outline" size={24} color={color} />
          ),
        }}
      />


      <Drawer.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="stats-chart-outline" size={24} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Help"
        component={HelpScreen}
        options={{
          drawerIcon: ({ color }) => (
            <Ionicons name="help-circle-outline" size={24} color={color} />
          ),
        }}
      />

    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userInfoSection: {
    alignItems: 'center',
  },
  profileIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  profileIconImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  profileIconText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    marginTop: 20,
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    marginLeft: 30,
    fontSize: 16,
    color: '#FF3B30',
  },
});

export default DrawerNavigator;