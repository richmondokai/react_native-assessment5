import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraService } from '../../services/cameraService';
import { ImageUtils } from '../../utils/imageUtils';
import { useDarkMode } from '../../hooks/useDarkMode';

const ImagePicker = ({
  images = [],
  onImagesChange,
  maxImages = 5,
  imageStyle,
  containerStyle,
  showAddButton = true,
  editable = true,
}) => {
  const { isDarkMode } = useDarkMode();
  const [loading, setLoading] = useState(false);

  const handleAddImage = () => {
    if (images.length >= maxImages) {
      Alert.alert(
        'Maximum Images',
        `You can only add up to ${maxImages} images.`,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Add Image',
      'Choose how you want to add an image',
      [
        { text: 'Camera', onPress: () => openCamera() },
        { text: 'Photo Library', onPress: () => openImagePicker() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const openCamera = async () => {
    try {
      setLoading(true);
      const result = await CameraService.openCamera({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        generateThumbnail: true,
      });

      if (result) {
        const optimized = await ImageUtils.optimizeForUpload(result.uri);
        if (optimized) {
          const newImage = {
            id: Date.now().toString(),
            uri: optimized.uri,
            thumbnail: result.thumbnail,
            metadata: ImageUtils.extractImageMetadata(optimized),
          };
          
          const updatedImages = [...images, newImage];
          onImagesChange(updatedImages);
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setLoading(false);
    }
  };

  const openImagePicker = async () => {
    try {
      setLoading(true);
      const remainingSlots = maxImages - images.length;
      
      const result = await CameraService.openImagePicker({
        allowsEditing: false,
        allowsMultipleSelection: remainingSlots > 1,
        quality: 0.8,
        generateThumbnail: true,
      });

      if (result) {
        const selectedImages = Array.isArray(result) ? result : [result];
        const processedImages = await Promise.all(
          selectedImages.slice(0, remainingSlots).map(async (image) => {
            const optimized = await ImageUtils.optimizeForUpload(image.uri);
            if (optimized) {
              return {
                id: Date.now().toString() + Math.random(),
                uri: optimized.uri,
                thumbnail: image.thumbnail,
                metadata: ImageUtils.extractImageMetadata(optimized),
              };
            }
            return null;
          })
        );

        const validImages = processedImages.filter(Boolean);
        if (validImages.length > 0) {
          const updatedImages = [...images, ...validImages];
          onImagesChange(updatedImages);
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error('Error opening image picker:', error);
      Alert.alert('Error', 'Failed to select images');
    } finally {
      setLoading(false);
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
            const updatedImages = images.filter(img => img.id !== imageId);
            onImagesChange(updatedImages);
            Haptics.selectionAsync();
          }
        }
      ]
    );
  };

  const renderImage = (image, index) => (
    <View key={image.id || index} style={styles.imageContainer}>
      <Image
        source={{ uri: image.thumbnail || image.uri }}
        style={[styles.image, imageStyle]}
        resizeMode="cover"
      />
      
      {editable && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeImage(image.id)}
        >
          <Ionicons name="close-circle" size={24} color="#FF3B30" />
        </TouchableOpacity>
      )}
      
      {image.metadata?.fileSize && (
        <View style={styles.imageMeta}>
          <Text style={styles.imageMetaText}>
            {ImageUtils.formatFileSize(image.metadata.fileSize)}
          </Text>
        </View>
      )}
    </View>
  );

  const renderAddButton = () => {
    if (!showAddButton || !editable || images.length >= maxImages) return null;

    return (
      <TouchableOpacity
        style={[
          styles.addButton,
          {
            backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7',
            borderColor: isDarkMode ? '#48484A' : '#E5E5EA',
          }
        ]}
        onPress={handleAddImage}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <>
            <Ionicons
              name="camera-outline"
              size={32}
              color={isDarkMode ? '#8E8E93' : '#6D6D80'}
            />
            <Text style={[
              styles.addButtonText,
              { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
            ]}>
              Add Photo
            </Text>
            <Text style={[
              styles.addButtonSubtext,
              { color: isDarkMode ? '#8E8E93' : '#6D6D80' }
            ]}>
              {images.length}/{maxImages}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {images.map(renderImage)}
        {renderAddButton()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContainer: {
    paddingHorizontal: 4,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageMeta: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageMetaText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  addButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  addButtonSubtext: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default ImagePicker;
