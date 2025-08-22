import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NotificationService } from '../../services/notificationService';
import { PermissionsService } from '../../services/permissionsService';
import { useDarkMode } from '../../hooks/useDarkMode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const NotificationSettingsScreen = ({ navigation }) => {
  const { isDarkMode } = useDarkMode();

  const [settings, setSettings] = useState({
    pushNotifications: false,
    noteLikes: true,
    noteComments: true,
    socialInteractions: true,
    reminderAlerts: true,
    weeklyDigest: false,
  });

  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [pushToken, setPushToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('NOTIFICATION_SETTINGS');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      const isEnabled = await NotificationService.isNotificationEnabled();
      setSettings(prev => ({ ...prev, pushNotifications: isEnabled }));

      const token = await AsyncStorage.getItem('EXPO_PUSH_TOKEN');
      setPushToken(token);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      const permissions = await PermissionsService.getAllPermissions();
      setPermissionStatus(permissions.notifications || 'unknown');
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      setSaving(true);
      await AsyncStorage.setItem('NOTIFICATION_SETTINGS', JSON.stringify(newSettings));
      setSettings(newSettings);
      Haptics.selectionAsync();
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const enablePushNotifications = async () => {
    try {
      setLoading(true);
      const token = await NotificationService.registerForPushNotifications();
      
      if (token) {
        setPushToken(token);
        const newSettings = { ...settings, pushNotifications: true };
        await saveSettings(newSettings);
        setPermissionStatus('granted');
        
        Alert.alert(
          'Success!',
          'Push notifications have been enabled. You\'ll now receive notifications when others interact with your notes.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive push notifications.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => PermissionsService.showPermissionEducation('notifications') }
          ]
        );
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error);
      Alert.alert('Error', 'Failed to enable push notifications');
    } finally {
      setLoading(false);
    }
  };

  const disablePushNotifications = async () => {
    try {
      setSaving(true);
      const success = await NotificationService.unregisterFromPushNotifications();
      
      if (success) {
        setPushToken(null);
        const newSettings = { ...settings, pushNotifications: false };
        await saveSettings(newSettings);
        
        Alert.alert(
          'Disabled',
          'Push notifications have been disabled. You can re-enable them anytime.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error disabling push notifications:', error);
      Alert.alert('Error', 'Failed to disable push notifications');
    } finally {
      setSaving(false);
    }
  };

  const handlePushNotificationToggle = () => {
    if (settings.pushNotifications) {
      Alert.alert(
        'Disable Notifications',
        'Are you sure you want to disable push notifications? You won\'t receive notifications when others interact with your notes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: disablePushNotifications }
        ]
      );
    } else {
      enablePushNotifications();
    }
  };

  const testNotification = async () => {
    try {
      setSaving(true);
      
      // Check if we have permission
      const hasPermission = await NotificationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please enable notification permissions first.');
        return;
      }

      // Check if we have a push token
      const token = await AsyncStorage.getItem('EXPO_PUSH_TOKEN');
      if (!token) {
        Alert.alert('No Push Token', 'Please enable push notifications first to get a push token.');
        return;
      }

      // Send a test push notification
      await NotificationService.sendTestNotification();
      Alert.alert('Success', 'Test push notification sent! Check your device for the notification.');
      
    } catch (error) {
      console.error('Error testing notification:', error);
      Alert.alert('Error', 'Failed to send test notification: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const testBackendHealth = async () => {
    try {
      setSaving(true);
      console.log('Starting backend health check...');
      
      // Run the backend health check
      await NotificationService.testBackendHealth();
      
      Alert.alert(
        'Backend Health Check Complete', 
        'Check the console logs for detailed results of each endpoint test.'
      );
      
    } catch (error) {
      console.error('Error during backend health check:', error);
      Alert.alert('Error', 'Backend health check failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const diagnosePushNotifications = async () => {
    try {
      setSaving(true);
      console.log('Starting push notification diagnosis...');
      
      // Run the comprehensive diagnosis
      await NotificationService.diagnosePushNotifications();
      
      Alert.alert(
        'Push Notification Diagnosis Complete', 
        'Check the console logs for detailed analysis of your push notification setup, including device info, token analysis, and recommendations.'
      );
      
    } catch (error) {
      console.error('Error during push notification diagnosis:', error);
      Alert.alert('Error', 'Push notification diagnosis failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const forceRegenerateToken = async () => {
    try {
      setSaving(true);
      console.log('Force regenerating push token...');
      
      Alert.alert(
        'Regenerate Push Token',
        'This will clear your current push token and generate a new one. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Regenerate', 
            style: 'destructive',
            onPress: async () => {
              const newToken = await NotificationService.forceRegenerateToken();
              if (newToken) {
                Alert.alert(
                  'Success!', 
                  `New push token generated! Check console logs for details.`
                );
              } else {
                Alert.alert('Error', 'Failed to generate new push token. Check console logs.');
              }
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error during token regeneration:', error);
      Alert.alert('Error', 'Token regeneration failed: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderToggleItem = (title, subtitle, key, icon, disabled = false) => (
    <TouchableOpacity
                  style={[
              styles.settingItem,
              {
                backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
                opacity: disabled ? 0.5 : 1
              }
            ]}
            onPress={() => !disabled && toggleSetting(key)}
            disabled={disabled || saving}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: '#007AFF' }]}>
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            {title}
          </Text>
          <Text style={[styles.settingSubtitle, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={[
        styles.toggle,
        {
          backgroundColor: settings[key] ? '#007AFF' : (isDarkMode ? '#48484A' : '#E5E5EA')
        }
      ]}>
        <View style={[
          styles.toggleKnob,
          {
            transform: [{ translateX: settings[key] ? 18 : 2 }]
          }
        ]} />
      </View>
    </TouchableOpacity>
  );

  const renderPermissionStatus = () => {
    const status = PermissionsService.getPermissionStatus(permissionStatus);
    
    return (
      <View style={[styles.permissionStatus, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}>
        <View style={styles.statusLeft}>
          <Ionicons
            name={status.granted ? 'checkmark-circle' : 'alert-circle'}
            size={24}
            color={status.color}
          />
          <View style={styles.statusText}>
            <Text style={[styles.statusTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Notification Permission
            </Text>
            <Text style={[styles.statusSubtitle, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </View>
        {!status.granted && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => PermissionsService.showPermissionEducation('notifications')}
          >
            <Text style={styles.permissionButtonText}>Enable</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
            Loading settings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' }]}>


      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* Permission Status */}
      <View style={[styles.section, styles.firstSection]}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
          Permission Status
        </Text>
        {renderPermissionStatus()}
      </View>

        {/* Push Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            Push Notifications
          </Text>
          
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}
            onPress={handlePushNotificationToggle}
            disabled={saving}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#007AFF' }]}>
                <Ionicons name="notifications" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                  Enable Push Notifications
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
                  Receive notifications when others interact with your notes
                </Text>
              </View>
            </View>
            {saving ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <View style={[
                styles.toggle,
                {
                  backgroundColor: settings.pushNotifications ? '#007AFF' : (isDarkMode ? '#48484A' : '#E5E5EA')
                }
              ]}>
                <View style={[
                  styles.toggleKnob,
                  {
                    transform: [{ translateX: settings.pushNotifications ? 18 : 2 }]
                  }
                ]} />
              </View>
            )}
          </TouchableOpacity>

          {pushToken && (
            <View style={[styles.tokenInfo, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}>
              <Text style={[styles.tokenTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Device Token
              </Text>
              <Text style={[styles.tokenText, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
                {pushToken.substring(0, 20)}...
              </Text>
            </View>
          )}
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            Notification Types
          </Text>
          
          {renderToggleItem(
            'Note Likes',
            'When someone likes your public notes',
            'noteLikes',
            'heart',
            !settings.pushNotifications
          )}
          
          {renderToggleItem(
            'Social Interactions',
            'Comments and other social activities',
            'socialInteractions',
            'people',
            !settings.pushNotifications
          )}
          
          {renderToggleItem(
            'Reminder Alerts',
            'Notifications for your note reminders',
            'reminderAlerts',
            'alarm'
          )}
          
          {renderToggleItem(
            'Weekly Digest',
            'Weekly summary of your notes activity',
            'weeklyDigest',
            'calendar',
            !settings.pushNotifications
          )}
        </View>

        {/* Test Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            Testing
          </Text>
          
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}
            onPress={testNotification}
          >
            <Ionicons name="play-circle" size={24} color="#007AFF" />
            <Text style={[styles.testButtonText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Send Test Notification
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF', marginTop: 12 }]}
            onPress={testBackendHealth}
          >
            <Ionicons name="server" size={24} color="#34C759" />
            <Text style={[styles.testButtonText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Test Backend Health
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF', marginTop: 12 }]}
            onPress={diagnosePushNotifications}
          >
            <Ionicons name="bug" size={24} color="#FF9500" />
            <Text style={[styles.testButtonText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Diagnose Push Notifications
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF', marginTop: 12 }]}
            onPress={forceRegenerateToken}
          >
            <Ionicons name="refresh" size={24} color="#FF3B30" />
            <Text style={[styles.testButtonText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Force Regenerate Token
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  firstSection: {
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
  section: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  permissionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 18,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  tokenInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  tokenTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tokenText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
});

export default NotificationSettingsScreen;
