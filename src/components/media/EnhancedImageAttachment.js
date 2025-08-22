import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { useDarkMode } from '../../hooks/useDarkMode';
import * as FileSystem from 'expo-file-system';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const EnhancedImageAttachment = ({
  attachments = [],
  onAttachmentsChange,
  maxImages = 10,
  style
}) => {
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef();

  // Filter image attachments
  const imageAttachments = attachments.filter(att => att.type === 'image');

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: mediaLibraryStatus } = await MediaLibrary.requestPermissionsAsync();
      
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Please grant camera and photo library permissions to add images.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const compressAndProcessImage = async (imageUri, options = {}) => {
    try {
      console.log('🖼️ Starting image compression for:', imageUri);
      
      // Get image info
      const imageInfo = await FileSystem.getInfoAsync(imageUri);
      console.log('🖼️ Original image size:', Math.round(imageInfo.size / 1024), 'KB');

      // Create thumbnail (small version for grid view)
      const thumbnailResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 200, height: 200 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Create medium resolution version for viewing
      const mediumResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 800 } }], // Maintain aspect ratio
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Get metadata from original image
      let metadata = {
        width: 0,
        height: 0,
        location: null,
        dateTaken: new Date().toISOString(),
        originalSize: imageInfo.size
      };

      // Try to get EXIF data if available
      try {
        if (options.exif) {
          metadata = {
            ...metadata,
            ...options.exif,
            location: options.exif.GPS ? {
              latitude: options.exif.GPS.Latitude,
              longitude: options.exif.GPS.Longitude
            } : null
          };
        }
      } catch (error) {
        console.warn('Could not extract EXIF data:', error);
      }

      // Get final compressed file sizes
      const thumbnailInfo = await FileSystem.getInfoAsync(thumbnailResult.uri);
      const mediumInfo = await FileSystem.getInfoAsync(mediumResult.uri);

      console.log('🖼️ Thumbnail size:', Math.round(thumbnailInfo.size / 1024), 'KB');
      console.log('🖼️ Medium size:', Math.round(mediumInfo.size / 1024), 'KB');

      return {
        thumbnail: thumbnailResult.uri,
        medium: mediumResult.uri,
        original: imageUri,
        metadata: {
          ...metadata,
          thumbnailSize: thumbnailInfo.size,
          mediumSize: mediumInfo.size,
          compressionRatio: Math.round((1 - mediumInfo.size / imageInfo.size) * 100)
        }
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  };

  const addImageFromCamera = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (imageAttachments.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only add up to ${maxImages} images per note.`);
      return;
    }

    try {
      setIsProcessing(true);
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
        exif: true, // Include EXIF data
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('🖼️ Camera image captured:', asset.uri);
        
        const processedImage = await compressAndProcessImage(asset.uri, {
          exif: asset.exif
        });

        const newAttachment = {
          id: Date.now().toString(),
          type: 'image',
          uri: processedImage.medium,
          thumbnail: processedImage.thumbnail,
          original: processedImage.original,
          metadata: {
            ...processedImage.metadata,
            source: 'camera',
            addedAt: new Date().toISOString(),
            width: asset.width,
            height: asset.height
          }
        };

        console.log('🖼️ Created image attachment:', newAttachment);
        const updatedAttachments = [...attachments, newAttachment];
        onAttachmentsChange(updatedAttachments);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const addImageFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (imageAttachments.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only add up to ${maxImages} images per note.`);
      return;
    }

    try {
      setIsProcessing(true);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: Math.min(5, maxImages - imageAttachments.length), // Allow multiple but respect limits
        allowsEditing: false,
        quality: 1,
        exif: true,
      });

      if (!result.canceled && result.assets) {
        console.log('🖼️ Selected', result.assets.length, 'images from library');
        
        const newAttachments = [];
        
        for (const asset of result.assets) {
          try {
            const processedImage = await compressAndProcessImage(asset.uri, {
              exif: asset.exif
            });

            const newAttachment = {
              id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'image',
              uri: processedImage.medium,
              thumbnail: processedImage.thumbnail,
              original: processedImage.original,
              metadata: {
                ...processedImage.metadata,
                source: 'library',
                addedAt: new Date().toISOString(),
                width: asset.width,
                height: asset.height
              }
            };

            newAttachments.push(newAttachment);
            console.log('🖼️ Processed image:', newAttachment.id);
          } catch (error) {
            console.error('Error processing image:', asset.uri, error);
          }
        }

        if (newAttachments.length > 0) {
          const updatedAttachments = [...attachments, ...newAttachments];
          onAttachmentsChange(updatedAttachments);
          console.log('🖼️ Added', newAttachments.length, 'new image attachments');
        }
      }
    } catch (error) {
      console.error('Error selecting photos:', error);
      Alert.alert('Error', 'Failed to select photos. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeImage = (imageId) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedAttachments = attachments.filter(att => att.id !== imageId);
            onAttachmentsChange(updatedAttachments);
          }
        }
      ]
    );
  };

  const openGallery = (startIndex = 0) => {
    setCurrentImageIndex(startIndex);
    setGalleryVisible(true);
  };

  const shareImage = async (imageAttachment) => {
    try {
      await Share.share({
        url: imageAttachment.uri,
        title: 'Share Image'
      });
    } catch (error) {
      console.error('Error sharing image:', error);
    }
  };

  const saveToDevice = async (imageAttachment) => {
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (permission.granted) {
        await MediaLibrary.saveToLibraryAsync(imageAttachment.uri);
        Alert.alert('Success', 'Image saved to your photo library!');
      } else {
        Alert.alert('Permission Denied', 'Cannot save image without photo library permission.');
      }
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save image to your device.');
    }
  };

  const showImageOptions = (imageAttachment) => {
    Alert.alert(
      'Image Options',
      'What would you like to do with this image?',
      [
        { text: 'View Details', onPress: () => showImageDetails(imageAttachment) },
        { text: 'Share', onPress: () => shareImage(imageAttachment) },
        { text: 'Save to Device', onPress: () => saveToDevice(imageAttachment) },
        { text: 'Remove', style: 'destructive', onPress: () => removeImage(imageAttachment.id) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showImageDetails = (imageAttachment) => {
    const { metadata } = imageAttachment;
    const details = [
      `Size: ${metadata.width} × ${metadata.height}`,
      `Original: ${Math.round(metadata.originalSize / 1024)} KB`,
      `Compressed: ${Math.round(metadata.mediumSize / 1024)} KB`,
      `Compression: ${metadata.compressionRatio}%`,
      `Source: ${metadata.source}`,
      `Added: ${new Date(metadata.addedAt).toLocaleString()}`
    ];

    if (metadata.location) {
      details.push(`Location: ${metadata.location.latitude.toFixed(6)}, ${metadata.location.longitude.toFixed(6)}`);
    }

    Alert.alert('Image Details', details.join('\n'));
  };

  const renderImageGrid = () => {
    if (imageAttachments.length === 0) {
      return (
        <View style={[
          styles.emptyState,
          isDarkMode && { backgroundColor: darkModeStyles.card.backgroundColor }
        ]}>
          <Ionicons 
            name="images-outline" 
            size={48} 
            color={isDarkMode ? darkModeStyles.subText.color : '#CCC'} 
          />
          <Text style={[
            styles.emptyText,
            isDarkMode && { color: darkModeStyles.subText.color }
          ]}>
            No images added yet
          </Text>
        </View>
      );
    }

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imageGrid}
        ref={scrollViewRef}
      >
        {imageAttachments.map((imageAttachment, index) => (
          <TouchableOpacity
            key={imageAttachment.id}
            style={styles.imageContainer}
            onPress={() => openGallery(index)}
            onLongPress={() => showImageOptions(imageAttachment)}
          >
            <Image
              source={{ uri: imageAttachment.thumbnail }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
            
            {/* Image metadata overlay */}
            <View style={styles.imageOverlay}>
              {imageAttachment.metadata.location && (
                <Ionicons name="location" size={12} color="#FFFFFF" />
              )}
              {imageAttachment.metadata.compressionRatio > 50 && (
                <Ionicons name="compress" size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
              )}
            </View>

            {/* Remove button */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(imageAttachment.id)}
            >
              <Ionicons name="close-circle" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderGalleryModal = () => {
    if (!galleryVisible) return null;

    return (
      <Modal
        visible={galleryVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setGalleryVisible(false)}
      >
        <View style={[
          styles.galleryContainer,
          isDarkMode && { backgroundColor: darkModeStyles.container.backgroundColor }
        ]}>
          {/* Gallery Header */}
          <View style={[
            styles.galleryHeader,
            isDarkMode && { backgroundColor: darkModeStyles.card.backgroundColor }
          ]}>
            <TouchableOpacity
              style={styles.galleryCloseButton}
              onPress={() => setGalleryVisible(false)}
            >
              <Ionicons name="close" size={24} color={isDarkMode ? darkModeStyles.text.color : '#000'} />
            </TouchableOpacity>
            
            <Text style={[
              styles.galleryTitle,
              isDarkMode && { color: darkModeStyles.text.color }
            ]}>
              {currentImageIndex + 1} of {imageAttachments.length}
            </Text>
            
            <TouchableOpacity
              style={styles.galleryOptionButton}
              onPress={() => showImageOptions(imageAttachments[currentImageIndex])}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={isDarkMode ? darkModeStyles.text.color : '#000'} />
            </TouchableOpacity>
          </View>

          {/* Image Viewer */}
          <FlatList
            data={imageAttachments}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialScrollIndex={currentImageIndex}
            getItemLayout={(data, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setCurrentImageIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={styles.galleryImageContainer}>
                <Image
                  source={{ uri: item.uri }}
                  style={styles.galleryImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />

          {/* Gallery Footer with Thumbnails */}
          <View style={[
            styles.galleryFooter,
            isDarkMode && { backgroundColor: darkModeStyles.card.backgroundColor }
          ]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailStrip}
            >
              {imageAttachments.map((imageAttachment, index) => (
                <TouchableOpacity
                  key={imageAttachment.id}
                  style={[
                    styles.thumbnailStripImage,
                    index === currentImageIndex && styles.activeThumbnail
                  ]}
                  onPress={() => setCurrentImageIndex(index)}
                >
                  <Image
                    source={{ uri: imageAttachment.thumbnail }}
                    style={styles.thumbnailStripImageContent}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[
          styles.title,
          isDarkMode && { color: darkModeStyles.text.color }
        ]}>
          Images ({imageAttachments.length}/{maxImages})
        </Text>
        
        {isProcessing && (
          <ActivityIndicator size="small" color={isDarkMode ? '#4a9eff' : '#007AFF'} />
        )}
      </View>

      {/* Image Grid */}
      {renderImageGrid()}

      {/* Add Image Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.addButton,
            isDarkMode && { backgroundColor: darkModeStyles.button.backgroundColor }
          ]}
          onPress={addImageFromCamera}
          disabled={isProcessing || imageAttachments.length >= maxImages}
        >
          <Ionicons name="camera" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.addButton,
            isDarkMode && { backgroundColor: darkModeStyles.button.backgroundColor }
          ]}
          onPress={addImageFromLibrary}
          disabled={isProcessing || imageAttachments.length >= maxImages}
        >
          <Ionicons name="images" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Gallery Modal */}
      {renderGalleryModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  imageGrid: {
    paddingVertical: 8,
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  // Gallery Modal Styles
  galleryContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  galleryCloseButton: {
    padding: 8,
  },
  galleryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  galleryOptionButton: {
    padding: 8,
  },
  galleryImageContainer: {
    width: screenWidth,
    height: screenHeight - 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImage: {
    width: screenWidth - 32,
    height: screenHeight - 250,
  },
  galleryFooter: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 12,
  },
  thumbnailStrip: {
    paddingHorizontal: 16,
  },
  thumbnailStripImage: {
    marginRight: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnail: {
    borderColor: '#007AFF',
  },
  thumbnailStripImageContent: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
});

export default EnhancedImageAttachment;
