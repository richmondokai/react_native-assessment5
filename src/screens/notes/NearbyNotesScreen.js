import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  TextInput,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LocationService } from '../../services/locationService';
import { useNotes } from '../../context/NotesContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { LocationUtils } from '../../utils/locationUtils';

const { width } = Dimensions.get('window');

const NearbyNotesScreen = ({ navigation }) => {
  const { isDarkMode } = useDarkMode();
  const { notes, refreshNotes } = useNotes();
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5); // 5km
  const [nearbyNotes, setNearbyNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [sortBy, setSortBy] = useState('distance'); // distance, date, title
  const [filterBy, setFilterBy] = useState('all'); // all, favorites, recent

  useEffect(() => {
    initializeLocation();
  }, []);

  useEffect(() => {
    if (currentLocation && notes) {
      findNearbyNotes();
    }
  }, [currentLocation, notes, searchRadius]);

  useEffect(() => {
    filterAndSortNotes();
  }, [nearbyNotes, searchQuery, sortBy, filterBy]);

  const initializeLocation = async () => {
    try {
      setLoading(true);
      
      // Show benefits dialog first time
      const location = await LocationService.getCurrentLocation();
      
      if (location) {
        setCurrentLocation(location);
      } else {
        // Show educational message about location benefits
        await LocationService.showLocationBenefitsDialog();
        const retryLocation = await LocationService.getCurrentLocation();
        if (retryLocation) {
          setCurrentLocation(retryLocation);
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        'Location Required', 
        'To discover notes near you, we need access to your location. You can enable this in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: () => initializeLocation() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const findNearbyNotes = async () => {
    if (!currentLocation || !notes) return;

    try {
      const notesWithLocation = notes.filter(note => 
        note.location && 
        note.location.coords &&
        LocationUtils.isValidCoordinate(note.location.coords.latitude, note.location.coords.longitude)
      );
      
      const nearby = await LocationService.findNearbyNotes(
        notesWithLocation,
        currentLocation,
        searchRadius
      );
      
      setNearbyNotes(nearby);
    } catch (error) {
      console.error('Error finding nearby notes:', error);
    }
  };

  const filterAndSortNotes = () => {
    let filtered = [...nearbyNotes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.category.toLowerCase().includes(query) ||
        (note.location?.address?.formatted || '').toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (filterBy !== 'all') {
      switch (filterBy) {
        case 'favorites':
          filtered = filtered.filter(note => note.isFavorite);
          break;
        case 'recent':
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(note => new Date(note.date) > oneWeekAgo);
          break;
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.distance - b.distance;
        case 'date':
          return new Date(b.date) - new Date(a.date);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return a.distance - b.distance;
      }
    });

    setFilteredNotes(filtered);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshNotes(),
      initializeLocation()
    ]);
    setRefreshing(false);
  }, [refreshNotes]);

  const handleNotePress = (note) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('NoteDetail', { noteId: note.id });
  };

  const adjustSearchRadius = (increase) => {
    const newRadius = increase 
      ? Math.min(searchRadius + 1, 50) // Max 50km
      : Math.max(searchRadius - 1, 0.5); // Min 0.5km
    
    setSearchRadius(newRadius);
    Haptics.selectionAsync();
  };

  const showSortOptions = () => {
    const options = [
      { text: 'Distance', value: 'distance' },
      { text: 'Date (Newest First)', value: 'date' },
      { text: 'Title (A-Z)', value: 'title' },
    ];

    Alert.alert(
      'Sort By',
      'Choose how to sort nearby notes',
      [
        ...options.map(option => ({
          text: option.text + (sortBy === option.value ? ' ✓' : ''),
          onPress: () => {
            setSortBy(option.value);
            Haptics.selectionAsync();
          }
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showFilterOptions = () => {
    const options = [
      { text: 'All Notes', value: 'all' },
      { text: 'Favorites Only', value: 'favorites' },
      { text: 'Recent (This Week)', value: 'recent' },
    ];

    Alert.alert(
      'Filter By',
      'Choose which notes to show',
      [
        ...options.map(option => ({
          text: option.text + (filterBy === option.value ? ' ✓' : ''),
          onPress: () => {
            setFilterBy(option.value);
            Haptics.selectionAsync();
          }
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openLocationOnMap = () => {
    if (currentLocation) {
      navigation.navigate('LocationMap', {
        initialLocation: currentLocation,
        title: 'Notes Near You',
        showCurrentLocationButton: true,
        allowCustomMarkerPlacement: false
      });
    }
  };

  const renderNoteItem = ({ item: note }) => {
    const date = new Date(note.date);
    const timeAgo = getTimeAgo(date);
    
    return (
      <TouchableOpacity
        style={[
          styles.noteItem,
          { 
            backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
            borderColor: isDarkMode ? '#48484A' : '#E5E5EA'
          }
        ]}
        onPress={() => handleNotePress(note)}
      >
        <View style={styles.noteContent}>
          <View style={styles.noteHeader}>
            <Text style={[
              styles.noteTitle,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]} numberOfLines={2}>
              {note.title}
            </Text>
            {note.isFavorite && (
              <Ionicons name="star" size={16} color="#FFD700" />
            )}
          </View>
          
          <Text style={[
            styles.notePreview,
            { color: isDarkMode ? '#E5E5E7' : '#3A3A3C' }
          ]} numberOfLines={2}>
            {note.content}
          </Text>
          
          <View style={styles.noteMetadata}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={12} color="#007AFF" />
              <Text style={[
                styles.distanceText,
                { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
              ]}>
                {LocationUtils.formatDistance(note.distance)}
              </Text>
            </View>
            
            <View style={styles.noteDetails}>
              <Text style={[
                styles.categoryText,
                { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
              ]}>
                {note.category}
              </Text>
              <Text style={[
                styles.timeText,
                { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
              ]}>
                {timeAgo}
              </Text>
            </View>
          </View>
          
          {note.location?.address?.formatted && (
            <Text style={[
              styles.addressText,
              { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
            ]} numberOfLines={1}>
              📍 {note.location.address.formatted}
            </Text>
          )}
        </View>
        
        <Ionicons 
          name="chevron-forward" 
          size={16} 
          color={isDarkMode ? '#8E8E93' : '#6D6D80'} 
        />
      </TouchableOpacity>
    );
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <SafeAreaView style={[
        styles.container,
        { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' }
      ]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[
            styles.loadingText,
            { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
          ]}>
            Finding your location...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' }
    ]}>
      {/* Header */}
      <View style={[
        styles.header,
        { 
          backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
          borderBottomColor: isDarkMode ? '#48484A' : '#E5E5EA'
        }
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons 
            name="arrow-back" 
            size={24} 
            color={isDarkMode ? '#FFFFFF' : '#000000'} 
          />
        </TouchableOpacity>
        
        <Text style={[
          styles.headerTitle,
          { color: isDarkMode ? '#FFFFFF' : '#000000' }
        ]}>
          Notes Near Me
        </Text>
        
        <TouchableOpacity onPress={openLocationOnMap}>
          <Ionicons 
            name="map" 
            size={24} 
            color={isDarkMode ? '#FFFFFF' : '#000000'} 
          />
        </TouchableOpacity>
      </View>

      {/* Current Location Info */}
      {currentLocation && (
        <TouchableOpacity
          style={[
            styles.locationCard,
            { 
              backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
              borderColor: isDarkMode ? '#48484A' : '#E5E5EA'
            }
          ]}
          onPress={openLocationOnMap}
        >
          <View style={styles.locationCardContent}>
            <Ionicons name="location" size={20} color="#007AFF" />
            <View style={styles.locationText}>
              <Text style={[
                styles.locationTitle,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>
                Current Location
              </Text>
              <Text style={[
                styles.locationSubtitle,
                { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
              ]}>
                {currentLocation.address?.formatted || 
                `${currentLocation.coords.latitude.toFixed(4)}, ${currentLocation.coords.longitude.toFixed(4)}`}
              </Text>
            </View>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={isDarkMode ? '#8E8E93' : '#6D6D80'} 
          />
        </TouchableOpacity>
      )}

      {/* Search and Controls */}
      <View style={[
        styles.controlsContainer,
        { 
          backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
          borderBottomColor: isDarkMode ? '#48484A' : '#E5E5EA'
        }
      ]}>
        {/* Search Bar */}
        <View style={[
          styles.searchContainer,
          { 
            backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7',
            borderColor: isDarkMode ? '#48484A' : '#E5E5EA'
          }
        ]}>
          <Ionicons 
            name="search" 
            size={20} 
            color={isDarkMode ? '#8E8E93' : '#6D6D80'} 
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}
            placeholder="Search nearby notes..."
            placeholderTextColor={isDarkMode ? '#8E8E93' : '#6D6D80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter and Sort Controls */}
        <View style={styles.controlsRow}>
          {/* Radius Control */}
          <View style={styles.radiusControl}>
            <TouchableOpacity
              style={[
                styles.radiusButton,
                { backgroundColor: isDarkMode ? '#48484A' : '#E3F2FF' }
              ]}
              onPress={() => adjustSearchRadius(false)}
            >
              <Ionicons name="remove" size={16} color="#007AFF" />
            </TouchableOpacity>
            
            <Text style={[
              styles.radiusText,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}>
              {searchRadius}km
            </Text>
            
            <TouchableOpacity
              style={[
                styles.radiusButton,
                { backgroundColor: isDarkMode ? '#48484A' : '#E3F2FF' }
              ]}
              onPress={() => adjustSearchRadius(true)}
            >
              <Ionicons name="add" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Sort and Filter Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDarkMode ? '#48484A' : '#E3F2FF' }
              ]}
              onPress={showFilterOptions}
            >
              <Ionicons name="funnel" size={16} color="#007AFF" />
              <Text style={[
                styles.actionButtonText,
                { color: isDarkMode ? '#FFFFFF' : '#007AFF' }
              ]}>
                Filter
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDarkMode ? '#48484A' : '#E3F2FF' }
              ]}
              onPress={showSortOptions}
            >
              <Ionicons name="swap-vertical" size={16} color="#007AFF" />
              <Text style={[
                styles.actionButtonText,
                { color: isDarkMode ? '#FFFFFF' : '#007AFF' }
              ]}>
                Sort
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Results Summary */}
      <View style={[
        styles.summaryContainer,
        { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }
      ]}>
        <Text style={[
          styles.summaryText,
          { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
        ]}>
          Found {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''} within {searchRadius}km
          {filterBy !== 'all' && ` • ${filterBy}`}
          {sortBy !== 'distance' && ` • Sorted by ${sortBy}`}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={isDarkMode ? '#FFFFFF' : '#000000'}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons 
              name="location-outline" 
              size={64} 
              color={isDarkMode ? '#48484A' : '#C7C7CC'} 
            />
            <Text style={[
              styles.emptyTitle,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}>
              No Notes Nearby
            </Text>
            <Text style={[
              styles.emptySubtitle,
              { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
            ]}>
              {!currentLocation 
                ? 'Enable location services to discover notes near you.'
                : 'Try adjusting the search radius or create some notes with location tags.'
              }
            </Text>
            {!currentLocation && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={initializeLocation}
              >
                <Text style={styles.retryButtonText}>Enable Location</Text>
              </TouchableOpacity>
            )}
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  locationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: 12,
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radiusControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radiusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 14,
    textAlign: 'center',
  },
  notesList: {
    flex: 1,
    paddingHorizontal: 16,
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
  },
  noteContent: {
    flex: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  notePreview: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  noteMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  noteDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 12,
  },
  addressText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NearbyNotesScreen;
