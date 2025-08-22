import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  Dimensions,
  ScrollView
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { useDarkMode } from '../../hooks/useDarkMode';

const { width: screenWidth } = Dimensions.get('window');

const PhotoAttachment = ({ 
  attachments = [], 
  onAttachmentsChange, 
  maxImages = 10,
  style 
}) => {
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const [selectedImage, setSelectedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'We need camera and photo library permissions to add images to your notes.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const compressImage = async (uri) => {
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 1200 } } // Resize to max width of 1200px
        ],
        {
          compress: 0.8, // 80% quality
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return compressed;
    } catch (error) {
      console.error('Error compressing image:', error);
      return { uri }; // Return original if compression fails
    }
  };

  const addImageAttachment = async (imageUri, metadata = {}) => {
    if (attachments.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only add up to ${maxImages} images per note.`);
      return;
    }

    try {
      setIsProcessing(true);
      
      // Compress the image
      const compressedImage = await compressImage(imageUri);
      
      const newAttachment = {
        id: Date.now().toString(),
        type: 'image',
        uri: compressedImage.uri,
        width: compressedImage.width,
        height: compressedImage.height,
        size: metadata.fileSize || 0,
        metadata: {
          ...metadata,
          compressed: true,
          originalUri: imageUri
        }
      };

      const updatedAttachments = [...attachments, newAttachment];
      onAttachmentsChange(updatedAttachments);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error adding image attachment:', error);
      Alert.alert('Error', 'Failed to add image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await addImageAttachment(asset.uri, {
          fileName: asset.fileName,
          fileSize: asset.fileSize,
          source: 'camera'
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        allowsMultipleSelection: true,
        selectionLimit: Math.min(5, maxImages - attachments.length),
      });

      if (!result.canceled) {
        for (const asset of result.assets) {
          if (attachments.length < maxImages) {
            await addImageAttachment(asset.uri, {
              fileName: asset.fileName,
              fileSize: asset.fileSize,
              source: 'gallery'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  };

  const removeAttachment = (attachmentId) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedAttachments = attachments.filter(att => att.id !== attachmentId);
            onAttachmentsChange(updatedAttachments);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      ]
    );
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Image',
      'Choose how you want to add an image to your note',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickFromGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderAttachment = ({ item, index }) => {
    const imageWidth = (screenWidth - 60) / 3; // 3 images per row with margins
    const imageHeight = imageWidth;

    return (
      <TouchableOpacity
        style={[styles.attachmentContainer, { width: imageWidth, height: imageHeight }]}
        onPress={() => setSelectedImage(item)}
        onLongPress={() => removeAttachment(item.id)}
      >
        <Image
          source={{ uri: item.uri }}
          style={styles.attachmentImage}
          contentFit="cover"
          placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
          transition={200}
        />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeAttachment(item.id)}
        >
          <Ionicons name="close-circle" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const imageAttachments = attachments.filter(att => att.type === 'image');

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={[
          styles.headerText,
          isDarkMode && { color: darkModeStyles.text.color }
        ]}>
          Images ({imageAttachments.length}/{maxImages})
        </Text>
        
        <TouchableOpacity
          style={[
            styles.addButton,
            isDarkMode && { backgroundColor: darkModeStyles.primary.backgroundColor },
            (imageAttachments.length >= maxImages || isProcessing) && styles.addButtonDisabled
          ]}
          onPress={showImageOptions}
          disabled={imageAttachments.length >= maxImages || isProcessing}
        >
          {isProcessing ? (
            <Text style={styles.addButtonText}>Processing...</Text>
          ) : (
            <>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Image</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {imageAttachments.length > 0 && (
        <FlatList
          data={imageAttachments}
          renderItem={renderAttachment}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.attachmentsList}
          scrollEnabled={false}
        />
      )}

      {imageAttachments.length === 0 && (
        <TouchableOpacity
          style={[
            styles.emptyState,
            isDarkMode && {
              backgroundColor: darkModeStyles.input.backgroundColor,
              borderColor: darkModeStyles.card.borderColor
            }
          ]}
          onPress={showImageOptions}
        >
          <Ionicons 
            name="camera-outline" 
            size={32} 
            color={isDarkMode ? darkModeStyles.subText.color : '#CCC'} 
          />
          <Text style={[
            styles.emptyStateText,
            isDarkMode && { color: darkModeStyles.subText.color }
          ]}>
            Tap to add images to your note
          </Text>
        </TouchableOpacity>
      )}

      {/* Image Preview Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            onPress={() => setSelectedImage(null)}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              {selectedImage && (
                <ScrollView
                  maximumZoomScale={3}
                  minimumZoomScale={1}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                >
                  <Image
                    source={{ uri: selectedImage.uri }}
                    style={styles.fullscreenImage}
                    contentFit="contain"
                  />
                </ScrollView>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalActionButton}
                  onPress={() => {
                    setSelectedImage(null);
                    removeAttachment(selectedImage.id);
                  }}
                >
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                  <Text style={styles.modalActionText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#CCC',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  attachmentsList: {
    gap: 8,
  },
  attachmentContainer: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachmentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackground: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullscreenImage: {
    width: screenWidth,
    height: screenWidth,
  },
  modalActions: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  modalActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PhotoAttachment;
