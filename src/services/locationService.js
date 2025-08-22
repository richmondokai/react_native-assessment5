import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

export class LocationService {
  static async requestPermissions(showEducationalMessage = false) {
    try {
      // Check current permission status first
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'granted') {
        return true;
      }
      
      // Show educational message if requested
      if (showEducationalMessage) {
        await this.showLocationBenefitsDialog();
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        this.showPermissionDeniedDialog();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  static async showLocationBenefitsDialog() {
    return new Promise((resolve) => {
      Alert.alert(
        'Enable Location Services',
        'Location access helps you:\n\n• Automatically tag notes with your current location\n• Discover notes near you\n• Organize notes by places you\'ve visited\n• Never lose track of where important memories happened\n\nYour location data stays private and is only stored on your device.',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: resolve
          },
          {
            text: 'Enable Location',
            onPress: resolve
          }
        ]
      );
    });
  }

  static showPermissionDeniedDialog() {
    const isIOS = Platform.OS === 'ios';
    Alert.alert(
      'Location Access Denied',
      `To use location features, please ${isIOS ? 'go to Settings > Privacy & Security > Location Services' : 'go to Settings > Apps > Permissions'} and enable location access for this app.\n\nLocation features include:\n• Auto-tagging notes with locations\n• Finding notes near you\n• Location-based organization`,
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
      ]
    );
  }

  static async checkLocationServices() {
    try {
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use location features.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking location services:', error);
      return false;
    }
  }

  static async getCurrentLocation(options = {}) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      console.log('Input options received:', options);
      
      // Map custom options to Expo Location options
      const locationOptions = {
        accuracy: options.accuracy === 'high' ? Location.Accuracy.High : Location.Accuracy.Balanced
      };

      // Only add valid Expo Location parameters
      if (options.timeout && typeof options.timeout === 'number') {
        locationOptions.timeout = options.timeout;
      }
      if (options.maximumAge && typeof options.maximumAge === 'number') {
        locationOptions.maximumAge = options.maximumAge;
      }

      console.log('Final location options for Expo:', locationOptions);
      console.log('Location.Accuracy.High value:', Location.Accuracy.High);
      console.log('Location.Accuracy.Balanced value:', Location.Accuracy.Balanced);
      const location = await Location.getCurrentPositionAsync(locationOptions);

      // Get address from coordinates if not disabled
      let address = null;
      if (options.skipGeocode !== true) {
        console.log('Attempting reverse geocoding for:', location.coords.latitude, location.coords.longitude);
        address = await this.reverseGeocode(
          location.coords.latitude,
          location.coords.longitude
        );
        console.log('Reverse geocoding result:', address);
      }

      // If returnAddressOnly option is set, return just the address string
      if (options.returnAddressOnly) {
        const result = address || `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
        console.log('Returning address-only result:', result);
        return result;
      }

      return {
        ...location,
        address
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location. Please try again.');
      return null;
    }
  }

  static async reverseGeocode(latitude, longitude) {
    try {
      console.log('🔍 LocationService.reverseGeocode called with:', latitude, longitude);
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      console.log('🔍 Raw results from Expo:', results);
      console.log('🔍 Results length:', results.length);

      if (results.length > 0) {
        const result = results[0];
        console.log('🔍 Raw geocode result from Expo:', JSON.stringify(result, null, 2));
        
        const formatted = this.formatAddress(result);
        console.log('🔍 Formatted address:', formatted);
        
        const returnObject = {
          formatted: formatted,
          ...result
        };
        console.log('🔍 Returning object:', JSON.stringify(returnObject, null, 2));
        
        return returnObject;
      }

      console.log('🔍 No results found, returning null');
      return null;
    } catch (error) {
      console.error('🔍 Error reverse geocoding:', error);
      return null;
    }
  }

  static async geocode(address) {
    try {
      console.log('🌍 Location.geocodeAsync called with:', address);
      const results = await Location.geocodeAsync(address);
      console.log('🌍 Location.geocodeAsync returned:', results.length, 'results');
      if (results.length > 0) {
        console.log('🌍 First geocode result:', results[0]);
      }
      return results;
    } catch (error) {
      console.error('🌍 Error geocoding:', error);
      console.error('🌍 Error details:', error.message);
      return [];
    }
  }

  static async searchAddresses(query, options = {}) {
    try {
      console.log('🔍 LocationService.searchAddresses called with query:', query);
      
      if (!query || query.trim().length < 3) {
        console.log('🔍 Query too short, returning empty array');
        return [];
      }

      console.log('🔍 Calling geocode for query:', query.trim());
      const geocodeResults = await this.geocode(query.trim());
      console.log('🔍 Geocode results:', geocodeResults.length, 'items');
      
      if (geocodeResults.length === 0) {
        console.log('🔍 No geocode results found');
        return [];
      }

      console.log('🔍 Processing geocode results with reverse geocoding...');
      // Get detailed address information for each result
      const detailedResults = await Promise.all(
        geocodeResults.slice(0, 5).map(async (result, index) => {
          console.log(`🔍 Processing result ${index + 1}:`, result);
          const address = await this.reverseGeocode(result.latitude, result.longitude);
          console.log(`🔍 Reverse geocode result ${index + 1}:`, address);
          
          return {
            coords: {
              latitude: result.latitude,
              longitude: result.longitude,
            },
            address: address ? {
              formatted: this.formatAddress(address),
              short: this.getShortAddress(address),
              ...address
            } : null,
            searchQuery: query,
            relevanceScore: this.calculateAddressRelevance(query, address)
          };
        })
      );

      // Sort by relevance
      return detailedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error('Error searching addresses:', error);
      return [];
    }
  }

  static calculateAddressRelevance(query, address) {
    if (!address) return 0;
    
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Higher score for exact matches in important fields
    if (address.city?.toLowerCase().includes(queryLower)) score += 10;
    if (address.street?.toLowerCase().includes(queryLower)) score += 8;
    if (address.district?.toLowerCase().includes(queryLower)) score += 6;
    if (address.region?.toLowerCase().includes(queryLower)) score += 4;
    if (address.country?.toLowerCase().includes(queryLower)) score += 2;
    
    return score;
  }

  static getShortAddress(addressObject) {
    if (!addressObject) return 'Unknown';

    console.log('🔍 getShortAddress called with:', addressObject);
    console.log('🔍 Address object keys:', Object.keys(addressObject));

    // Return the most relevant parts for a short display
    if (addressObject.city && addressObject.region) {
      return `${addressObject.city}, ${addressObject.region}`;
    } else if (addressObject.city) {
      return addressObject.city;
    } else if (addressObject.district) {
      return addressObject.district;
    } else if (addressObject.street) {
      return addressObject.street;
    } else if (addressObject.name) {
      return addressObject.name;
    } else if (addressObject.subregion) {
      return addressObject.subregion;
    } else if (addressObject.region) {
      return addressObject.region;
    } else {
      // Fallback to any available property
      const fallback = addressObject.formatted || addressObject.country || 'Location';
      console.log('🔍 Using fallback for short address:', fallback);
      return fallback;
    }
  }

  static formatAddress(addressObject) {
    console.log('LocationService.formatAddress called with:', typeof addressObject, addressObject);
    
    if (!addressObject) return 'Unknown Location';
    
    if (typeof addressObject === 'string') {
      console.log('WARNING: LocationService.formatAddress received a string instead of an object:', addressObject);
      return addressObject; // Just return the string as-is
    }

    const parts = [];
    
    // Try different property names that might be used
    if (addressObject.streetNumber || addressObject.houseNumber) {
      parts.push(addressObject.streetNumber || addressObject.houseNumber);
    }
    if (addressObject.street || addressObject.streetName || addressObject.road) {
      parts.push(addressObject.street || addressObject.streetName || addressObject.road);
    }
    if (addressObject.district || addressObject.subLocality) {
      parts.push(addressObject.district || addressObject.subLocality);
    }
    if (addressObject.city || addressObject.locality) {
      parts.push(addressObject.city || addressObject.locality);
    }
    if (addressObject.region || addressObject.administrativeArea || addressObject.state) {
      parts.push(addressObject.region || addressObject.administrativeArea || addressObject.state);
    }
    if (addressObject.country) {
      parts.push(addressObject.country);
    }
    
    // If we still have no parts, try any available string properties
    if (parts.length === 0) {
      if (addressObject.name) parts.push(addressObject.name);
      if (addressObject.formattedAddress) return addressObject.formattedAddress;
    }

    return parts.join(', ') || 'Unnamed Location';
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  static deg2rad(deg) {
    return deg * (Math.PI / 180);
  }



  static async geocodeAddress(address) {
    try {
      const results = await Location.geocodeAsync(address);
      
      if (results && results.length > 0) {
        return results[0]; // Return first result with latitude/longitude
      }
      
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  static async findNearbyNotes(notes, userLocation, radiusKm = 5) {
    if (!userLocation || !notes) return [];

    return notes.filter(note => {
      if (!note.location || !note.location.coords) return false;

      const distance = this.calculateDistance(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        note.location.coords.latitude,
        note.location.coords.longitude
      );

      return distance <= radiusKm;
    }).map(note => ({
      ...note,
      distance: this.calculateDistance(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        note.location.coords.latitude,
        note.location.coords.longitude
      )
    })).sort((a, b) => a.distance - b.distance);
  }

  static async watchPosition(callback, options = {}) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 10, // Update every 10 meters
          ...options
        },
        callback
      );

      return subscription;
    } catch (error) {
      console.error('Error watching position:', error);
      return null;
    }
  }

  static isLocationEnabled() {
    return Location.hasServicesEnabledAsync();
  }
}

export default LocationService;
