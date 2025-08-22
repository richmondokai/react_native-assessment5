import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { NOTES_KEY } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { clearUserSpecificData } from '../../utils/debugStorage';

const SettingsScreen = ({ navigation }) => {
  const [darkMode, setDarkMode] = useState(false);

  const [autoSave, setAutoSave] = useState(true);
  const [fontSize, setFontSize] = useState('medium');
  const { toggleTheme } = useTheme();
  const { user } = useAuth();
  

  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      // Always start with light mode
      setDarkMode(false);
      
      const settings = await AsyncStorage.getItem('settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        // Only set dark mode if it's explicitly true
        if (parsedSettings.darkMode === true) {
          setDarkMode(true);
        } else {
          // Ensure dark mode is false
          setDarkMode(false);
        }
        

        setAutoSave(parsedSettings.autoSave !== false);
        setFontSize(parsedSettings.fontSize || 'medium');
      }
    } catch (error) {
      console.log('Error loading settings:', error);
      // In case of error, ensure we're in light mode
      setDarkMode(false);
    }
  };
  
  const saveSettings = async () => {
    try {
      const settings = {
        darkMode,

        autoSave,
        fontSize
      };
      await AsyncStorage.setItem('settings', JSON.stringify(settings));
    } catch (error) {
      console.log('Error saving settings:', error);
    }
  };
  
  const toggleDarkMode = () => {
    const newDarkModeValue = !darkMode;
    setDarkMode(newDarkModeValue);
    toggleTheme(newDarkModeValue); // Update the theme context
    setTimeout(() => saveSettings(), 100);
  };
  

  
  const toggleAutoSave = () => {
    setAutoSave(!autoSave);
    setTimeout(() => saveSettings(), 100);
  };
  
  const handleFontSizeChange = (size) => {
    setFontSize(size);
    setTimeout(() => saveSettings(), 100);
  };
  
  const handleBackupData = () => {
    Alert.alert(
      'Backup Data',
      'This feature would backup all your notes to the cloud.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Backup', onPress: () => {
          // In a real app, this would trigger a backup process
          Alert.alert('Success', 'Your data has been backed up successfully.');
        }}
      ]
    );
  };
  
  const handleRestoreData = () => {
    Alert.alert(
      'Restore Data',
      'This feature would restore your notes from a cloud backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: () => {
          // In a real app, this would trigger a restore process
          Alert.alert('Success', 'Your data has been restored successfully.');
        }}
      ]
    );
  };
  
  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to delete all notes? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            console.log('=== CLEARING ALL USER DATA ===');
            const userId = user?.email || user?.id;
            
            if (userId) {
              console.log('Clearing user-specific data for:', userId);
              await clearUserSpecificData();
            } else {
              console.log('Clearing generic data');
              await AsyncStorage.removeItem(NOTES_KEY);
            }
            console.log('All user data cleared successfully');
            Alert.alert('Success', 'All notes have been deleted.');
          } catch (error) {
            console.log('Error clearing data:', error);
            Alert.alert('Error', 'Failed to clear data. Please try again.');
          }
        }}
      ]
    );
  };

  // Determine styles based on dark mode
  const containerStyle = darkMode 
    ? [styles.container, { backgroundColor: '#121212' }] 
    : styles.container;
  
  const sectionTitleStyle = darkMode 
    ? [styles.sectionTitle, { color: '#f0f0f0' }] 
    : styles.sectionTitle;
  
  const settingsGroupStyle = darkMode 
    ? [styles.settingsGroup, { backgroundColor: '#1e1e1e' }] 
    : styles.settingsGroup;
  
  const settingLabelStyle = darkMode 
    ? [styles.settingLabel, { color: '#f0f0f0' }] 
    : styles.settingLabel;
  
  const iconColor = darkMode ? '#b0b0b0' : '#555';
  const footerTextStyle = darkMode 
    ? [styles.footerText, { color: '#b0b0b0' }] 
    : styles.footerText;

  return (
    <ScrollView style={containerStyle}>
      <Text style={sectionTitleStyle}>Appearance</Text>
      <View style={settingsGroupStyle}>
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="moon-outline" size={22} color={iconColor} style={styles.settingIcon} />
            <Text style={settingLabelStyle}>Dark Mode</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: '#ddd', true: '#007AFF' }}
            thumbColor="#fff"
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="text-outline" size={22} color={iconColor} style={styles.settingIcon} />
            <Text style={settingLabelStyle}>Font Size</Text>
          </View>
          <View style={styles.fontSizeOptions}>
            <TouchableOpacity
              style={[
                styles.fontSizeButton,
                fontSize === 'small' && styles.fontSizeButtonActive
              ]}
              onPress={() => handleFontSizeChange('small')}
            >
              <Text style={[
                styles.fontSizeButtonText,
                fontSize === 'small' && styles.fontSizeButtonTextActive
              ]}>S</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.fontSizeButton,
                fontSize === 'medium' && styles.fontSizeButtonActive
              ]}
              onPress={() => handleFontSizeChange('medium')}
            >
              <Text style={[
                styles.fontSizeButtonText,
                fontSize === 'medium' && styles.fontSizeButtonTextActive
              ]}>M</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.fontSizeButton,
                fontSize === 'large' && styles.fontSizeButtonActive
              ]}
              onPress={() => handleFontSizeChange('large')}
            >
              <Text style={[
                styles.fontSizeButtonText,
                fontSize === 'large' && styles.fontSizeButtonTextActive
              ]}>L</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <Text style={sectionTitleStyle}>Notifications</Text>
      <View style={settingsGroupStyle}>
        <TouchableOpacity 
          style={styles.settingButton} 
          onPress={() => navigation.navigate('NotificationSettings')}
        >
          <View style={styles.settingLabelContainer}>
            <Ionicons name="notifications-outline" size={22} color={iconColor} style={styles.settingIcon} />
            <Text style={settingLabelStyle}>Notification Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>
      
      <Text style={sectionTitleStyle}>Editor</Text>
      <View style={settingsGroupStyle}>
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="save-outline" size={22} color={iconColor} style={styles.settingIcon} />
            <Text style={settingLabelStyle}>Auto Save</Text>
          </View>
          <Switch
            value={autoSave}
            onValueChange={toggleAutoSave}
            trackColor={{ false: '#ddd', true: '#007AFF' }}
            thumbColor="#fff"
          />
        </View>
      </View>
      
      <Text style={sectionTitleStyle}>Data Management</Text>
      <View style={settingsGroupStyle}>
        <TouchableOpacity style={styles.settingButton} onPress={handleBackupData}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="cloud-upload-outline" size={22} color={iconColor} style={styles.settingIcon} />
            <Text style={settingLabelStyle}>Backup Data</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingButton} onPress={handleRestoreData}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="cloud-download-outline" size={22} color={iconColor} style={styles.settingIcon} />
            <Text style={settingLabelStyle}>Restore Data</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingButton} onPress={handleClearData}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="trash-outline" size={22} color="#FF3B30" style={styles.settingIcon} />
            <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>Clear All Data</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>
      
      <Text style={sectionTitleStyle}>About</Text>
      <View style={settingsGroupStyle}>
        <TouchableOpacity 
          style={styles.settingButton}
          onPress={() => navigation.navigate('Help')}
        >
          <View style={styles.settingLabelContainer}>
            <Ionicons name="help-circle-outline" size={22} color={iconColor} style={styles.settingIcon} />
            <Text style={settingLabelStyle}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Ionicons name="information-circle-outline" size={22} color={iconColor} style={styles.settingIcon} />
            <Text style={settingLabelStyle}>Version</Text>
          </View>
          <Text style={darkMode ? [styles.versionText, { color: '#b0b0b0' }] : styles.versionText}>1.0.0</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={footerTextStyle}>Notes App © 2023</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? '#F2F2F7' : '#f8f8f8',
  },
  sectionTitle: {
    fontSize: Platform.OS === 'ios' ? 13 : 18,
    fontWeight: Platform.OS === 'ios' ? '400' : 'bold',
    textTransform: Platform.OS === 'ios' ? 'uppercase' : 'none',
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    marginTop: Platform.OS === 'ios' ? 35 : 24,
    marginBottom: Platform.OS === 'ios' ? 6 : 8,
    paddingHorizontal: 16,
    color: Platform.OS === 'ios' ? '#8E8E93' : '#333',
  },
  settingsGroup: {
    backgroundColor: '#fff',
    marginHorizontal: Platform.OS === 'ios' ? 0 : 16,
    marginBottom: Platform.OS === 'ios' ? 35 : 8,
    borderRadius: Platform.OS === 'ios' ? 0 : 8,
    ...Platform.select({
      ios: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: '#C6C6C8',
      },
      android: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }
    }),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 11 : 14,
    paddingHorizontal: 16,
    minHeight: Platform.OS === 'ios' ? 44 : undefined,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Platform.OS === 'ios' ? '#C6C6C8' : '#f0f0f0',
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 11 : 14,
    paddingHorizontal: 16,
    minHeight: Platform.OS === 'ios' ? 44 : undefined,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Platform.OS === 'ios' ? '#C6C6C8' : '#f0f0f0',
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: Platform.OS === 'ios' ? 12 : 12,
    width: 29,
    textAlign: 'center',
  },
  settingLabel: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    color: Platform.OS === 'ios' ? '#000000' : '#333',
    fontWeight: Platform.OS === 'ios' ? '400' : 'normal',
  },
  fontSizeOptions: {
    flexDirection: 'row',
  },
  fontSizeButton: {
    width: Platform.OS === 'ios' ? 28 : 30,
    height: Platform.OS === 'ios' ? 28 : 30,
    borderRadius: Platform.OS === 'ios' ? 14 : 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: Platform.OS === 'ios' ? '#E5E5EA' : '#f0f0f0',
    ...Platform.select({
      ios: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#C6C6C8',
      }
    }),
  },
  fontSizeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  fontSizeButtonText: {
    fontSize: Platform.OS === 'ios' ? 13 : 14,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
    color: Platform.OS === 'ios' ? '#000000' : '#555',
  },
  fontSizeButtonTextActive: {
    color: '#fff',
  },
  versionText: {
    fontSize: Platform.OS === 'ios' ? 17 : 14,
    color: Platform.OS === 'ios' ? '#8E8E93' : '#999',
  },
  footer: {
    padding: Platform.OS === 'ios' ? 20 : 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: Platform.OS === 'ios' ? 13 : 14,
    color: Platform.OS === 'ios' ? '#8E8E93' : '#999',
  },
});

export default SettingsScreen;
