import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useDarkMode } from '../../hooks/useDarkMode';
import { LocationService } from '../../services/locationService';

const EnhancedLocationPicker = ({ 
  location, 
  onLocationChange, 
  placeholder = 'Add location',
  style,
  navigation 
}) => {
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const [showModal, setShowModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    // Handle both string and object location formats
    if (typeof location === 'string') {
      setAddressInput(location);
    } else if (location?.address?.formatted) {
      setAddressInput(location.address.formatted);
    }
  }, [location]);

  const handleLocationPress = () => {
    const options = [
      {
        text: 'Current Location',
        onPress: () => selectCurrentLocation()
      },
      {
        text: 'Search Address',
        onPress: () => showAddressInput()
      }
    ];

    if (navigation) {
      options.splice(1, 0, {
        text: 'Choose on Map',
        onPress: () => openMapPicker()
      });
    }

    if (location) {
      options.push({
        text: 'Remove Location',
        style: 'destructive',
        onPress: () => removeLocation()
      });
    }

    options.push({
      text: 'Cancel',
      style: 'cancel'
    });

    Alert.alert('Select Location', 'Choose how you want to set the location', options);
  };

  const selectCurrentLocation = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const hasPermission = await LocationService.requestPermissions(true);
      if (!hasPermission) {
        return;
      }

      const locationString = await LocationService.getCurrentLocation({
        returnAddressOnly: true
      });
      if (locationString && onLocationChange) {
        onLocationChange(locationString);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. Please try again or enter an address manually.');
    }
  };

  const openMapPicker = () => {
    if (!navigation) {
      Alert.alert(
        'Map Unavailable', 
        'Map picker requires navigation. Please use "Search Address" instead.',
        [
          { text: 'Search Address', onPress: () => showAddressInput() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      navigation.navigate('LocationMap', {
        initialLocation: location || currentLocation,
        onLocationSelect: (selectedLocation) => {
          if (onLocationChange) {
            onLocationChange(selectedLocation);
          }
          Haptics.selectionAsync();
        },
        title: 'Select Location',
        showCurrentLocationButton: true,
        allowCustomMarkerPlacement: true
      });
    } catch (error) {
      console.error('Error navigating to LocationMap:', error);
      Alert.alert(
        'Map Navigation Failed',
        'Unable to open the map screen. You can search for an address instead.',
        [
          { text: 'Search Address', onPress: () => showAddressInput() },
          { text: 'Use Current Location', onPress: () => selectCurrentLocation() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const showAddressInput = () => {
    // Handle both string and object location formats
    const currentAddress = typeof location === 'string' ? location : (location?.address?.formatted || '');
    setAddressInput(currentAddress);
    setSearchResults([]);
    setShowAddressModal(true);
  };

  const removeLocation = () => {
    if (onLocationChange) {
      onLocationChange(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const searchAddresses = async (query) => {
    if (!query || query.trim().length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await LocationService.searchAddresses(query.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddressInputChange = (text) => {
    setAddressInput(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchAddresses(text);
    }, 500);
  };

  const selectSearchResult = (result) => {
    if (onLocationChange) {
      // Return the address string instead of the full result object
      const addressString = result.address?.formatted || 
        result.address?.short || 
        result.name || 
        'Selected Location';
      onLocationChange(addressString);
    }
    setShowAddressModal(false);
    Haptics.selectionAsync();
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.searchResultItem,
        isDarkMode && { 
          backgroundColor: darkModeStyles.input.backgroundColor,
          borderBottomColor: darkModeStyles.card.borderColor 
        }
      ]}
      onPress={() => selectSearchResult(item)}
    >
      <Ionicons name="location" size={20} color="#007AFF" />
      <View style={styles.searchResultContent}>
        <Text style={[
          styles.searchResultTitle,
          isDarkMode && { color: darkModeStyles.text.color }
        ]}>
          {item.address?.short || item.address?.formatted || 'Unknown Address'}
        </Text>
        {item.address?.formatted && (
          <Text style={[
            styles.searchResultSubtitle,
            isDarkMode && { color: darkModeStyles.subText.color }
          ]}>
            {item.address.formatted}
          </Text>
        )}
      </View>
      <Ionicons 
        name="chevron-forward" 
        size={16} 
        color={isDarkMode ? darkModeStyles.subText.color : '#999'} 
      />
    </TouchableOpacity>
  );

  const getLocationDisplayText = () => {
    if (!location) return placeholder;
    
    // Handle string location format (new format)
    if (typeof location === 'string') {
      return location.length > 40 ? location.substring(0, 40) + '...' : location;
    }
    
    // Handle object location format (legacy format)
    if (location.address?.short) {
      return location.address.short;
    }
    
    if (location.address?.formatted) {
      return location.address.formatted.length > 40 
        ? location.address.formatted.substring(0, 40) + '...'
        : location.address.formatted;
    }
    
    if (location.coords) {
      return `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;
    }
    
    return 'Unknown Location';
  };

  return (
    <View style={style}>
      <TouchableOpacity
        style={[
          styles.locationButton,
          isDarkMode && {
            backgroundColor: darkModeStyles.input.backgroundColor,
            borderColor: darkModeStyles.input.borderColor
          }
        ]}
        onPress={handleLocationPress}
      >
        <Ionicons 
          name={location ? "location" : "location-outline"} 
          size={20} 
          color={location ? "#007AFF" : (isDarkMode ? darkModeStyles.subText.color : "#999")} 
        />
        <Text style={[
          styles.locationText,
          !location && styles.placeholderText,
          isDarkMode && { 
            color: location 
              ? darkModeStyles.text.color 
              : darkModeStyles.subText.color 
          }
        ]}>
          {getLocationDisplayText()}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={16} 
          color={isDarkMode ? darkModeStyles.subText.color : "#999"} 
        />
      </TouchableOpacity>

      {/* Address Search Modal */}
      <Modal
        visible={showAddressModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[
            styles.modalContent,
            isDarkMode && { backgroundColor: darkModeStyles.card.backgroundColor }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[
                styles.modalTitle,
                isDarkMode && { color: darkModeStyles.text.color }
              ]}>
                Search Location
              </Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={isDarkMode ? darkModeStyles.text.color : '#000'} 
                />
              </TouchableOpacity>
            </View>

            <View style={[
              styles.searchContainer,
              isDarkMode && { backgroundColor: darkModeStyles.input.backgroundColor }
            ]}>
              <Ionicons 
                name="search" 
                size={20} 
                color={isDarkMode ? darkModeStyles.subText.color : '#999'} 
              />
              <TextInput
                style={[
                  styles.searchInput,
                  isDarkMode && { color: darkModeStyles.text.color }
                ]}
                placeholder="Enter address, place name, or coordinates..."
                placeholderTextColor={isDarkMode ? darkModeStyles.subText.color : '#999'}
                value={addressInput}
                onChangeText={handleAddressInputChange}
                autoFocus={true}
              />
              {isSearching && <ActivityIndicator size="small" color="#007AFF" />}
            </View>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => `${item.coords?.latitude}-${item.coords?.longitude}-${index}`}
                renderItem={renderSearchResult}
                style={styles.searchResults}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* No Results Message */}
            {addressInput.length >= 3 && searchResults.length === 0 && !isSearching && (
              <View style={styles.noResultsContainer}>
                <Ionicons 
                  name="location-outline" 
                  size={48} 
                  color={isDarkMode ? darkModeStyles.subText.color : '#CCC'} 
                />
                <Text style={[
                  styles.noResultsText,
                  isDarkMode && { color: darkModeStyles.subText.color }
                ]}>
                  No locations found for "{addressInput}"
                </Text>
                <Text style={[
                  styles.noResultsSubtext,
                  isDarkMode && { color: darkModeStyles.subText.color }
                ]}>
                  Try a different search term or use current location
                </Text>
                <TouchableOpacity
                  style={[
                    styles.useCurrentButton,
                    isDarkMode && { backgroundColor: darkModeStyles.primary.backgroundColor }
                  ]}
                  onPress={() => {
                    setShowAddressModal(false);
                    selectCurrentLocation();
                  }}
                >
                  <Ionicons name="locate" size={20} color="#FFFFFF" />
                  <Text style={styles.useCurrentButtonText}>Use Current Location</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Actions */}
            {addressInput.length < 3 && (
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[
                    styles.quickActionButton,
                    isDarkMode && { 
                      backgroundColor: darkModeStyles.input.backgroundColor,
                      borderColor: darkModeStyles.card.borderColor 
                    }
                  ]}
                  onPress={() => {
                    setShowAddressModal(false);
                    selectCurrentLocation();
                  }}
                >
                  <Ionicons name="locate" size={24} color="#007AFF" />
                  <Text style={[
                    styles.quickActionText,
                    isDarkMode && { color: darkModeStyles.text.color }
                  ]}>
                    Use Current Location
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  placeholderText: {
    color: '#999',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 4,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  searchResultSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  useCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  useCurrentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActions: {
    padding: 20,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
});

export default EnhancedLocationPicker;
