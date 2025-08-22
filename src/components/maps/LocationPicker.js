import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LocationService } from '../../services/locationService';
import { LocationUtils } from '../../utils/locationUtils';
import { useDarkMode } from '../../hooks/useDarkMode';

const LocationPicker = ({
  location,
  onLocationChange,
  onLocationSelect,
  placeholder = "Add location",
  showCurrentLocation = true,
  showMap = true,
  style,
  disabled = false,
  navigation,
}) => {
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (showCurrentLocation) {
      getCurrentLocation();
    }
  }, [showCurrentLocation]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const position = await LocationService.getCurrentLocation();
      if (position) {
        setCurrentLocation(position);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationPress = () => {
    if (disabled) return;

    const options = [];

    if (showCurrentLocation) {
      options.push({
        text: 'Current Location',
        onPress: () => selectCurrentLocation()
      });
    }

    // Temporarily disabled map option due to react-native-maps startup issues
    // if (showMap && navigation) {
    //   options.push({
    //     text: 'Choose on Map',
    //     onPress: () => openMapPicker()
    //   });
    // }

    options.push({
      text: 'Enter Address',
      onPress: () => showAddressInput()
    });

    if (location) {
      options.push({
        text: 'Remove Location',
        style: 'destructive',
        onPress: () => removeLocation()
      });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Select Location', 'Choose how you want to set the location for this note', options);
  };

  const selectCurrentLocation = async () => {
    try {
      setLoading(true);
      const position = await LocationService.getCurrentLocation();
      
      if (position) {
        const locationData = LocationUtils.createLocationObject(
          position.coords,
          position.address
        );
        
        if (onLocationChange) {
          onLocationChange(locationData);
        }
        
        Haptics.selectionAsync();
      }
    } catch (error) {
      console.error('Error selecting current location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  const openMapPicker = () => {
    if (!navigation) {
      Alert.alert(
        'Map Unavailable',
        'Map picker requires navigation. Please use "Enter Address" instead.',
        [
          { text: 'Enter Address', onPress: () => showAddressInput() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      console.log('Attempting to navigate to LocationMap with navigation:', navigation);
      
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
      
      // Enhanced fallback with more detailed error
      Alert.alert(
        'Map Navigation Failed',
        'Unable to open the map screen. This might be due to missing map dependencies. You can enter an address manually instead.',
        [
          { text: 'Enter Address', onPress: () => showAddressInput() },
          { text: 'Use Current Location', onPress: () => selectCurrentLocation() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const showAddressInput = () => {
    setAddressInput(location?.address?.formatted || '');
    setSearchResults([]);
    setShowAddressModal(true);
  };

  const searchAddresses = async (address) => {
    if (!address || address.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await LocationService.searchAddresses(address);
      setSearchResults(results.slice(0, 5)); // Limit to 5 results
    } catch (error) {
      console.error('Error searching address:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (result) => {
    if (onLocationChange) {
      onLocationChange(result);
    }
    setShowAddressModal(false);
    setAddressInput('');
    setSearchResults([]);
    Haptics.selectionAsync();
  };

  const handleAddressInputChange = (text) => {
    setAddressInput(text);
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchAddresses(text);
    }, 500);
  };

  const removeLocation = () => {
    if (onLocationChange) {
      onLocationChange(null);
    }
    Haptics.selectionAsync();
  };

  const getLocationText = () => {
    if (!location) return placeholder;
    
    if (location.address) {
      return location.address.short || location.address.formatted || 'Selected Location';
    }
    
    return `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;
  };

  const getLocationIcon = () => {
    if (loading) return null;
    if (!location) return 'location-outline';
    return 'location';
  };

  const getLocationIconColor = () => {
    if (!location) return isDarkMode ? '#8E8E93' : '#6D6D80';
    return '#007AFF';
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
          borderColor: location 
            ? '#007AFF' 
            : (isDarkMode ? '#48484A' : '#E5E5EA'),
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
      onPress={handleLocationPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Ionicons
            name={getLocationIcon()}
            size={20}
            color={getLocationIconColor()}
          />
        )}
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[
          styles.locationText,
          {
            color: location 
              ? (isDarkMode ? '#FFFFFF' : '#000000')
              : (isDarkMode ? '#8E8E93' : '#6D6D80')
          }
        ]}>
          {getLocationText()}
        </Text>
        
        {location && location.coords && (
          <Text style={[
            styles.coordinatesText,
            { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
          ]}>
            {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
            {location.coords.accuracy && (
              <Text> • {LocationUtils.getLocationAccuracyDescription(location.coords.accuracy)}</Text>
            )}
          </Text>
        )}
      </View>
      
      <View style={styles.chevronContainer}>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={isDarkMode ? '#8E8E93' : '#6D6D80'}
        />
      </View>
      
      {/* Address Input Modal */}
      <Modal
        visible={showAddressModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Enter Address
              </Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7' }]}>
              <Ionicons name="search" size={20} color={isDarkMode ? '#8E8E93' : '#6D6D80'} />
              <TextInput
                style={[styles.searchInput, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}
                placeholder="Enter address or place name..."
                placeholderTextColor={isDarkMode ? '#8E8E93' : '#6D6D80'}
                value={addressInput}
                onChangeText={handleAddressInputChange}
                autoFocus={true}
              />
              {isSearching && <ActivityIndicator size="small" color="#007AFF" />}
            </View>
            
            {searchResults.length > 0 && (
              <View style={styles.searchResultsContainer}>
                {searchResults.map((result, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.searchResultItem, { borderBottomColor: isDarkMode ? '#48484A' : '#E5E5EA' }]}
                    onPress={() => selectSearchResult(result)}
                  >
                    <Ionicons name="location" size={16} color="#007AFF" />
                    <View style={styles.searchResultText}>
                      <Text style={[styles.searchResultTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                        {result.address?.short || 'Unknown Location'}
                      </Text>
                      <Text style={[styles.searchResultSubtitle, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
                        {result.address?.formatted || `${result.coords.latitude.toFixed(4)}, ${result.coords.longitude.toFixed(4)}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {addressInput.length >= 3 && searchResults.length === 0 && !isSearching && (
              <View style={styles.noResultsContainer}>
                <Text style={[styles.noResultsText, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
                  No locations found. Try a different search term.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '500',
  },
  coordinatesText: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  chevronContainer: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  searchResultsContainer: {
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  searchResultText: {
    flex: 1,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  searchResultSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LocationPicker;
