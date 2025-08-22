import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

export class CameraService {
  static async requestPermissions(showEducation = true) {
    try {
      // Check current permissions first
      const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      // If both are already granted, return true
      if (cameraPermission.granted && mediaLibraryPermission.granted) {
        return true;
      }

      // Show educational dialog if needed
      if (showEducation && (!cameraPermission.granted || !mediaLibraryPermission.granted)) {
        const permissions = [];
        if (!cameraPermission.granted) permissions.push('Camera');
        if (!mediaLibraryPermission.granted) permissions.push('Photo Library');
        
        await new Promise((resolve) => {
          Alert.alert(
            'Permission Required',
            `📸 We need ${permissions.join(' and ')} access to enhance your note-taking experience:\n\n` +
            '• Take photos directly within the app\n' +
            '• Browse and select existing photos\n' +
            '• Attach images to your notes instantly\n' +
            '• Keep your photos organized and secure\n\n' +
            'Your privacy is important - we only access photos when you choose to use them.',
            [
              {
                text: 'Not Now',
                style: 'cancel',
                onPress: resolve
              },
              {
                text: 'Allow Access',
                onPress: resolve
              }
            ]
          );
        });
      }

      // Request permissions
      const cameraRequest = !cameraPermission.granted ? 
        await ImagePicker.requestCameraPermissionsAsync() : cameraPermission;
      const mediaLibraryRequest = !mediaLibraryPermission.granted ? 
        await ImagePicker.requestMediaLibraryPermissionsAsync() : mediaLibraryPermission;
      
      const allGranted = cameraRequest.granted && mediaLibraryRequest.granted;
      
      // Handle denied permissions with helpful guidance
      if (!allGranted) {
        const deniedPermissions = [];
        if (!cameraRequest.granted) deniedPermissions.push('Camera');
        if (!mediaLibraryRequest.granted) deniedPermissions.push('Photo Library');
        
        const canAskAgain = cameraRequest.canAskAgain && mediaLibraryRequest.canAskAgain;
        
        if (!canAskAgain) {
          Alert.alert(
            'Permissions Needed',
            `${deniedPermissions.join(' and ')} access is required for this feature.\n\n` +
            'To enable this feature:\n' +
            '1. Go to Settings → Privacy & Security\n' +
            '2. Select Camera or Photos\n' +
            '3. Find Notes App and enable access\n' +
            '4. Return to the app and try again',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => {
                // Note: Linking.openSettings() would be ideal here
                console.log('User should open device settings');
              }}
            ]
          );
        } else {
          Alert.alert(
            'Permission Needed',
            `${deniedPermissions.join(' and ')} access is needed to use this feature.\n\n` +
            'Please allow access to continue.',
            [{ text: 'OK' }]
          );
        }
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      Alert.alert(
        'Permission Error',
        'There was an issue requesting permissions. Please check your device settings and try again.',
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  static async openCamera(options = {}) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: options.aspect || [1, 1],
        quality: options.quality || 0.8,
        ...options
      });

      if (result.canceled) return null;

      const image = result.assets[0];
      return await this.processImage(image, options);
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
      return null;
    }
  }

  static async openImagePicker(options = {}) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing !== false,
        aspect: options.aspect || [1, 1],
        quality: options.quality || 0.8,
        allowsMultipleSelection: options.allowsMultipleSelection || false,
        ...options
      });

      if (result.canceled) return null;

      if (options.allowsMultipleSelection) {
        const processedImages = await Promise.all(
          result.assets.map(image => this.processImage(image, options))
        );
        return processedImages;
      } else {
        const image = result.assets[0];
        return await this.processImage(image, options);
      }
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
      return null;
    }
  }

  static async processImage(image, options = {}) {
    try {
      let processedImage = { ...image };

      // Create optimized versions for different screen sizes
      const sizes = {
        original: image.uri,
        large: image.uri,
        medium: image.uri,
        thumbnail: image.uri
      };

      // Get image dimensions
      const { width: originalWidth, height: originalHeight } = image;
      
      // Define size thresholds
      const largeMaxSize = options.largeMaxSize || 1200;
      const mediumMaxSize = options.mediumMaxSize || 800;
      const thumbnailSize = options.thumbnailSize || 300;

      // Generate large version (for detail views)
      if (originalWidth > largeMaxSize || originalHeight > largeMaxSize) {
        const largeFactor = largeMaxSize / Math.max(originalWidth, originalHeight);
        const largeResult = await ImageManipulator.manipulateAsync(
          image.uri,
          [{
            resize: {
              width: Math.round(originalWidth * largeFactor),
              height: Math.round(originalHeight * largeFactor),
            }
          }],
          { compress: options.quality || 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        sizes.large = largeResult.uri;
      }

      // Generate medium version (for grid views)
      if (originalWidth > mediumMaxSize || originalHeight > mediumMaxSize) {
        const mediumFactor = mediumMaxSize / Math.max(originalWidth, originalHeight);
        const mediumResult = await ImageManipulator.manipulateAsync(
          image.uri,
          [{
            resize: {
              width: Math.round(originalWidth * mediumFactor),
              height: Math.round(originalHeight * mediumFactor),
            }
          }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        sizes.medium = mediumResult.uri;
      }

      // Generate thumbnail (for quick previews)
      const thumbnailFactor = thumbnailSize / Math.max(originalWidth, originalHeight);
      const thumbnailResult = await ImageManipulator.manipulateAsync(
        image.uri,
        [{
          resize: {
            width: Math.round(originalWidth * thumbnailFactor),
            height: Math.round(originalHeight * thumbnailFactor),
          }
        }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );
      sizes.thumbnail = thumbnailResult.uri;

      // Add sizes and metadata to processed image
      processedImage.sizes = sizes;
      processedImage.uri = sizes.large; // Use large as default
      processedImage.metadata = {
        originalWidth,
        originalHeight,
        aspectRatio: originalWidth / originalHeight,
        orientation: originalWidth > originalHeight ? 'landscape' : originalHeight > originalWidth ? 'portrait' : 'square',
        timestamp: Date.now(),
        fileSize: originalWidth * originalHeight * 3, // Rough estimate in bytes (RGB)
        compressionRatio: {
          large: 0.8,
          medium: 0.7,
          thumbnail: 0.5
        }
      };

      console.log('Image processed with sizes:', {
        original: `${originalWidth}x${originalHeight}`,
        large: sizes.large !== image.uri ? 'resized' : 'original',
        medium: sizes.medium !== image.uri ? 'resized' : 'original',
        thumbnail: 'generated'
      });

      // Resize image for performance if needed (legacy support)
      if (options.resize) {
        const manipulateResult = await ImageManipulator.manipulateAsync(
          image.uri,
          [{ resize: options.resize }],
          { compress: options.quality || 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        processedImage = { ...processedImage, ...manipulateResult };
      }

      // Generate thumbnail if requested (legacy support)
      if (options.generateThumbnail) {
        const thumbnailResult = await ImageManipulator.manipulateAsync(
          processedImage.uri,
          [{ resize: { width: 150, height: 150 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        processedImage.thumbnail = thumbnailResult.uri;
      }

      // Add metadata
      processedImage.metadata = {
        timestamp: new Date().toISOString(),
        fileSize: processedImage.fileSize || 0,
        originalWidth: image.width,
        originalHeight: image.height,
      };

      return processedImage;
    } catch (error) {
      console.error('Error processing image:', error);
      return image; // Return original if processing fails
    }
  }

  static async saveToGallery(uri) {
    try {
      const asset = await MediaLibrary.createAssetAsync(uri);
      return asset;
    } catch (error) {
      console.error('Error saving to gallery:', error);
      return null;
    }
  }

  static async getGalleryImages(options = {}) {
    try {
      // Request media library permission first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to display your images.',
          [{ text: 'OK' }]
        );
        return [];
      }

      const {
        first = 200, // Increased from 50 to 200 to capture more recent images
        mediaType = 'photo',
        sortBy = 'creationTime',
        album = null
      } = options;

      console.log(`Fetching ${first} most recent images from gallery...`);

      // Get images from media library, sorted by newest first
      const result = await MediaLibrary.getAssetsAsync({
        first,
        mediaType,
        sortBy: [sortBy],
        album
      });

      console.log(`MediaLibrary returned ${result.assets.length} assets`);

      // Process the assets to include additional metadata
      const processedImages = result.assets.map(asset => ({
        id: asset.id,
        uri: asset.uri,
        filename: asset.filename,
        width: asset.width,
        height: asset.height,
        creationTime: asset.creationTime,
        modificationTime: asset.modificationTime,
        mediaType: asset.mediaType,
        duration: asset.duration,
        // Add thumbnail URI for faster loading in grids
        thumbnailUri: asset.uri, // MediaLibrary provides thumbnails automatically
      }));

      // Sort by creation time (newest first) to ensure recently captured images appear first
      processedImages.sort((a, b) => b.creationTime - a.creationTime);

      console.log(`Processed ${processedImages.length} images, newest:`, 
        processedImages.length > 0 ? {
          id: processedImages[0].id,
          filename: processedImages[0].filename,
          createdAt: new Date(processedImages[0].creationTime).toLocaleString()
        } : 'none'
      );

      return processedImages;
    } catch (error) {
      console.error('Error loading gallery images:', error);
      return [];
    }
  }

  static async cropImage(uri, cropData) {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ crop: cropData }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      return result;
    } catch (error) {
      console.error('Error cropping image:', error);
      return null;
    }
  }

  static getImageDimensions(uri) {
    return new Promise((resolve, reject) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });
  }
}

export default CameraService;
