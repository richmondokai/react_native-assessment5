import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PermissionsService } from '../../services/permissionsService';
import { useDarkMode } from '../../hooks/useDarkMode';

const PermissionsScreen = ({ navigation }) => {
  const { isDarkMode } = useDarkMode();

  const [permissions, setPermissions] = useState({
    camera: 'unknown',
    location: 'unknown',
    notifications: 'unknown',
    mediaLibrary: 'unknown',
  });

  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState({});

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const currentPermissions = await PermissionsService.getAllPermissions();
      setPermissions(currentPermissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async (permissionType) => {
    try {
      setRequesting(prev => ({ ...prev, [permissionType]: true }));
      
      let granted = false;
      
      switch (permissionType) {
        case 'camera':
          granted = await PermissionsService.requestCameraPermissions();
          break;
        case 'location':
          granted = await PermissionsService.requestLocationPermissions();
          break;
        case 'notifications':
          granted = await PermissionsService.requestNotificationPermissions();
          break;
        case 'mediaLibrary':
          granted = await PermissionsService.requestMediaLibraryPermissions();
          break;
      }

      if (granted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Reload permissions to get updated status
      await loadPermissions();
    } catch (error) {
      console.error(`Error requesting ${permissionType} permission:`, error);
      Alert.alert('Error', `Failed to request ${permissionType} permission`);
    } finally {
      setRequesting(prev => ({ ...prev, [permissionType]: false }));
    }
  };

  const openSettings = () => {
    Alert.alert(
      'Open Settings',
      'You can manage app permissions in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() }
      ]
    );
  };

  const renderPermissionItem = (type, title, description, icon, benefits) => {
    const status = PermissionsService.getPermissionStatus(permissions[type]);
    const isRequesting = requesting[type];

    return (
      <View style={[styles.permissionItem, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}>
        <View style={styles.permissionHeader}>
          <View style={styles.permissionLeft}>
            <View style={[styles.iconContainer, { backgroundColor: status.granted ? '#4CAF50' : '#FF9500' }]}>
              <Ionicons name={icon} size={24} color="#FFFFFF" />
            </View>
            <View style={styles.permissionText}>
              <Text style={[styles.permissionTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                {title}
              </Text>
              <Text style={[styles.permissionDescription, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
                {description}
              </Text>
            </View>
          </View>
          
          <View style={styles.permissionRight}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
            <View style={[styles.statusIndicator, { backgroundColor: status.color }]} />
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={[styles.benefitsTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            Benefits:
          </Text>
          {benefits.map((benefit, index) => (
            <Text key={index} style={[styles.benefitItem, { color: isDarkMode ? '#E5E5E7' : '#3A3A3C' }]}>
              • {benefit}
            </Text>
          ))}
        </View>

        {/* Action Button */}
        {!status.granted && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: permissions[type] === 'denied' ? '#FF9500' : '#007AFF',
                opacity: isRequesting ? 0.6 : 1
              }
            ]}
            onPress={() => {
              if (permissions[type] === 'denied') {
                openSettings();
              } else {
                requestPermission(type);
              }
            }}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={permissions[type] === 'denied' ? 'settings' : 'checkmark-circle'}
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>
                  {permissions[type] === 'denied' ? 'Open Settings' : 'Grant Permission'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSummary = () => {
    const grantedCount = Object.values(permissions).filter(status => status === 'granted').length;
    const totalCount = Object.keys(permissions).length;
    const isAllGranted = grantedCount === totalCount;

    return (
      <View style={[styles.summaryContainer, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}>
        <View style={styles.summaryHeader}>
          <Ionicons
            name={isAllGranted ? 'shield-checkmark' : 'shield-outline'}
            size={32}
            color={isAllGranted ? '#4CAF50' : '#FF9500'}
          />
          <View style={styles.summaryText}>
            <Text style={[styles.summaryTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              {isAllGranted ? 'All Permissions Granted' : 'Permissions Needed'}
            </Text>
            <Text style={[styles.summarySubtitle, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
              {grantedCount} of {totalCount} permissions granted
            </Text>
          </View>
        </View>
        
        {!isAllGranted && (
          <TouchableOpacity
            style={styles.grantAllButton}
            onPress={async () => {
              const results = await PermissionsService.checkAndRequestPermissions();
              await loadPermissions();
            }}
          >
            <Text style={styles.grantAllButtonText}>Grant All Permissions</Text>
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
            Checking permissions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
          App Permissions
        </Text>
        <TouchableOpacity onPress={loadPermissions}>
          <Ionicons name="refresh" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        {renderSummary()}

        {/* Permissions List */}
        <View style={styles.permissionsContainer}>
          {renderPermissionItem(
            'camera',
            'Camera',
            'Take photos for your notes',
            'camera',
            [
              'Capture photos directly in notes',
              'Quick visual documentation',
              'Enhanced note content'
            ]
          )}

          {renderPermissionItem(
            'mediaLibrary',
            'Photo Library',
            'Access existing photos',
            'images',
            [
              'Attach existing photos to notes',
              'Choose from your photo collection',
              'Rich multimedia notes'
            ]
          )}

          {renderPermissionItem(
            'location',
            'Location',
            'Organize notes by location',
            'location',
            [
              'Automatic location tagging',
              'Find notes near you',
              'Location-based organization'
            ]
          )}

          {renderPermissionItem(
            'notifications',
            'Notifications',
            'Get notified about interactions',
            'notifications',
            [
              'Know when your notes are liked',
              'Reminder notifications',
              'Social interaction alerts'
            ]
          )}
        </View>

        {/* Info Section */}
        <View style={[styles.infoContainer, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}>
          <Ionicons name="information-circle" size={24} color="#007AFF" />
          <View style={styles.infoText}>
            <Text style={[styles.infoTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              Why We Need These Permissions
            </Text>
            <Text style={[styles.infoDescription, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
              These permissions help us provide you with the best possible experience. 
              You can always change these settings later in your device settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryText: {
    flex: 1,
    marginLeft: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
  },
  grantAllButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  grantAllButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionsContainer: {
    paddingHorizontal: 16,
  },
  permissionItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  permissionRight: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  benefitsContainer: {
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  benefitItem: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default PermissionsScreen;
