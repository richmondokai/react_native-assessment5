import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

export class PermissionsService {
  static async requestCameraPermissions() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return this.handlePermissionResult('camera', status);
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      return false;
    }
  }

  static async requestLocationPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return this.handlePermissionResult('location', status);
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  static async requestNotificationPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return this.handlePermissionResult('notifications', status);
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  static async requestMediaLibraryPermissions() {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return this.handlePermissionResult('media library', status);
    } catch (error) {
      console.error('Error requesting media library permissions:', error);
      return false;
    }
  }

  static async getAllPermissions() {
    try {
      const [camera, location, notifications, mediaLibrary] = await Promise.all([
        ImagePicker.getCameraPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
        Notifications.getPermissionsAsync(),
        MediaLibrary.getPermissionsAsync(),
      ]);

      return {
        camera: camera.status,
        location: location.status,
        notifications: notifications.status,
        mediaLibrary: mediaLibrary.status,
      };
    } catch (error) {
      console.error('Error getting permissions:', error);
      return {};
    }
  }

  static handlePermissionResult(permissionType, status) {
    if (status === 'granted') {
      return true;
    }

    if (status === 'denied') {
      this.showPermissionEducation(permissionType);
      return false;
    }

    if (status === 'undetermined') {
      // Permission hasn't been asked yet
      return false;
    }

    return false;
  }

  static showPermissionEducation(permissionType) {
    const messages = {
      camera: {
        title: 'Camera Access Needed',
        message: 'To capture photos for your notes, we need access to your camera. You can enable this in your device settings.',
        benefits: ['Take photos directly in notes', 'Capture memories and important moments', 'Quick visual documentation']
      },
      location: {
        title: 'Location Access Needed',
        message: 'To help organize your notes by location and find nearby notes, we need access to your location.',
        benefits: ['Automatic location tagging', 'Find notes near you', 'Location-based organization']
      },
      notifications: {
        title: 'Notification Permission Needed',
        message: 'To notify you when others interact with your notes, we need permission to send notifications.',
        benefits: ['Know when your notes are liked', 'Stay connected with the community', 'Never miss important interactions']
      },
      'media library': {
        title: 'Photo Library Access Needed',
        message: 'To attach existing photos to your notes, we need access to your photo library.',
        benefits: ['Attach existing photos', 'Choose from your memories', 'Enhanced note content']
      }
    };

    const config = messages[permissionType] || {
      title: 'Permission Needed',
      message: 'This permission is needed for the app to work properly.',
      benefits: []
    };

    Alert.alert(
      config.title,
      `${config.message}\n\nBenefits:\n${config.benefits.map(b => `• ${b}`).join('\n')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  }

  static async checkAndRequestPermissions() {
    const permissions = await this.getAllPermissions();
    const results = {};

    // Check each permission and request if needed
    if (permissions.camera !== 'granted') {
      results.camera = await this.requestCameraPermissions();
    } else {
      results.camera = true;
    }

    if (permissions.location !== 'granted') {
      results.location = await this.requestLocationPermissions();
    } else {
      results.location = true;
    }

    if (permissions.notifications !== 'granted') {
      results.notifications = await this.requestNotificationPermissions();
    } else {
      results.notifications = true;
    }

    if (permissions.mediaLibrary !== 'granted') {
      results.mediaLibrary = await this.requestMediaLibraryPermissions();
    } else {
      results.mediaLibrary = true;
    }

    return results;
  }

  static getPermissionStatus(status) {
    switch (status) {
      case 'granted':
        return { granted: true, text: 'Granted', color: '#4CAF50' };
      case 'denied':
        return { granted: false, text: 'Denied', color: '#F44336' };
      case 'undetermined':
        return { granted: false, text: 'Not Asked', color: '#FF9800' };
      default:
        return { granted: false, text: 'Unknown', color: '#9E9E9E' };
    }
  }

  static async hasAllRequiredPermissions() {
    const permissions = await this.getAllPermissions();
    return (
      permissions.camera === 'granted' &&
      permissions.location === 'granted' &&
      permissions.notifications === 'granted' &&
      permissions.mediaLibrary === 'granted'
    );
  }
}

export default PermissionsService;
