import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import * as MediaLibrary from 'expo-media-library';
import { CameraService } from '../../services/cameraService';
import { useDarkMode } from '../../hooks/useDarkMode';

const { width, height } = Dimensions.get('window');

const CameraScreen = ({ navigation, route }) => {
  const { isDarkMode } = useDarkMode();
  const { onCapture } = route.params || {};
  
  const cameraRef = useRef(null);
  const animatedValue = useRef(new Animated.Value(1)).current;
  
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState('back');
  const [flashMode, setFlashMode] = useState('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const [focusPoint, setFocusPoint] = useState(null);
  const [cameraKey, setCameraKey] = useState(0);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Force camera remount when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('Camera screen focused, remounting camera...');
      setCameraKey(prev => prev + 1);
      setFocusPoint(null); // Clear any focus point
    }, [])
  );

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      
      // Animate capture button
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: true,
      });

      if (photo) {
        console.log('Photo captured:', photo.uri);
        
        // Process and optimize the image
        const processedImage = await CameraService.processImage(photo, {
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1920
        });

        // Save to media library
        try {
          const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
          if (mediaLibraryPermission.granted) {
            const asset = await MediaLibrary.createAssetAsync(processedImage.sizes.original);
            console.log('Image saved to gallery:', asset.id);
            
            // Show success feedback
            Alert.alert(
              'Photo Saved!',
              'Your photo has been saved to the gallery and is ready to use.',
              [
                {
                  text: 'View Gallery',
                  onPress: () => navigation.navigate('PhotoGallery')
                },
                {
                  text: 'Take Another',
                  style: 'cancel'
                }
              ]
            );
          } else {
            console.log('Media library permission not granted');
            Alert.alert('Permission Required', 'Please allow access to save photos to your gallery.');
          }
        } catch (saveError) {
          console.error('Error saving to gallery:', saveError);
          Alert.alert('Save Error', 'Failed to save photo to gallery, but photo was captured successfully.');
        }

        if (onCapture) {
          onCapture(processedImage);
        }
      }

      // Don't navigate back immediately, let user choose
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraType = () => {
    console.log('Toggling camera type from:', cameraType);
    setCameraType(current =>
      current === 'back' ? 'front' : 'back'
    );
    Haptics.selectionAsync();
    // Force remount when switching cameras to ensure proper initialization
    setTimeout(() => {
      setCameraKey(prev => prev + 1);
    }, 100);
  };

  const toggleFlash = () => {
    const modes = ['off', 'on', 'auto'];
    
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFlashMode(modes[nextIndex]);
    Haptics.selectionAsync();
  };

  const handleFocus = (event) => {
    const { locationX, locationY } = event.nativeEvent;
    setFocusPoint({ x: locationX, y: locationY });
    
    // Clear focus point after 2 seconds
    setTimeout(() => {
      setFocusPoint(null);
    }, 2000);
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on':
        return 'flash';
      case 'auto':
        return 'flash-outline';
      case 'off':
      default:
        return 'flash-off';
    }
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={80} color="#007AFF" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionSubtitle}>
            📸 Take photos directly within the app{'\n'}
            📝 Attach images to your notes instantly{'\n'}
            🎯 No need to switch between apps{'\n'}
            🔒 Your photos stay private and secure
          </Text>
          <View style={styles.permissionSteps}>
            <Text style={styles.stepsTitle}>What happens next:</Text>
            <Text style={styles.stepText}>• Tap "Allow Camera Access" below</Text>
            <Text style={styles.stepText}>• Select "Allow" in the system dialog</Text>
            <Text style={styles.stepText}>• Start taking photos for your notes!</Text>
          </View>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Ionicons name="camera" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.permissionButtonText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={() => Alert.alert(
            'Camera Settings', 
            'You can change camera permissions anytime in your device Settings > Privacy & Security > Camera > Notes App',
            [{ text: 'OK' }]
          )}>
            <Ionicons name="settings-outline" size={16} color="#007AFF" style={{ marginRight: 6 }} />
            <Text style={styles.settingsButtonText}>Manage in Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back to Notes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          key={cameraKey}
          ref={cameraRef}
          style={styles.camera}
          facing={cameraType}
          flash={flashMode}
          onTouchStart={handleFocus}
        />
        
        {/* Camera Guidelines */}
        <View style={styles.guidelines} pointerEvents="none">
          <View style={[styles.guideline, styles.guidelineVertical1]} />
          <View style={[styles.guideline, styles.guidelineVertical2]} />
          <View style={[styles.guideline, styles.guidelineHorizontal1]} />
          <View style={[styles.guideline, styles.guidelineHorizontal2]} />
        </View>
        
        {/* Focus indicator */}
        {focusPoint && (
          <View
            style={[
              styles.focusIndicator,
              {
                left: focusPoint.x - 25,
                top: focusPoint.y - 25,
              },
            ]}
            pointerEvents="none"
          />
        )}
      </View>

      {/* Top Controls */}
      <View style={styles.topControls} pointerEvents="box-none">
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={() => {
            console.log('Close button pressed');
            navigation.goBack();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={() => {
            console.log('Flash button pressed');
            toggleFlash();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name={getFlashIcon()} size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls} pointerEvents="box-none">
        <TouchableOpacity 
          style={styles.galleryButton}
          onPress={() => {
            console.log('Gallery button pressed');
            navigation.navigate('PhotoGallery');
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="images" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureButton}
          onPress={() => {
            console.log('Capture button pressed');
            takePicture();
          }}
          disabled={isCapturing}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.captureButtonInner,
              {
                transform: [{ scale: animatedValue }],
                opacity: isCapturing ? 0.7 : 1,
              },
            ]}
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.flipButton} 
          onPress={() => {
            console.log('Flip camera button pressed');
            toggleCameraType();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F2F2F7',
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionSubtitle: {
    fontSize: 16,
    color: '#6D6D80',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionSteps: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  stepText: {
    fontSize: 14,
    color: '#6D6D80',
    marginBottom: 8,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  settingsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#6D6D80',
    fontSize: 16,
    fontWeight: '500',
  },
  camera: {
    flex: 1,
    backgroundColor: '#000000',
  },
  focusIndicator: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 25,
    backgroundColor: 'transparent',
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
    elevation: 10,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    zIndex: 10,
    elevation: 10,
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  guidelines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  guideline: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },
  guidelineVertical1: {
    width: 1,
    height: '100%',
    left: width / 3,
  },
  guidelineVertical2: {
    width: 1,
    height: '100%',
    left: (width * 2) / 3,
  },
  guidelineHorizontal1: {
    width: '100%',
    height: 1,
    top: height / 3,
  },
  guidelineHorizontal2: {
    width: '100%',
    height: 1,
    top: (height * 2) / 3,
  },
});

export default CameraScreen;
