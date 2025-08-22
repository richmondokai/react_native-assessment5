import * as Location from 'expo-location';

export class LocationUtils {
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

  static formatDistance(distanceKm) {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`;
    } else {
      return `${Math.round(distanceKm)}km`;
    }
  }

  static formatAddress(addressObject) {
    console.log('LocationUtils.formatAddress called with:', typeof addressObject, addressObject);
    
    if (!addressObject) return 'Unknown Location';
    
    if (typeof addressObject === 'string') {
      console.log('WARNING: formatAddress received a string instead of an object:', addressObject);
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

  static getShortAddress(addressObject) {
    console.log('LocationUtils.getShortAddress called with:', typeof addressObject, addressObject);
    
    if (!addressObject) return 'Unknown';
    
    if (typeof addressObject === 'string') {
      console.log('WARNING: getShortAddress received a string instead of an object:', addressObject);
      // Extract a short version from the string
      const parts = addressObject.split(', ');
      return parts.length > 1 ? parts.slice(-2).join(', ') : parts[0] || 'Location';
    }

    // Return the most relevant parts for a short display
    const city = addressObject.city || addressObject.locality;
    const region = addressObject.region || addressObject.administrativeArea || addressObject.state;
    const district = addressObject.district || addressObject.subLocality;
    const street = addressObject.street || addressObject.streetName || addressObject.road;
    
    if (city && region) {
      return `${city}, ${region}`;
    } else if (city) {
      return city;
    } else if (district) {
      return district;
    } else if (street) {
      return street;
    } else if (addressObject.name) {
      return addressObject.name;
    } else if (region) {
      return region;
    }

    return 'Location';
  }

  static async getCurrentPosition(options = {}) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        ...options
      });

      return location;
    } catch (error) {
      console.error('Error getting current position:', error);
      throw error;
    }
  }



  static async geocode(address) {
    try {
      const results = await Location.geocodeAsync(address);
      return results;
    } catch (error) {
      console.error('Error geocoding:', error);
      return [];
    }
  }

  static isValidCoordinate(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  static getLocationAccuracyDescription(accuracy) {
    if (!accuracy) return 'Unknown';
    
    if (accuracy < 5) return 'Very High';
    if (accuracy < 10) return 'High';
    if (accuracy < 50) return 'Medium';
    if (accuracy < 100) return 'Low';
    return 'Very Low';
  }

  static createLocationObject(coordinates, address = null) {
    if (!coordinates || !this.isValidCoordinate(coordinates.latitude, coordinates.longitude)) {
      return null;
    }

    return {
      coords: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy: coordinates.accuracy || null,
        altitude: coordinates.altitude || null,
        heading: coordinates.heading || null,
        speed: coordinates.speed || null,
      },
      address: address ? {
        formatted: this.formatAddress(address),
        short: this.getShortAddress(address),
        ...address
      } : null,
      timestamp: new Date().toISOString(),
    };
  }

  static getMapRegion(latitude, longitude, latitudeDelta = 0.01, longitudeDelta = 0.01) {
    return {
      latitude,
      longitude,
      latitudeDelta,
      longitudeDelta,
    };
  }

  static findNearestLocation(targetCoords, locations, radiusKm = 10) {
    if (!locations || locations.length === 0) return null;

    let nearest = null;
    let shortestDistance = Infinity;

    locations.forEach(location => {
      if (location.coords) {
        const distance = this.calculateDistance(
          targetCoords.latitude,
          targetCoords.longitude,
          location.coords.latitude,
          location.coords.longitude
        );

        if (distance <= radiusKm && distance < shortestDistance) {
          nearest = { ...location, distance };
          shortestDistance = distance;
        }
      }
    });

    return nearest;
  }

  static groupLocationsByProximity(locations, radiusKm = 1) {
    if (!locations || locations.length === 0) return [];

    const groups = [];
    const processed = new Set();

    locations.forEach((location, index) => {
      if (processed.has(index) || !location.coords) return;

      const group = [location];
      processed.add(index);

      locations.forEach((otherLocation, otherIndex) => {
        if (
          processed.has(otherIndex) || 
          index === otherIndex || 
          !otherLocation.coords
        ) return;

        const distance = this.calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          otherLocation.coords.latitude,
          otherLocation.coords.longitude
        );

        if (distance <= radiusKm) {
          group.push({ ...otherLocation, distance });
          processed.add(otherIndex);
        }
      });

      groups.push(group);
    });

    return groups;
  }

  static getBoundingBox(locations, padding = 0.01) {
    if (!locations || locations.length === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    locations.forEach(location => {
      if (location.coords) {
        minLat = Math.min(minLat, location.coords.latitude);
        maxLat = Math.max(maxLat, location.coords.latitude);
        minLng = Math.min(minLng, location.coords.longitude);
        maxLng = Math.max(maxLng, location.coords.longitude);
      }
    });

    if (minLat === Infinity) return null;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) + padding,
      longitudeDelta: (maxLng - minLng) + padding,
    };
  }

  static isLocationStale(location, maxAgeMinutes = 30) {
    if (!location || !location.timestamp) return true;

    const locationTime = new Date(location.timestamp);
    const now = new Date();
    const ageMinutes = (now - locationTime) / (1000 * 60);

    return ageMinutes > maxAgeMinutes;
  }
}

export default LocationUtils;
