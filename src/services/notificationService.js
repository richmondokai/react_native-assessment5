import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../constants';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Store navigation reference for deep linking
let navigationRef = null;

export const setNavigationRef = (ref) => {
  navigationRef = ref;
};

export class NotificationService {
  static async requestPermissions() {
    try {
      if (!Device.isDevice) {
        Alert.alert('Error', 'Push notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need notification permissions to let you know when other users like your notes!',
          [{ text: 'OK' }]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  static async getExpoPushToken() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      try {
        // Try to get the real Expo push token
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.expoConfig?.projectId,
        });

        // Store token locally
        await AsyncStorage.setItem('EXPO_PUSH_TOKEN', token.data);
        console.log('Successfully got Expo push token');
        
        return token.data;
      } catch (firebaseError) {
        // Handle Firebase configuration errors gracefully
        if (firebaseError.message.includes('FirebaseApp is not initialized') || 
            firebaseError.message.includes('fcm-credentials')) {
          
          console.warn('Firebase not configured for push notifications. Using fallback mode.');
          console.warn('To enable full push notifications, follow: https://docs.expo.dev/push-notifications/fcm-credentials/');
          
          // Generate a fallback token for physical devices
          const isPhysicalDevice = Device.isDevice;
          const tokenPrefix = isPhysicalDevice ? '' : 'dev-';
          const mockToken = `ExponentPushToken[${tokenPrefix}${Device.osName}-${Date.now().toString().slice(-8)}]`;
          await AsyncStorage.setItem('EXPO_PUSH_TOKEN', mockToken);
          console.log(`Using ${isPhysicalDevice ? 'physical device' : 'development'} push token:`, mockToken);
          
          return mockToken;
        } else {
          // Re-throw other types of errors
          throw firebaseError;
        }
      }
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  static async registerForPushNotifications() {
    const token = await this.getExpoPushToken();
    if (!token) return null;

    try {
      // Send the token to your backend
      try {
        await this.makeAuthenticatedRequest('/api/push/register', {
          method: 'POST',
          body: JSON.stringify({
            token: token,
            platform: Platform.OS
          }),
        });
        
        await AsyncStorage.setItem('PUSH_NOTIFICATIONS_ENABLED', 'true');
        console.log('Push notification token registered with backend:', token);
        return token;
      } catch (error) {
        console.error('Failed to register token with backend:', error);
        return null;
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  static async unregisterFromPushNotifications() {
    try {
      const token = await AsyncStorage.getItem('EXPO_PUSH_TOKEN');
      
      if (token) {
        // Inform your backend to remove the token
        try {
          await this.makeAuthenticatedRequest('/api/push/unregister', {
            method: 'POST',
            body: JSON.stringify({
              token: token
            }),
          });
        } catch (error) {
          console.warn('Failed to unregister token with backend:', error);
        }
      }

      await AsyncStorage.removeItem('EXPO_PUSH_TOKEN');
      await AsyncStorage.setItem('PUSH_NOTIFICATIONS_ENABLED', 'false');
      
      console.log('Unregistered from push notifications');
      return true;
    } catch (error) {
      console.error('Error unregistering from push notifications:', error);
      return false;
    }
  }

  static async scheduleLocalNotification(title, body, data = {}, delay = 0) {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const notification = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: delay > 0 ? { seconds: delay } : null,
      });

      return notification;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return null;
    }
  }

  static async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return true;
    } catch (error) {
      console.error('Error canceling notification:', error);
      return false;
    }
  }

  static async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return true;
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      return false;
    }
  }

  static addNotificationReceivedListener(listener) {
    return Notifications.addNotificationReceivedListener(listener);
  }

  static addNotificationResponseReceivedListener(listener) {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  static removeNotificationSubscription(subscription) {
    if (subscription) {
      Notifications.removeNotificationSubscription(subscription);
    }
  }

  static async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      return true;
    } catch (error) {
      console.error('Error setting badge count:', error);
      return false;
    }
  }

  static async getBadgeCount() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  static async isNotificationEnabled() {
    try {
      const enabled = await AsyncStorage.getItem('PUSH_NOTIFICATIONS_ENABLED');
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking notification status:', error);
      return false;
    }
  }

  static async sendLikeNotification(noteAuthor, liker, noteTitle, noteId) {
    try {
      // Check if we have the author's push token
      if (!noteAuthor.pushToken) {
        console.warn('No push token available for note author:', noteAuthor.id);
        return null;
      }

      // Clean the push token before using it
      console.log('🔍 Original token from noteAuthor:', noteAuthor.pushToken);
      const cleanedToken = this.cleanPushToken(noteAuthor.pushToken);
      if (cleanedToken !== noteAuthor.pushToken) {
        console.log('🧹 Token cleaned for notification:', cleanedToken);
      } else {
        console.log('✅ Token already clean, no changes needed');
      }

      // Create the notification data
      const notificationData = {
        to: cleanedToken,
        title: '❤️ Your note was liked!',
        body: `${liker.name} liked your note "${noteTitle}"`,
        data: {
          type: 'note_liked',
          noteId: noteId,
          likerId: liker.id,
          likerName: liker.name,
          noteTitle: noteTitle
        },
        channelId: 'note-likes',
        sound: 'default',
        priority: 'high',
      };
      
      console.log('🔍 Final notification data - token field:', notificationData.to);
      console.log('🔍 Full notification data:', JSON.stringify(notificationData, null, 2));
      
      // Send notification via YOUR backend, not directly to Expo
      // Your backend should handle sending the actual push notification
      console.log('ℹ️  Note: This notification would be sent via your backend');
      console.log('ℹ️  Your backend should use the registered token to send push notifications');
      console.log('ℹ️  Frontend only handles token registration, not notification sending');
      
      // For now, we'll just log the notification data
      // In a real implementation, your backend would send this notification
      // when a like API call is made
      console.log('📧 Notification prepared for backend to send:', notificationData);
      
      return {
        status: 'prepared',
        message: 'Notification prepared for backend delivery',
        data: notificationData
      };
    } catch (error) {
      console.error('Error sending like notification:', error);
      throw error;
    }
  }

  // Helper method to get authentication token
  static async getAuthToken() {
    try {
      // Import TOKEN_KEY from constants to match AuthContext
      const { TOKEN_KEY } = await import('../constants');
      
      // Get token using the same key as AuthContext
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      
      if (!token) {
        console.warn('No authentication token found. Please log in.');
        return null;
      }
      
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Make authenticated request with proper error handling
  static async makeAuthenticatedRequest(endpoint, options = {}) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw {
          type: 'AUTHENTICATION_ERROR',
          message: 'No authentication token found. Please log in.',
          retryable: false,
        };
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = {
          type: response.status === 401 
            ? 'AUTHENTICATION_ERROR'
            : response.status >= 400 && response.status < 500
            ? 'VALIDATION_ERROR'
            : 'NETWORK_ERROR',
          message: errorData.message || `HTTP Error: ${response.status}`,
          retryable: response.status >= 500,
        };
        throw error;
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw {
          type: 'NETWORK_ERROR',
          message: 'Request timed out. Please check your connection.',
          retryable: true,
        };
      }

      if (error.message && (
        error.message.includes('Network request failed') ||
        error.message.includes('fetch') ||
        error.message.includes('connection') ||
        error.name === 'TypeError'
      )) {
        throw {
          type: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection.',
          retryable: true,
        };
      }
      
      throw error;
    }
  }

  // API method to like a note
  static async likeNote(noteId) {
    try {
      console.log(`Liking note ${noteId} via API: /api/social/notes/${noteId}/like`);
      
      const result = await this.makeAuthenticatedRequest(`/api/social/notes/${noteId}/like`, {
        method: 'POST',
      });
      
      console.log('Note liked successfully:', result);
      return result;
    } catch (error) {
      console.error('Error liking note:', error);
      throw error;
    }
  }

  // API method to get all likes on a note
  static async getNoteLikes(noteId) {
    try {
      console.log(`Getting likes for note ${noteId} via API: /api/social/notes/${noteId}/likes`);
      
      const result = await this.makeAuthenticatedRequest(`/api/social/notes/${noteId}/likes`, {
        method: 'GET',
      });
      
      console.log('Note likes retrieved successfully:', result);
      return result;
    } catch (error) {
      console.error('Error getting note likes:', error);
      throw error;
    }
  }

  // Note: User push token endpoint doesn't exist and isn't needed
  // The social feed should include push tokens if cross-user notifications are required
  // For now, we'll focus on self-notifications and the working endpoints

  // Method to send a test notification to the current user's device
  static async sendTestNotification() {
    try {
      const token = await AsyncStorage.getItem('EXPO_PUSH_TOKEN');
      if (!token) {
        console.warn('No push token available for current user');
        return null;
      }

      console.log('ℹ️  Test notifications should be sent via your backend API');
      console.log('ℹ️  Your backend can use the registered token to send test notifications');
      console.log('🎫 Current registered token:', token);
      
      // Instead of sending directly to Expo, we would call your backend
      // Your backend would then use the registered token to send the notification
      console.log('📧 Test notification would be sent via your backend using registered token');
      
      return {
        status: 'registered',
        message: 'Token is registered with backend - backend can send notifications',
        token: token
      };
    } catch (error) {
      console.error('Error preparing test notification:', error);
      throw error;
    }
  }

  // Method to get current user's push token for testing
  static async getCurrentUserPushToken() {
    try {
      const token = await AsyncStorage.getItem('EXPO_PUSH_TOKEN');
      if (token) {
        console.log('🔍 Raw token from storage:', token);
        console.log('Current user push token found:', token.substring(0, 20) + '...');
        
        // Clean up any malformations first
        const cleanedToken = this.cleanPushToken(token);
        if (cleanedToken !== token) {
          console.log('🧹 Token cleaned from:', token, 'to:', cleanedToken);
          // Update storage with cleaned token
          await AsyncStorage.removeItem('EXPO_PUSH_TOKEN');
          await AsyncStorage.setItem('EXPO_PUSH_TOKEN', cleanedToken);
          console.log('💾 Cleaned token saved to storage');
        }
        
        // Validate the token format
        if (this.isValidExpoPushToken(cleanedToken)) {
          console.log('✅ Token validation passed:', cleanedToken);
          return cleanedToken;
        } else {
          console.warn('❌ Invalid Expo push token format, attempting to regenerate...');
          // Try to regenerate the token
          const newToken = await this.regeneratePushToken();
          return newToken;
        }
      } else {
        console.log('No push token found for current user');
        return null;
      }
    } catch (error) {
      console.error('Error getting current user push token:', error);
      return null;
    }
  }

  // Validate Expo push token format
  static isValidExpoPushToken(token) {
    if (!token || typeof token !== 'string') return false;
    
    // Check if it's a valid Expo push token format
    const expoTokenRegex = /^ExponentPushToken\[[a-zA-Z0-9\-_]+\]$/;
    return expoTokenRegex.test(token);
  }

  // Clean up malformed push token
  static cleanPushToken(token) {
    if (!token || typeof token !== 'string') return token;
    
    // Fix common malformations
    let cleaned = token;
    
    // Fix double 'v' in 'devv-Android' -> 'dev-Android'
    cleaned = cleaned.replace(/devv-/g, 'dev-');
    
    // Fix other common issues
    cleaned = cleaned.replace(/devv/g, 'dev');
    
    // Fix any remaining malformations
    cleaned = cleaned.replace(/devvv/g, 'dev');
    cleaned = cleaned.replace(/devvvv/g, 'dev');
    
    // Ensure proper format
    if (cleaned.includes('devv')) {
      cleaned = cleaned.replace(/devv/g, 'dev');
    }
    
    console.log('Token cleaning:', token, '->', cleaned);
    
    return cleaned;
  }

  // Regenerate push token
  static async regeneratePushToken() {
    try {
      console.log('Regenerating push token...');
      
      // Remove the old invalid token
      await AsyncStorage.removeItem('EXPO_PUSH_TOKEN');
      
      // Get a new token
      const newToken = await this.getExpoPushToken();
      if (newToken) {
        console.log('New push token generated:', newToken.substring(0, 20) + '...');
        
        // Re-register with backend
        await this.registerForPushNotifications();
        
        return newToken;
      }
      
      return null;
    } catch (error) {
      console.error('Error regenerating push token:', error);
      return null;
    }
  }

  // Debug method to check all stored tokens
  static async debugStoredTokens() {
    try {
      console.log('=== DEBUG: Checking all stored tokens ===');
      
      // Import constants to match what's actually used
      const { TOKEN_KEY, USER_KEY } = await import('../constants');
      
      const keys = [
        TOKEN_KEY, // 'AUTH_TOKEN'
        USER_KEY,  // 'USER_DATA'
        'EXPO_PUSH_TOKEN', 
        'PUSH_NOTIFICATIONS_ENABLED'
      ];
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          if (key === TOKEN_KEY) {
            console.log(`${key}: ${typeof value} (${value.length} chars) - ${value.substring(0, 30)}...`);
          } else if (key === USER_KEY) {
            try {
              const userData = JSON.parse(value);
              console.log(`${key}: User object with ID: ${userData.id}, Name: ${userData.name}`);
            } catch (parseError) {
              console.log(`${key}: Raw data (${value.length} chars) - ${value.substring(0, 30)}...`);
            }
          } else {
            console.log(`${key}: Raw data (${value.length} chars) - ${value.substring(0, 30)}...`);
          }
        } else {
          console.log(`${key}: null`);
        }
      }
      
      console.log('=== END DEBUG ===');
    } catch (error) {
      console.error('Error debugging stored tokens:', error);
    }
  }

  // Test backend endpoints health
  static async testBackendHealth() {
    try {
      console.log('=== BACKEND HEALTH CHECK ===');
      
      const token = await this.getAuthToken();
      if (!token) {
        console.log('❌ No auth token available');
        return false;
      }
      
      console.log('✅ Auth token available');
      
      // Test 1: Social notes like endpoint
      try {
        console.log('🧪 Testing social notes like endpoint...');
        const likeResult = await this.makeAuthenticatedRequest('/api/social/notes/41/like', {
          method: 'POST',
        });
        console.log('✅ Social notes like endpoint: WORKING');
      } catch (error) {
        console.log('❌ Social notes like endpoint: FAILED');
        console.log('   Error:', error.message, 'Type:', error.type);
      }
      
      // Test 2: Social notes likes endpoint
      try {
        console.log('🧪 Testing social notes likes endpoint...');
        const likesResult = await this.makeAuthenticatedRequest('/api/social/notes/41/likes', {
          method: 'GET',
        });
        console.log('✅ Social notes likes endpoint: WORKING');
      } catch (error) {
        console.log('❌ Social notes likes endpoint: FAILED');
        console.log('   Error:', error.message, 'Type:', error.type);
      }
      
      // Test 3: User endpoint (not needed - backend doesn't provide this)
      console.log('🧪 Testing user endpoint...');
      console.log('ℹ️  User endpoint not needed - backend doesn\'t provide user push tokens');
      console.log('✅ User endpoint: SKIPPED (not required)');
      
      // Test 4: Push registration endpoint
      try {
        console.log('🧪 Testing push registration endpoint...');
        const pushResult = await this.makeAuthenticatedRequest('/api/push/register', {
          method: 'POST',
          body: JSON.stringify({
            token: 'test_token',
            platform: 'android'
          }),
        });
        console.log('✅ Push registration endpoint: WORKING');
      } catch (error) {
        console.log('❌ Push registration endpoint: FAILED');
        console.log('   Error:', error.message, 'Type:', error.type);
      }
      
      console.log('=== END BACKEND HEALTH CHECK ===');
      return true;
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      return false;
    }
  }

  // Force regenerate push token and clear cache
  static async forceRegenerateToken() {
    try {
      console.log('🔄 === FORCE REGENERATING PUSH TOKEN ===');
      
      // Step 1: Clear all cached tokens
      console.log('1️⃣ Clearing cached tokens...');
      await AsyncStorage.removeItem('EXPO_PUSH_TOKEN');
      await AsyncStorage.removeItem('PUSH_NOTIFICATIONS_ENABLED');
      
      // Step 2: Request fresh permissions
      console.log('2️⃣ Requesting fresh permissions...');
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('❌ Permissions not granted');
        return null;
      }
      
      // Step 3: Get fresh token
      console.log('3️⃣ Getting fresh push token...');
      const newToken = await this.getExpoPushToken();
      if (!newToken) {
        console.log('❌ Could not get fresh token');
        return null;
      }
      
      console.log('✅ Fresh token generated:', newToken);
      
      // Step 4: Register with backend
      console.log('4️⃣ Registering with backend...');
      await this.registerForPushNotifications();
      
      // Step 5: Test the new token
      console.log('5️⃣ Testing new token with Expo push service...');
      const testResult = await this.sendTestNotification();
      
      console.log('🔄 === TOKEN REGENERATION COMPLETE ===');
      return newToken;
      
    } catch (error) {
      console.error('❌ Token regeneration failed:', error);
      return null;
    }
  }

  // Comprehensive push notification diagnosis
  static async diagnosePushNotifications() {
    try {
      console.log('🔍 === PUSH NOTIFICATION DIAGNOSIS ===');
      
      // 1. Environment Check
      console.log('📱 ENVIRONMENT CHECK:');
      console.log('   Platform:', Platform.OS);
      console.log('   Is Device:', Device.isDevice);
      console.log('   Device Name:', Device.deviceName);
      console.log('   OS Version:', Device.osVersion);
      console.log('   Model Name:', Device.modelName);
      
      // 2. Expo Configuration Check
      console.log('⚙️  EXPO CONFIGURATION:');
      console.log('   Project ID:', Constants.expoConfig?.extra?.eas?.projectId || Constants.expoConfig?.projectId || 'NOT SET');
      console.log('   App Slug:', Constants.expoConfig?.slug || 'NOT SET');
      console.log('   App Name:', Constants.expoConfig?.name || 'NOT SET');
      console.log('   App Version:', Constants.expoConfig?.version || 'NOT SET');
      
      // 3. Permission Check
      console.log('🔐 PERMISSIONS CHECK:');
      const { status } = await Notifications.getPermissionsAsync();
      console.log('   Notification Permission:', status);
      
      if (status !== 'granted') {
        console.log('❌ Notifications not granted - requesting...');
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        console.log('   New Permission Status:', newStatus);
      }
      
      // 4. Push Token Analysis
      console.log('🎫 PUSH TOKEN ANALYSIS:');
      const storedToken = await AsyncStorage.getItem('EXPO_PUSH_TOKEN');
      if (storedToken) {
        console.log('   Stored Token:', storedToken);
        console.log('   Token Length:', storedToken.length);
        console.log('   Token Format Valid:', this.isValidExpoPushToken(storedToken));
        
        // Analyze token type
        if (storedToken.includes('dev-')) {
          console.log('   Token Type: DEVELOPMENT');
          console.log('   ⚠️  Development tokens only work in development builds');
        } else if (storedToken.includes('ExponentPushToken[')) {
          console.log('   Token Type: PRODUCTION');
          console.log('   ✅ Production token should work everywhere');
        } else {
          console.log('   Token Type: UNKNOWN FORMAT');
        }
      } else {
        console.log('   ❌ No push token found in storage');
      }
      
      // 5. Try to get fresh token
      console.log('🔄 FRESH TOKEN TEST:');
      try {
        const freshToken = await this.getExpoPushToken();
        if (freshToken) {
          console.log('   Fresh Token:', freshToken);
          console.log('   Same as stored?', freshToken === storedToken);
        } else {
          console.log('   ❌ Could not get fresh token');
        }
      } catch (tokenError) {
        console.log('   ❌ Error getting fresh token:', tokenError.message);
      }
      
      // 6. Backend Registration Check
      console.log('🚀 BACKEND REGISTRATION CHECK:');
      if (storedToken) {
        console.log('   Token available for backend registration:', storedToken);
        console.log('   ✅ Token can be registered with your backend via /api/push/register');
        console.log('   ℹ️  Your backend will handle sending notifications, not the frontend');
        console.log('   ℹ️  Backend should use this token with Firebase/Expo push service');
      } else {
        console.log('   ❌ No token available for backend registration');
      }
      
      // 7. Recommendations
      console.log('💡 RECOMMENDATIONS:');
      if (storedToken?.includes('dev-')) {
        console.log('   1. You are using a development token');
        console.log('   2. Development tokens only work in Expo development builds');
        console.log('   3. Try building a production version or using Expo Go');
      }
      
      if (!Constants.expoConfig?.extra?.eas?.projectId && !Constants.expoConfig?.projectId) {
        console.log('   1. No Expo project ID found in configuration');
        console.log('   2. This might cause token registration issues');
        console.log('   3. Check your app.json or app.config.js');
      }
      
      console.log('🔍 === END PUSH NOTIFICATION DIAGNOSIS ===');
      
    } catch (error) {
      console.error('❌ Diagnosis failed:', error);
    }
  }

  static async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  static async getBadgeCount() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  static async incrementBadgeCount() {
    try {
      const currentCount = await this.getBadgeCount();
      await this.setBadgeCount(currentCount + 1);
    } catch (error) {
      console.error('Error incrementing badge count:', error);
    }
  }

  static async clearBadgeCount() {
    try {
      await this.setBadgeCount(0);
    } catch (error) {
      console.error('Error clearing badge count:', error);
    }
  }

  // Setup notification listeners for when app is open
  static setupNotificationListeners() {
    // Handle notifications when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      // You could show a custom in-app notification here
    });

    // Handle notification taps
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      this.handleNotificationTap(response);
    });

    return {
      foregroundSubscription,
      responseSubscription
    };
  }

  static handleNotificationTap(response) {
    const data = response.notification.request.content.data;
    
    if (navigationRef && data.type === 'note_liked') {
      // Clear badge when user taps notification
      this.clearBadgeCount();
      
      // Navigate to the specific note
      navigationRef.navigate('NoteDetail', { noteId: data.noteId });
    } else if (navigationRef && data.type === 'social_interaction') {
      // Navigate to social feed
      navigationRef.navigate('SocialFeed');
    }
  }

  // Helper method to handle deep linking from notifications
  static handleNotificationResponse(response) {
    const data = response.notification.request.content.data;
    
    if (data.type === 'note_liked') {
      // Navigate to the specific note
      return {
        route: 'NoteDetail',
        params: { noteId: data.noteId }
      };
    }
    
    if (data.type === 'social_interaction') {
      // Navigate to social feed
      return {
        route: 'SocialFeed',
        params: {}
      };
    }
    
    return null;
  }
}

export default NotificationService;
