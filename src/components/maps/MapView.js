import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput,
  FlatList,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LocationService } from '../../services/locationService';
import { LocationUtils } from '../../utils/locationUtils';
import { useDarkMode } from '../../hooks/useDarkMode';

const { width, height } = Dimensions.get('window');

const LocationMapView = ({
  navigation,
  route
}) => {
  const { isDarkMode } = useDarkMode();
  const { 
    initialLocation, 
    onLocationSelect, 
    title = 'Select Location',
    showCurrentLocationButton = true,
    allowCustomMarkerPlacement = true 
  } = route?.params || {};
  
  const mapRef = useRef(null);
  const [region, setRegion] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(
    typeof initialLocation === 'string' ? null : initialLocation
  );
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [mapProvider, setMapProvider] = useState(PROVIDER_GOOGLE);
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 3) {
      searchAddresses();
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery]);

  const initializeMap = async () => {
    try {
      setLoading(true);
      
      let targetLocation = initialLocation;
      
      // Handle string location (address) - convert to location object
      if (typeof initialLocation === 'string' && initialLocation.trim()) {
        try {
          const geocoded = await LocationService.geocodeAddress(initialLocation);
          if (geocoded && geocoded.coords) {
            targetLocation = geocoded;
            setSelectedLocation(geocoded); // Set as selected location
          } else {
            targetLocation = null;
          }
        } catch (error) {
          console.error('Error geocoding initial address:', error);
          targetLocation = null;
        }
      }
      
      // If no initial location, try to get current location
      if (!targetLocation && showCurrentLocationButton) {
        const current = await LocationService.getCurrentLocation();
        if (current) {
          setCurrentLocation(current);
          targetLocation = current;
        }
      }
      
      // Set default region (San Francisco if no location available)
      const defaultRegion = {
        latitude: targetLocation?.coords?.latitude || 37.7749,
        longitude: targetLocation?.coords?.longitude || -122.4194,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setRegion(defaultRegion);
      
      // Animate to location if available
      if (targetLocation && mapRef.current) {
        setTimeout(() => {
          mapRef.current.animateToRegion(defaultRegion, 1000);
        }, 500);
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchAddresses = async () => {
    try {
      setSearchLoading(true);
      
      const results = await LocationService.searchAddresses(searchQuery);
      
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
    } catch (error) {
      console.error('Error searching addresses:', error);
      
      // Show user-friendly error
      Alert.alert(
        'Search Error',
        'Unable to search for locations. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleMapPress = (event) => {
    if (!allowCustomMarkerPlacement) {
      return;
    }
    
    // Handle different event types and coordinate formats
    let coordinates = null;
    
    if (event.nativeEvent && event.nativeEvent.coordinate) {
      coordinates = event.nativeEvent.coordinate;
    } else if (event.coordinate) {
      coordinates = event.coordinate;
    } else if (event.latitude && event.longitude) {
      coordinates = { latitude: event.latitude, longitude: event.longitude };
    }
    
    if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
      return;
    }
    
    const { latitude, longitude } = coordinates;
    
    Haptics.selectionAsync();
    
    // Create location object with coordinates
    const newLocation = LocationUtils.createLocationObject({
      latitude,
      longitude
    });
    
    if (newLocation) {
      setSelectedLocation(newLocation);
      
      // Get address for the coordinates
      console.log('🗺️ Calling LocationService.reverseGeocode with:', latitude, longitude);
      LocationService.reverseGeocode(latitude, longitude)
        .then(address => {
          console.log('🗺️ Map tap reverse geocode result:', address);
          console.log('🗺️ Address type:', typeof address);
          console.log('🗺️ Address object structure:', JSON.stringify(address, null, 2));
          if (address) {
            const formattedAddress = LocationUtils.formatAddress(address);
            const shortAddress = LocationUtils.getShortAddress(address);
            console.log('Map tap formatted address:', formattedAddress);
            console.log('Map tap short address:', shortAddress);
            
            const updatedLocation = {
              ...newLocation,
              address: {
                formatted: formattedAddress,
                short: shortAddress,
                ...address
              }
            };
            setSelectedLocation(updatedLocation);
          } else {
            console.log('No address returned from map tap reverse geocoding');
            // Fallback to coordinates
            const fallbackLocation = {
              ...newLocation,
              address: {
                formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                short: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
              }
            };
            setSelectedLocation(fallbackLocation);
          }
        })
        .catch(error => {
          console.error('Error getting address:', error);
          // Fallback to coordinates on error
          const fallbackLocation = {
            ...newLocation,
            address: {
              formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
              short: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            }
          };
          setSelectedLocation(fallbackLocation);
        });
    }
  };

  const handleCurrentLocationPress = async () => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        setSelectedLocation(location);
        
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setRegion(newRegion);
        
        if (mapRef.current) {
          mapRef.current.animateToRegion(newRegion, 1000);
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResultPress = (result) => {
    Haptics.selectionAsync();
    
    setSelectedLocation(result);
    setSearchQuery('');
    setShowSearchResults(false);
    Keyboard.dismiss();
    
    const newRegion = {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    
    setRegion(newRegion);
    
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  const handleConfirm = () => {
    const locationToConfirm = selectedLocation || currentLocation;
    
    if (!locationToConfirm) {
      Alert.alert('No Location Available', 'Please wait for location to load or select a location on the map');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (onLocationSelect) {
      onLocationSelect(locationToConfirm);
    }
    
    navigation.goBack();
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.searchResultItem,
        { 
          backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
          borderBottomColor: isDarkMode ? '#48484A' : '#E5E5EA'
        }
      ]}
      onPress={() => handleSearchResultPress(item)}
    >
      <View style={styles.searchResultContent}>
        <Ionicons name="location" size={16} color="#007AFF" />
        <View style={styles.searchResultText}>
          <Text style={[
            styles.searchResultTitle,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>
            {item.address?.short || item.address?.formatted || item.searchQuery || 'Unknown Location'}
          </Text>
          <Text style={[
            styles.searchResultSubtitle,
            { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
          ]}>
            {item.address?.formatted || (item.coords ? `${item.coords.latitude.toFixed(4)}, ${item.coords.longitude.toFixed(4)}` : 'No coordinates')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !region) {
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
            Loading map...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[
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
            name="close" 
            size={24} 
            color={isDarkMode ? '#FFFFFF' : '#000000'} 
          />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={[
            styles.headerTitle,
            { color: isDarkMode ? '#FFFFFF' : '#000000' }
          ]}>
            {title}
          </Text>
          {allowCustomMarkerPlacement && !isDraggingMarker && (
            <Text style={[
              styles.headerSubtitle,
              { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
            ]}>
              Tap or drag to place marker
            </Text>
          )}
          {isDraggingMarker && (
            <Text style={[
              styles.headerSubtitle,
              { color: '#007AFF' }
            ]}>
              Dragging marker...
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: (selectedLocation || currentLocation) ? '#007AFF' : (isDarkMode ? '#48484A' : '#E5E5EA') }
          ]}
          onPress={handleConfirm}
          disabled={!(selectedLocation || currentLocation)}
        >
          <Text style={[
            styles.confirmButtonText,
            { color: (selectedLocation || currentLocation) ? '#FFFFFF' : (isDarkMode ? '#8E8E93' : '#6D6D80') }
          ]}>
            Confirm
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[
        styles.searchContainer,
        { 
          backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
          borderBottomColor: isDarkMode ? '#48484A' : '#E5E5EA'
        }
      ]}>
        <View style={[
          styles.searchInputContainer,
          { 
            backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7',
            borderColor: isDarkMode ? '#48484A' : '#E5E5EA'
          }
        ]}>
          <Ionicons 
            name="search" 
            size={16} 
            color={isDarkMode ? '#8E8E93' : '#6D6D80'} 
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              { color: isDarkMode ? '#FFFFFF' : '#000000' }
            ]}
            placeholder="Search for a location..."
            placeholderTextColor={isDarkMode ? '#8E8E93' : '#6D6D80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="words"
          />
          {searchLoading && (
            <ActivityIndicator size="small" color="#007AFF" />
          )}
        </View>
      </View>

      {/* Search Results */}
      {showSearchResults && (
        <View style={[
          styles.searchResults,
          { 
            backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
            borderBottomColor: isDarkMode ? '#48484A' : '#E5E5EA'
          }
        ]}>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item, index) => `search-${index}`}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer} pointerEvents="box-none">

        
        {loading && (
          <View style={styles.loadingContainer} pointerEvents="none">
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={[styles.loadingText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Loading Map...
            </Text>
          </View>
        )}
        {region && (
          <MapView
            ref={mapRef}
            style={styles.map}
            pointerEvents="auto"
            provider={mapProvider}
            region={region}
            onRegionChangeComplete={setRegion}
            onPress={handleMapPress}
            onLongPress={handleMapPress}
            onPoiClick={(poi) => {
              if (allowCustomMarkerPlacement && poi.nativeEvent.coordinate) {
                handleMapPress(poi);
              }
            }}
            showsUserLocation={true}
            showsMyLocationButton={false}
            customMapStyle={isDarkMode ? darkMapStyle : []}
            onMapReady={() => {
              setLoading(false);
            }}
            onError={(error) => {
              console.error('Map error:', error);
              
              // Try fallback to default provider if Google Maps fails
              if (mapProvider === PROVIDER_GOOGLE) {
                setMapProvider(PROVIDER_DEFAULT);
              } else {
                Alert.alert(
                  'Map Error', 
                  'Failed to load maps. Please check your internet connection and try again.',
                  [
                    { text: 'Retry', onPress: () => {
                      setMapProvider(PROVIDER_GOOGLE);
                      setLoading(true);
                    }},
                    { text: 'Cancel', style: 'cancel' }
                  ]
                );
              }
            }}
            // Essential touch settings only
            scrollEnabled={true}
            zoomEnabled={true}
            rotateEnabled={true}
            pitchEnabled={true}
            // Remove potentially problematic props
            moveOnMarkerPress={false}
          >
            {/* Single draggable location marker */}
            {(selectedLocation || currentLocation) && (
              <Marker
                coordinate={(selectedLocation || currentLocation).coords}
                title={selectedLocation ? "Selected Location" : "Current Location"}
                description={(selectedLocation || currentLocation).address?.formatted || 'Location'}
                pinColor="#007AFF"
                draggable={allowCustomMarkerPlacement}
                onDragStart={() => {
                  setIsDraggingMarker(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                onDragEnd={(event) => {
                  const { latitude, longitude } = event.nativeEvent.coordinate;
                  
                  setIsDraggingMarker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  
                  // Create new location object with updated coordinates
                  const updatedLocation = LocationUtils.createLocationObject({
                    latitude,
                    longitude
                  });
                  
                  if (updatedLocation) {
                    setSelectedLocation(updatedLocation);
                    
                    // Get new address for the updated coordinates
                    LocationService.reverseGeocode(latitude, longitude)
                      .then(address => {
                        console.log('Reverse geocode result:', address);
                        if (address) {
                          const formattedAddress = LocationUtils.formatAddress(address);
                          const shortAddress = LocationUtils.getShortAddress(address);
                          console.log('Formatted address:', formattedAddress);
                          console.log('Short address:', shortAddress);
                          
                          const locationWithAddress = {
                            ...updatedLocation,
                            address: {
                              formatted: formattedAddress,
                              short: shortAddress,
                              ...address
                            }
                          };
                          setSelectedLocation(locationWithAddress);
                        } else {
                          console.log('No address returned from reverse geocoding');
                          // Fallback to coordinates
                          const fallbackLocation = {
                            ...updatedLocation,
                            address: {
                              formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                              short: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                            }
                          };
                          setSelectedLocation(fallbackLocation);
                        }
                      })
                      .catch(error => {
                        console.error('Error getting address for dragged marker:', error);
                        // Fallback to coordinates on error
                        const fallbackLocation = {
                          ...updatedLocation,
                          address: {
                            formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
                            short: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
                          }
                        };
                        setSelectedLocation(fallbackLocation);
                      });
                  }
                }}
              />
            )}
          </MapView>
        )}
        


        {/* Floating Action Buttons */}
        <View style={styles.floatingButtons}>
          {showCurrentLocationButton && (
            <TouchableOpacity
              style={[
                styles.floatingButton,
                { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }
              ]}
              onPress={handleCurrentLocationPress}
            >
              <Ionicons 
                name="locate" 
                size={24} 
                color="#007AFF" 
              />
            </TouchableOpacity>
          )}
          

        </View>
      </View>

      {/* Location Info */}
      {(selectedLocation || currentLocation) && (
        <View style={[
          styles.locationInfo,
          { 
            backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
            borderTopColor: isDarkMode ? '#48484A' : '#E5E5EA'
          }
        ]}>
          <View style={styles.locationInfoContent}>
            <Ionicons name="location" size={20} color="#007AFF" />
            <View style={styles.locationInfoText}>
              <Text style={[
                styles.locationInfoTitle,
                { color: isDarkMode ? '#FFFFFF' : '#000000' }
              ]}>
                {isDraggingMarker 
                  ? 'Dragging marker...' 
                  : (selectedLocation 
                    ? (selectedLocation.address?.short || 'Selected Location')
                    : 'Current Location'
                  )
                }
              </Text>
              <Text style={[
                styles.locationInfoSubtitle,
                { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
              ]}>
                {isDraggingMarker 
                  ? 'Release to set new location'
                  : ((selectedLocation || currentLocation).address?.formatted || 
                    ((selectedLocation || currentLocation).coords ? 
                      `${(selectedLocation || currentLocation).coords.latitude.toFixed(6)}, ${(selectedLocation || currentLocation).coords.longitude.toFixed(6)}` : 
                      'Location coordinates unavailable'))
                }
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 0,
    paddingTop: 0,
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
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 0,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchResults: {
    maxHeight: 200,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchResultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultText: {
    marginLeft: 12,
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  floatingButtons: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 12,
  },
  locationInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  locationInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  locationInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfoSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },


});

export default LocationMapView;
