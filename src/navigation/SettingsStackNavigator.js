import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import SettingsScreen from '../screens/settings/SettingsScreen';
import ChangePasswordScreen from '../screens/settings/ChangePasswordScreen';
import PermissionsScreen from '../screens/settings/PermissionsScreen';
import SocialFeedScreen from '../screens/social/SocialFeedScreen';
import NotificationSettingsScreen from '../screens/social/NotificationSettingsScreen';
import NotesMapScreen from '../screens/notes/NotesMapScreen';
import PhotoGalleryScreen from '../screens/media/PhotoGalleryScreen';
import CameraScreen from '../screens/media/CameraScreen';
import { useDarkMode } from '../hooks/useDarkMode';

const Stack = createStackNavigator();

const SettingsStackNavigator = () => {
  const { isDarkMode } = useDarkMode();
  
  return (
    <Stack.Navigator
      initialRouteName="SettingsList"
      screenOptions={{
        headerStyle: {
          backgroundColor: isDarkMode ? '#1a1a1a' : '#f5f5f5',
        },
        headerTintColor: isDarkMode ? '#f0f0f0' : '#333',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="SettingsList" 
        component={SettingsScreen} 
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen} 
        options={{ title: 'Change Password' }}
      />
      <Stack.Screen
        name="Permissions"
        component={PermissionsScreen}
        options={{ title: 'App Permissions' }}
      />

      <Stack.Screen
        name="SocialFeed"
        component={SocialFeedScreen}
        options={{ title: 'Social Feed' }}
      />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ title: 'Notification Settings' }}
      />
      <Stack.Screen
        name="NotesMap"
        component={NotesMapScreen}
        options={{ title: 'Notes Map' }}
      />
      <Stack.Screen
        name="PhotoGallery"
        component={PhotoGalleryScreen}
        options={{ title: 'Photo Gallery' }}
      />
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ title: 'Camera', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default SettingsStackNavigator;
