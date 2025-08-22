import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LocationService } from '../../services/locationService';
import { useNotes } from '../../context/NotesContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { LocationUtils } from '../../utils/locationUtils';

const NotesMapScreen = ({ navigation, route }) => {
  const { isDarkMode } = useDarkMode();
  const { notes } = useNotes();
  const { initialLocation, onLocationSelect } = route.params || {};
  
  const [currentLocation, setCurrentLocation] = useState(initialLocation);
  const [loading, setLoading] = useState(!initialLocation);
  const [searchRadius, setSearchRadius] = useState(5); // 5km
  const [nearbyNotes, setNearbyNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotes, setFilteredNotes] = useState([]);

  useEffect(() => {
    if (!initialLocation) {
      getCurrentLocation();
    }
  }, []);

  useEffect(() => {
    if (currentLocation && notes) {
      findNearbyNotes();
    }
  }, [currentLocation, notes, searchRadius]);

  useEffect(() => {
    filterNotes();
  }, [nearbyNotes, searchQuery]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const location = await LocationService.getCurrentLocation();
      
      if (location) {
        setCurrentLocation(location);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  const findNearbyNotes = async () => {
    if (!currentLocation || !notes) return;

    try {
      const nearby = await LocationService.findNearbyNotes(
        notes.filter(note => note.location && note.location.coords),
        currentLocation,
        searchRadius
      );
      
      setNearbyNotes(nearby);
    } catch (error) {
      console.error('Error finding nearby notes:', error);
    }
  };

  const filterNotes = () => {
    if (!searchQuery.trim()) {
      setFilteredNotes(nearbyNotes);
      return;
    }

    const filtered = nearbyNotes.filter(note =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.location?.address?.formatted || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredNotes(filtered);
  };

  const handleNotePress = (note) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('NoteDetail', { noteId: note.id });
  };

  const adjustSearchRadius = (increase) => {
    const newRadius = increase 
      ? Math.min(searchRadius + 1, 20) // Max 20km
      : Math.max(searchRadius - 1, 1); // Min 1km
    
    setSearchRadius(newRadius);
    Haptics.selectionAsync();
  };

  const renderNoteItem = ({ item: note }) => (
    <TouchableOpacity
      style={[styles.noteItem, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}
      onPress={() => handleNotePress(note)}
    >
      <View style={styles.noteContent}>
        <Text style={[styles.noteTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
          {note.title}
        </Text>
        <Text style={[styles.notePreview, { color: isDarkMode ? '#E5E5E7' : '#3A3A3C' }]} numberOfLines={2}>
          {note.content}
        </Text>
        <View style={styles.noteLocationInfo}>
          <Ionicons name="location" size={12} color="#007AFF" />
          <Text style={[styles.noteDistance, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
            {LocationUtils.formatDistance(note.distance)} away
          </Text>
          {note.location?.address?.formatted && (
            <Text style={[styles.noteAddress, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]} numberOfLines={1}>
              • {note.location.address.formatted}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#8E8E93' : '#6D6D80'} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
            Getting your location...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
          Nearby Notes
        </Text>
        
        <TouchableOpacity onPress={getCurrentLocation}>
          <Ionicons name="locate" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
      </View>

      {/* Current Location Info */}
      {currentLocation && (
        <View style={[styles.locationInfo, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}>
          <View style={styles.locationHeader}>
            <Ionicons name="location" size={20} color="#007AFF" />
            <Text style={[styles.locationTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Current Location
            </Text>
          </View>
          <Text style={[styles.locationAddress, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
            {currentLocation.address?.formatted || `${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`}
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}>
        <Ionicons name="search" size={20} color={isDarkMode ? '#8E8E93' : '#6D6D80'} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}
          placeholder="Search nearby notes..."
          placeholderTextColor={isDarkMode ? '#8E8E93' : '#6D6D80'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Controls */}
      <View style={[styles.controls, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}>
        <View style={styles.radiusControl}>
          <TouchableOpacity
            style={styles.radiusButton}
            onPress={() => adjustSearchRadius(false)}
          >
            <Ionicons name="remove" size={16} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={[styles.radiusText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            {searchRadius}km radius
          </Text>
          
          <TouchableOpacity
            style={styles.radiusButton}
            onPress={() => adjustSearchRadius(true)}
          >
            <Ionicons name="add" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.notesCount, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
          {filteredNotes.length} notes found
        </Text>
      </View>

      {/* Notes List */}
      <FlatList
        data={filteredNotes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.notesList}
        contentContainerStyle={styles.notesListContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color={isDarkMode ? '#48484A' : '#C7C7CC'} />
            <Text style={[styles.emptyTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              No Notes Nearby
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
              Try adjusting the search radius or check if location services are enabled.
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  locationInfo: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationAddress: {
    fontSize: 14,
    marginLeft: 28,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  controls: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  radiusControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  radiusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  notesCount: {
    fontSize: 14,
    textAlign: 'center',
  },
  notesList: {
    flex: 1,
    marginHorizontal: 16,
  },
  notesListContent: {
    paddingBottom: 20,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  noteLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteDistance: {
    fontSize: 12,
    marginLeft: 4,
  },
  noteAddress: {
    fontSize: 12,
    flex: 1,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
});

export default NotesMapScreen;
