import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NotesStackNavigator from './NotesStackNavigator';
import FavoritesStackNavigator from './FavoritesStackNavigator';
import SocialFeedStackNavigator from './SocialFeedStackNavigator';
import SettingsStackNavigator from './SettingsStackNavigator';
import { useDarkMode } from '../hooks/useDarkMode';
import { useSocialNotifications } from '../context/SocialNotificationContext';
import TabIconBadge from '../components/common/TabIconBadge';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { isDarkMode } = useDarkMode();
  const insets = useSafeAreaInsets();
  const { likesCount } = useSocialNotifications();
  
  return (
    <Tab.Navigator
      initialRouteName="NotesStack"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'NotesStack') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'star' : 'star-outline';
          } else if (route.name === 'SocialFeed') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          // iOS uses slightly smaller icons in tab bars
          const iconSize = Platform.OS === 'ios' ? 28 : size;
          
          // Special handling for SocialFeed tab with badge
          if (route.name === 'SocialFeed') {
            return (
              <TabIconBadge
                iconName={iconName}
                size={iconSize}
                color={color}
                badgeCount={likesCount}
                focused={focused}
              />
            );
          }
          
          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
        tabBarActiveTintColor: isDarkMode ? '#4a9eff' : '#007AFF',
        tabBarInactiveTintColor: isDarkMode ? '#888' : 'gray',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1a1a1a' : '#fff',
          borderTopColor: isDarkMode ? '#333' : (Platform.OS === 'ios' ? '#C6C6C8' : '#e0e0e0'),
          borderTopWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
          ...Platform.select({
            ios: {
              // iOS-specific styling
              paddingBottom: Math.max(insets.bottom, 16), // Respect safe area + padding
              paddingTop: 8,
              height: Math.max(insets.bottom + 64, 80), // Dynamic height based on safe area
              shadowOpacity: 0, // Remove shadow on iOS (use border instead)
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
            },
            android: {
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 4,
              paddingBottom: 5,
              paddingTop: 5,
              height: 60,
            }
          }),
        },
        tabBarLabelStyle: {
          fontSize: Platform.OS === 'ios' ? 10 : 12,
          fontWeight: Platform.OS === 'ios' ? '600' : '500',
          marginBottom: Platform.OS === 'ios' ? 0 : 3,
        },
        headerShown: false,
        tabBarHideOnKeyboard: true, // Hide tab bar when keyboard is open
      })}
    >
      <Tab.Screen 
        name="NotesStack" 
        component={NotesStackNavigator} 
        options={{ title: 'All Notes' }}
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesStackNavigator} 
        options={{ title: 'Favorites' }}
      />
      <Tab.Screen 
        name="SocialFeed" 
        component={SocialFeedStackNavigator} 
        options={{ title: 'Social Feed' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStackNavigator} 
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;