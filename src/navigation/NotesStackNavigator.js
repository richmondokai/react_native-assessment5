import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import NotesListScreen from '../screens/notes/NotesListScreen';
import NoteDetailScreen from '../screens/notes/NoteDetailScreen';
import SearchScreen from '../screens/notes/SearchScreen';
import NearbyNotesScreen from '../screens/notes/NearbyNotesScreen';
import LocationMapView from '../components/maps/MapView';
import { useDarkMode } from '../hooks/useDarkMode';

const Stack = createStackNavigator();

const NotesStackNavigator = () => {
  const { isDarkMode } = useDarkMode();
  
  return (
    <Stack.Navigator
      initialRouteName="NotesList"
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
        name="NotesList" 
        component={NotesListScreen} 
        options={{ title: 'My Notes' }}
      />
      <Stack.Screen 
        name="NoteDetail" 
        component={NoteDetailScreen} 
        options={({ route }) => ({ 
          title: route.params?.isNew ? 'New Note' : 'Edit Note',
        })}
      />
      <Stack.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ title: 'Search Notes' }}
      />
      <Stack.Screen 
        name="NearbyNotes" 
        component={NearbyNotesScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="LocationMap" 
        component={LocationMapView} 
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default NotesStackNavigator;