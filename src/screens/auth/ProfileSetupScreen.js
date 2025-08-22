import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Animated,
  Dimensions,
  Keyboard,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { CameraService } from '../../services/cameraService';
import { LocationService } from '../../services/locationService';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useNetwork } from '../../context/NetworkContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const ProfileSetupScreen = ({ navigation, route }) => {
  const { register, updateProfile, user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const { isConnected } = useNetwork();
  const scrollViewRef = useRef(null);

  // Get signup data from navigation params
  const signupData = route?.params?.signupData;

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: signupData?.name || user?.name || '',
    email: signupData?.email || user?.email || '',
    bio: '',
    phoneNumber: '',
    website: '',
    profilePicture: user?.profilePicture || null,
    location: {
      address: '',
      coordinates: null,
      city: '',
      country: '',
    },
    preferences: {
      defaultPrivacy: 'public',
      enableLocationTagging: true,
      enableNotifications: true,
      enablePushNotifications: true,
      enableEmailNotifications: false,
      theme: 'auto',
      language: 'en',
      autoBackup: true,
      offlineMode: false,
    },
    interests: [],
    workInfo: {
      company: '',
      position: '',
      industry: '',
    },
    socialLinks: {
      twitter: '',
      linkedin: '',
      instagram: '',
    },
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [fieldFocus, setFieldFocus] = useState({});
  const [touched, setTouched] = useState({});
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Field refs for keyboard navigation
  const fieldRefs = {
    name: useRef(null),
    email: useRef(null),
    bio: useRef(null),
    phoneNumber: useRef(null),
    website: useRef(null),
    company: useRef(null),
    position: useRef(null),
  };

  const steps = [
    {
      title: 'Profile Picture',
      subtitle: 'Add a photo to personalize your profile',
      icon: 'camera-outline'
    },
    {
      title: 'Basic Information',
      subtitle: 'Tell us a bit about yourself',
      icon: 'person-outline'
    },
    {
      title: 'Location',
      subtitle: 'Help others discover your notes',
      icon: 'location-outline'
    },
    {
      title: 'Preferences',
      subtitle: 'Customize your experience',
      icon: 'settings-outline'
    }
  ];

  // Auto-save functionality
  useEffect(() => {
    const autoSave = async () => {
      if (currentStep > 0) { // Don't auto-save on first step
        setAutoSaving(true);
        await AsyncStorage.setItem('PROFILE_SETUP_DRAFT', JSON.stringify({
          profileData,
          currentStep
        }));
        setAutoSaving(false);
      }
    };

    const timeoutId = setTimeout(autoSave, 2000); // Auto-save after 2 seconds of inactivity
    return () => clearTimeout(timeoutId);
  }, [profileData, currentStep]);

  // Load draft on component mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draft = await AsyncStorage.getItem('PROFILE_SETUP_DRAFT');
        if (draft) {
          const { profileData: draftData, currentStep: draftStep } = JSON.parse(draft);
          setProfileData(draftData);
          setCurrentStep(draftStep);
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    };

    loadDraft();
  }, []);

  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 1: // Basic Information
        if (!profileData.name.trim()) {
          errors.name = 'Name is required';
        } else if (profileData.name.trim().length < 2) {
          errors.name = 'Name must be at least 2 characters';
        }
        break;
      case 2: // Location - optional, no validation needed
        break;
      case 3: // Preferences - no validation needed
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      Haptics.selectionAsync();
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        handleFinish();
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handlePrevious = () => {
    Haptics.selectionAsync();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      if (signupData) {
        // Create account with signup data + profile data
        const additionalProfileData = {
          bio: profileData.bio,
          location: profileData.location,
          preferences: profileData.preferences,
          phoneNumber: profileData.phoneNumber,
          website: profileData.website,
          workInfo: profileData.workInfo,
          socialLinks: profileData.socialLinks,
          interests: profileData.interests
        };
        
        console.log('=== PROFILE SETUP REGISTRATION DEBUG ===');
        console.log('Profile Data:', profileData);
        console.log('Additional Profile Data being sent:', additionalProfileData);
        console.log('Profile Picture:', profileData.profilePicture);
        
        const result = await register(
          signupData.email,
          signupData.password,
          profileData.name,
          profileData.profilePicture,
          additionalProfileData
        );
        
        if (result.success) {
          // Clear draft
          await AsyncStorage.removeItem('PROFILE_SETUP_DRAFT');
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Account Created Successfully!',
            'Your account has been created and profile set up. Welcome to Notes App!',
            [{ text: 'OK', onPress: () => {
              // Account creation is complete, user will be navigated to main app
              // by the AuthContext when authentication state is checked
              navigation.navigate('Login');
            }}]
          );
        } else {
          throw new Error(result.error);
        }
      } else {
        // Fallback: Update existing profile
        const result = await updateProfile(profileData);
        if (result.success) {
          await AsyncStorage.removeItem('PROFILE_SETUP_DRAFT');
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Success!',
            'Your profile has been updated successfully.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelection = () => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add your profile picture',
      [
        { text: 'Camera', onPress: () => selectImage('camera') },
        { text: 'Photo Library', onPress: () => selectImage('library') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const selectImage = async (source) => {
    try {
      let result;
      if (source === 'camera') {
        result = await CameraService.openCamera({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8
        });
      } else {
        result = await CameraService.openImagePicker({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8
        });
      }

      if (result) {
        setProfileData(prev => ({
          ...prev,
          profilePicture: result.uri
        }));
        Haptics.selectionAsync();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleLocationSelection = async () => {
    try {
      setLoading(true);
      const location = await LocationService.getCurrentLocation();
      if (location) {
        setProfileData(prev => ({
          ...prev,
          location: {
            coords: location.coords,
            address: location.address?.formatted || 'Current Location'
          }
        }));
        Haptics.selectionAsync();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key, value) => {
    setProfileData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };

  const renderProgressBar = () => (
    <View style={[styles.progressContainer, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F8F9FA' }]}>
      <View style={styles.progressBar}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressStep,
              {
                backgroundColor: index <= currentStep ? '#007AFF' : (isDarkMode ? '#48484A' : '#E5E5EA')
              }
            ]}
          />
        ))}
      </View>
      <Text style={[styles.progressText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
        Step {currentStep + 1} of {steps.length}
      </Text>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Profile Picture
        return (
          <View style={styles.stepContainer}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handleImageSelection}>
              {profileData.profilePicture ? (
                <Image source={{ uri: profileData.profilePicture }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDarkMode ? '#48484A' : '#E5E5EA' }]}>
                  <Ionicons name="camera" size={40} color={isDarkMode ? '#FFFFFF' : '#8E8E93'} />
                </View>
              )}
              <View style={styles.cameraIconContainer}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.instructionText, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
              Tap to {profileData.profilePicture ? 'change' : 'add'} your profile picture
            </Text>
          </View>
        );

      case 1: // Basic Information
        return (
          <View style={styles.stepContainer}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Full Name *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                    borderColor: validationErrors.name ? '#FF3B30' : (fieldFocus.name ? '#007AFF' : (isDarkMode ? '#48484A' : '#E5E5EA'))
                  }
                ]}
                placeholder="Enter your full name"
                placeholderTextColor={isDarkMode ? '#8E8E93' : '#6D6D80'}
                value={profileData.name}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, name: text }))}
                onFocus={() => setFieldFocus(prev => ({ ...prev, name: true }))}
                onBlur={() => setFieldFocus(prev => ({ ...prev, name: false }))}
                autoCapitalize="words"
                autoCorrect={false}
              />
              {validationErrors.name && (
                <Text style={styles.errorText}>{validationErrors.name}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Bio (Optional)
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                    borderColor: fieldFocus.bio ? '#007AFF' : (isDarkMode ? '#48484A' : '#E5E5EA')
                  }
                ]}
                placeholder="Tell us a bit about yourself..."
                placeholderTextColor={isDarkMode ? '#8E8E93' : '#6D6D80'}
                value={profileData.bio}
                onChangeText={(text) => setProfileData(prev => ({ ...prev, bio: text }))}
                onFocus={() => setFieldFocus(prev => ({ ...prev, bio: true }))}
                onBlur={() => setFieldFocus(prev => ({ ...prev, bio: false }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        );

      case 2: // Location
        return (
          <View style={styles.stepContainer}>
            <TouchableOpacity
              style={[
                styles.locationButton,
                { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }
              ]}
              onPress={handleLocationSelection}
              disabled={loading}
            >
              <Ionicons
                name="location-outline"
                size={24}
                color={profileData.location ? '#007AFF' : (isDarkMode ? '#8E8E93' : '#6D6D80')}
              />
              <View style={styles.locationTextContainer}>
                <Text style={[styles.locationTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                  {profileData.location ? 'Location Added' : 'Add Current Location'}
                </Text>
                {profileData.location && (
                  <Text style={[styles.locationSubtitle, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
                    {profileData.location.address}
                  </Text>
                )}
              </View>
              {loading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#8E8E93' : '#6D6D80'} />
              )}
            </TouchableOpacity>
            
            <Text style={[styles.instructionText, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
              Adding your location helps others discover your public notes nearby (optional)
            </Text>
          </View>
        );

      case 3: // Preferences
        return (
          <View style={styles.stepContainer}>
            <View style={styles.preferenceSection}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Privacy & Sharing
              </Text>
              
              <TouchableOpacity
                style={[styles.preferenceItem, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}
                onPress={() => updatePreference('enableLocationTagging', !profileData.preferences.enableLocationTagging)}
              >
                <View style={styles.preferenceLeft}>
                  <Ionicons name="location" size={20} color="#007AFF" />
                  <Text style={[styles.preferenceText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                    Auto-tag Location
                  </Text>
                </View>
                <View style={[
                  styles.toggle,
                  { backgroundColor: profileData.preferences.enableLocationTagging ? '#007AFF' : (isDarkMode ? '#48484A' : '#E5E5EA') }
                ]}>
                  <View style={[
                    styles.toggleKnob,
                    { transform: [{ translateX: profileData.preferences.enableLocationTagging ? 18 : 2 }] }
                  ]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.preferenceItem, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}
                onPress={() => updatePreference('enableNotifications', !profileData.preferences.enableNotifications)}
              >
                <View style={styles.preferenceLeft}>
                  <Ionicons name="notifications" size={20} color="#007AFF" />
                  <Text style={[styles.preferenceText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                    Enable Notifications
                  </Text>
                </View>
                <View style={[
                  styles.toggle,
                  { backgroundColor: profileData.preferences.enableNotifications ? '#007AFF' : (isDarkMode ? '#48484A' : '#E5E5EA') }
                ]}>
                  <View style={[
                    styles.toggleKnob,
                    { transform: [{ translateX: profileData.preferences.enableNotifications ? 18 : 2 }] }
                  ]} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            Profile Setup
          </Text>
          <View style={styles.autoSaveIndicator}>
            {autoSaving && (
              <ActivityIndicator size="small" color="#007AFF" />
            )}
          </View>
        </View>

        {renderProgressBar()}

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.stepHeader}>
            <View style={[styles.stepIconContainer, { backgroundColor: '#007AFF' }]}>
              <Ionicons name={steps[currentStep].icon} size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.stepTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              {steps[currentStep].title}
            </Text>
            <Text style={[styles.stepSubtitle, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
              {steps[currentStep].subtitle}
            </Text>
          </View>

          {renderStep()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={[styles.navigationContainer, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
              <Text style={styles.previousButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.nextButton, { flex: currentStep === 0 ? 1 : 0.6 }]}
            onPress={handleNext}
            disabled={loading}
          >
            <LinearGradient
              colors={['#007AFF', '#0051D0']}
              style={styles.nextButtonGradient}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.nextButtonText}>
                  {currentStep === steps.length - 1 ? (signupData ? 'Create Account' : 'Finish') : 'Next'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 8 : 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Platform.OS === 'ios' ? '#C6C6C8' : '#E5E5EA',
    backgroundColor: Platform.OS === 'ios' ? '#F9F9F9' : undefined,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Platform.OS === 'ios' ? 17 : 18,
    fontWeight: Platform.OS === 'ios' ? '600' : '600',
    textAlign: 'center',
    marginRight: 40,
  },
  autoSaveIndicator: {
    width: 40,
    alignItems: 'center',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressBar: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  stepHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  stepIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  stepContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginVertical: 32,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconContainer: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 16,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderRadius: Platform.OS === 'ios' ? 10 : 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 12,
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    minHeight: Platform.OS === 'ios' ? 44 : undefined,
  },
  textArea: {
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderRadius: Platform.OS === 'ios' ? 10 : 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 12,
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    minHeight: Platform.OS === 'ios' ? 88 : 100,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 16,
    borderRadius: Platform.OS === 'ios' ? 10 : 12,
    marginBottom: 16,
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderColor: Platform.OS === 'ios' ? '#C6C6C8' : '#E5E5EA',
    minHeight: Platform.OS === 'ios' ? 44 : undefined,
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  locationSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  preferenceSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 16,
    borderRadius: Platform.OS === 'ios' ? 10 : 12,
    marginBottom: Platform.OS === 'ios' ? 8 : 12,
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderColor: Platform.OS === 'ios' ? '#C6C6C8' : '#E5E5EA',
    minHeight: Platform.OS === 'ios' ? 44 : undefined,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceText: {
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: Platform.OS === 'ios' ? '400' : '500',
    marginLeft: 12,
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
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Platform.OS === 'ios' ? '#C6C6C8' : '#E5E5EA',
    backgroundColor: Platform.OS === 'ios' ? '#F9F9F9' : undefined,
  },
  previousButton: {
    flex: 0.4,
    height: Platform.OS === 'ios' ? 44 : 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Platform.OS === 'ios' ? 8 : 12,
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderColor: '#007AFF',
    marginRight: 12,
  },
  previousButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    height: Platform.OS === 'ios' ? 44 : 50,
    borderRadius: Platform.OS === 'ios' ? 8 : 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: Platform.OS === 'ios' ? '600' : '600',
  },
});

export default ProfileSetupScreen;
