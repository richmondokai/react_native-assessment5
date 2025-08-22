import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import SocialFeedScreen from '../screens/social/SocialFeedScreen';
import NoteDetailScreen from '../screens/notes/NoteDetailScreen';
import { useDarkMode } from '../hooks/useDarkMode';

const Stack = createStackNavigator();

const SocialFeedStackNavigator = () => {
  const { isDarkMode } = useDarkMode();

  return (
    <Stack.Navigator
      initialRouteName="SocialFeedList"
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
        name="SocialFeedList" 
        component={SocialFeedScreen} 
        options={{ title: 'Social Feed' }}
      />
      <Stack.Screen 
        name="NoteDetail" 
        component={NoteDetailScreen} 
        options={({ route }) => ({ 
          title: route.params?.isNew ? 'New Note' : 'Edit Note',
        })}
      />
    </Stack.Navigator>
  );
};

export default SocialFeedStackNavigator;
