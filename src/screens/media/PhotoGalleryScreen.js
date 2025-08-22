import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect } from '@react-navigation/native';
import { CameraService } from '../../services/cameraService';
import { useDarkMode } from '../../hooks/useDarkMode';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48) / 3; // 3 items per row with padding

const PhotoGalleryScreen = ({ navigation, route }) => {
  const { isDarkMode } = useDarkMode();
  const { onSelectImages, maxSelection = 10, selectedImages = [] } = route.params || {};

  const [images, setImages] = useState([]);
  const [allImages, setAllImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageIds, setSelectedImageIds] = useState(new Set(selectedImages.map(img => img.id || img.uri)));
  const [previewImage, setPreviewImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState(new Set());

  useEffect(() => {
    loadImages();
  }, []);

  // Reload images when screen comes into focus (e.g., returning from camera)
  useFocusEffect(
    useCallback(() => {
      console.log('PhotoGallery screen focused, reloading images...');
      loadImages();
    }, [])
  );

  useEffect(() => {
    filterAndSortImages();
  }, [allImages, searchQuery, filterType, sortOrder]);

  const filterAndSortImages = () => {
    let filtered = [...allImages];

    // Apply search filter with enhanced capabilities
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(image => {
        const filename = image.filename?.toLowerCase() || '';
        const date = new Date(image.creationTime).toLocaleDateString().toLowerCase();
        const monthYear = new Date(image.creationTime).toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        }).toLowerCase();
        const dimensions = `${image.width}x${image.height}`;
        const size = Math.round((image.width * image.height) / 1000000 * 10) / 10; // MP
        
        return (
          filename.includes(query) || 
          date.includes(query) || 
          monthYear.includes(query) ||
          dimensions.includes(query) ||
          `${size}mp`.includes(query) ||
          (query === 'portrait' && image.height > image.width) ||
          (query === 'landscape' && image.width > image.height) ||
          (query === 'square' && Math.abs(image.width - image.height) < 100)
        );
      });
    }

    // Apply type filter with more options
    if (filterType !== 'all') {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      
      filtered = filtered.filter(image => {
        const imageTime = image.creationTime;
        switch (filterType) {
          case 'today':
            return now - imageTime < dayMs;
          case 'week':
            return now - imageTime < 7 * dayMs;
          case 'month':
            return now - imageTime < 30 * dayMs;
          case 'photos':
            return image.mediaType === 'photo';
          case 'videos':
            return image.mediaType === 'video';
          case 'large':
            return (image.width * image.height) > 2000000; // > 2MP
          case 'portrait':
            return image.height > image.width;
          case 'landscape':
            return image.width > image.height;
          case 'square':
            return Math.abs(image.width - image.height) < 100;
          default:
            return true;
        }
      });
    }

    // Apply sorting with more options
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return b.creationTime - a.creationTime;
        case 'oldest':
          return a.creationTime - b.creationTime;
        case 'name':
          return (a.filename || '').localeCompare(b.filename || '');
        case 'size':
          return (b.width * b.height) - (a.width * a.height);
        case 'width':
          return b.width - a.width;
        case 'height':
          return b.height - a.height;
        default:
          return b.creationTime - a.creationTime;
      }
    });

    setImages(filtered);
  };

  const loadImages = async () => {
    try {
      setLoading(true);
      console.log('Loading gallery images...');
      const galleryImages = await CameraService.getGalleryImages();
      console.log(`Loaded ${galleryImages.length} images from gallery`);
      
      setAllImages(galleryImages);
      setImages(galleryImages);
      
      // Log newest images for debugging
      if (galleryImages.length > 0) {
        const newest = galleryImages.slice(0, 3).map(img => ({
          id: img.id,
          creationTime: new Date(img.creationTime).toLocaleString(),
          filename: img.filename
        }));
        console.log('Newest images:', newest);
      }
    } catch (error) {
      console.error('Error loading images:', error);
      Alert.alert('Error', 'Failed to load images from gallery');
      setAllImages([]);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (image) => {
    const imageId = image.id || image.uri;
    const newSelected = new Set(selectedImageIds);
    
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
      Haptics.selectionAsync();
    } else {
      if (newSelected.size >= maxSelection) {
        Alert.alert(
          'Selection Limit',
          `You can only select up to ${maxSelection} images.`,
          [{ text: 'OK' }]
        );
        return;
      }
      newSelected.add(imageId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setSelectedImageIds(newSelected);
  };

  const handleImagePreview = (image) => {
    setPreviewImage(image);
    setIsPreviewVisible(true);
  };

  const selectAll = () => {
    const visibleImageIds = images.slice(0, maxSelection).map(img => img.id || img.uri);
    setSelectedImageIds(new Set(visibleImageIds));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const clearSelection = () => {
    setSelectedImageIds(new Set());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const selectByType = (type) => {
    let targetImages = [];
    switch (type) {
      case 'recent':
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        targetImages = allImages.filter(img => img.creationTime > oneWeekAgo);
        break;
      case 'large':
        targetImages = allImages.filter(img => (img.width * img.height) > 2000000);
        break;
      case 'portrait':
        targetImages = allImages.filter(img => img.height > img.width);
        break;
      case 'landscape':
        targetImages = allImages.filter(img => img.width > img.height);
        break;
      case 'filtered':
        targetImages = images; // Currently filtered/visible images
        break;
      default:
        targetImages = allImages;
    }
    
    const availableSlots = maxSelection - selectedImageIds.size;
    const targetIds = targetImages.slice(0, availableSlots).map(img => img.id || img.uri);
    const newSelection = new Set([...selectedImageIds, ...targetIds]);
    setSelectedImageIds(newSelection);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilterType('all');
    setSortOrder('newest');
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedForDeletion(new Set());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePhotoPress = (image) => {
    if (isSelectionMode) {
      // In selection mode, toggle selection for deletion
      const imageId = image.id || image.uri;
      const newSelected = new Set(selectedForDeletion);
      
      if (newSelected.has(imageId)) {
        newSelected.delete(imageId);
      } else {
        newSelected.add(imageId);
      }
      
      setSelectedForDeletion(newSelected);
      Haptics.selectionAsync();
    } else {
      // In normal mode, open preview
      handleImagePreview(image);
    }
  };

  const deleteSelectedPhotos = async () => {
    if (selectedForDeletion.size === 0) return;

    Alert.alert(
      'Delete Photos',
      `Are you sure you want to delete ${selectedForDeletion.size} photo${selectedForDeletion.size > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Starting photo deletion process...');
              
              // Check permissions first
              const permission = await MediaLibrary.requestPermissionsAsync();
              if (!permission.granted) {
                Alert.alert(
                  'Permission Required',
                  'We need permission to delete photos from your gallery.',
                  [{ text: 'OK' }]
                );
                return;
              }

              // Convert selected IDs to assets for deletion
              const assetsToDelete = Array.from(selectedForDeletion);
              console.log('Deleting assets:', assetsToDelete);
              
              // Delete from device gallery
              const deleteResult = await MediaLibrary.deleteAssetsAsync(assetsToDelete);
              console.log('Delete result:', deleteResult);
              
              if (deleteResult) {
                // Remove from local state
                const updatedImages = allImages.filter(img => 
                  !selectedForDeletion.has(img.id || img.uri)
                );
                setAllImages(updatedImages);
                setImages(updatedImages);
                
                // Clear selection and exit selection mode
                const deletedCount = selectedForDeletion.size;
                setSelectedForDeletion(new Set());
                setIsSelectionMode(false);
                
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                
                // Show success message
                Alert.alert(
                  'Photos Deleted',
                  `${deletedCount} photo${deletedCount > 1 ? 's' : ''} deleted successfully.`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', 'Failed to delete some photos. Please try again.');
              }
            } catch (error) {
              console.error('Error deleting photos:', error);
              Alert.alert(
                'Delete Error', 
                'Failed to delete photos. This might be due to permission restrictions or the photos being protected.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleDone = () => {
    if (onSelectImages) {
      const selectedImageList = images.filter(img => 
        selectedImageIds.has(img.id || img.uri)
      );
      onSelectImages(selectedImageList);
    }
    navigation.goBack();
  };

  const openCamera = async () => {
    try {
      const result = await CameraService.openCamera({
        allowsEditing: true,
        quality: 0.8,
        generateThumbnail: true
      });

      if (result) {
        // Add new photo to the gallery
        setImages(prev => [result, ...prev]);
        
        // Auto-select the new photo
        const imageId = result.id || result.uri;
        setSelectedImageIds(prev => new Set([...prev, imageId]));
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const renderImageItem = ({ item, index }) => {
    const imageId = item.id || item.uri;
    const isSelected = selectedImageIds.has(imageId);
    const isSelectedForDeletion = selectedForDeletion.has(imageId);
    
    return (
      <TouchableOpacity
        style={[
          styles.imageItem,
          {
            borderColor: isSelected ? '#007AFF' : isSelectedForDeletion ? '#FF3B30' : 'transparent',
            borderWidth: isSelected || isSelectedForDeletion ? 3 : 0,
          }
        ]}
        onPress={() => onSelectImages ? handleImageSelect(item) : handlePhotoPress(item)}
        onLongPress={() => isSelectionMode ? null : handleImagePreview(item)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.thumbnail || item.uri }}
          style={styles.imageItemPhoto}
          resizeMode="cover"
        />
        
        {/* Selection overlay for image picker mode */}
        {isSelected && onSelectImages && (
          <View style={styles.selectionOverlay}>
            <View style={styles.selectionBadge}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Deletion selection overlay */}
        {isSelectedForDeletion && (
          <View style={styles.deletionOverlay}>
            <View style={styles.deletionBadge}>
              <Ionicons name="trash" size={16} color="#FFFFFF" />
            </View>
          </View>
        )}
        
        {item.metadata?.fileSize && (
          <View style={styles.imageMeta}>
            <Text style={styles.imageMetaText}>
              {Math.round(item.metadata.fileSize / 1024)}KB
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="images-outline"
        size={64}
        color={isDarkMode ? '#48484A' : '#C7C7CC'}
      />
      <Text style={[styles.emptyTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
        No Photos
      </Text>
      <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
        Take your first photo to get started
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('Camera')}>
        <Ionicons name="camera" size={20} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Take Photo</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPreviewModal = () => (
    <Modal
      visible={isPreviewVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsPreviewVisible(false)}
    >
      <View style={styles.previewContainer}>
        <TouchableOpacity
          style={styles.previewBackground}
          onPress={() => setIsPreviewVisible(false)}
        />
        <View style={styles.previewContent}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setIsPreviewVisible(false)}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Photo Preview</Text>
            <TouchableOpacity
              onPress={() => {
                if (previewImage) {
                  handleImageSelect(previewImage);
                }
              }}
            >
              <Text style={styles.previewSelectText}>
                {selectedImageIds.has(previewImage?.id || previewImage?.uri) ? 'Deselect' : 'Select'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {previewImage && (
            <Image
              source={{ uri: previewImage.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          
          {previewImage?.metadata && (
            <View style={styles.previewMeta}>
              <Text style={styles.previewMetaText}>
                {previewImage.metadata.originalWidth} × {previewImage.metadata.originalHeight}
              </Text>
              <Text style={styles.previewMetaText}>
                {Math.round(previewImage.metadata.fileSize / 1024)}KB
              </Text>
              <Text style={styles.previewMetaText}>
                {new Date(previewImage.metadata.timestamp).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' }]} edges={['left', 'right', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
        <TouchableOpacity onPress={() => isSelectionMode ? setIsSelectionMode(false) : navigation.goBack()}>
          <Ionicons 
            name={isSelectionMode ? "close" : "arrow-back"} 
            size={24} 
            color={isDarkMode ? '#FFFFFF' : '#000000'} 
          />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
          {isSelectionMode ? `${selectedForDeletion.size} Selected` : 'Pictures'}
        </Text>
        
        <View style={styles.headerActions}>
          {isSelectionMode ? (
            <TouchableOpacity 
              onPress={deleteSelectedPhotos}
              disabled={selectedForDeletion.size === 0}
              style={[styles.deleteButton, { opacity: selectedForDeletion.size === 0 ? 0.5 : 1 }]}
            >
              <Ionicons name="trash" size={24} color="#FF3B30" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity onPress={toggleSelectionMode} style={styles.selectButton}>
                <Ionicons name="checkmark-circle-outline" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Camera')} style={styles.cameraButton}>
                <Ionicons name="camera" size={24} color={isDarkMode ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Search and Filter Controls - Hidden in selection mode */}
      {!isSelectionMode && (
        <View style={[styles.controlsContainer, { backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF' }]}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: isDarkMode ? '#2C2C2E' : '#F2F2F7' }]}>
          <Ionicons name="search" size={16} color={isDarkMode ? '#8E8E93' : '#6D6D80'} />
          <TextInput
            style={[styles.searchInput, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}
            placeholder="Search photos by name, date, size..."
            placeholderTextColor={isDarkMode ? '#8E8E93' : '#6D6D80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={16} color={isDarkMode ? '#8E8E93' : '#6D6D80'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter and Sort Row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersRow}
          contentContainerStyle={styles.filtersContent}
        >
          {/* Filter Buttons */}
          {['all', 'today', 'week', 'month', 'photos', 'videos', 'large', 'portrait', 'landscape', 'square'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                filterType === filter && styles.filterButtonActive,
                { backgroundColor: filterType === filter ? '#007AFF' : (isDarkMode ? '#2C2C2E' : '#F2F2F7') }
              ]}
              onPress={() => setFilterType(filter)}
            >
              <Text style={[
                styles.filterButtonText,
                { color: filterType === filter ? '#FFFFFF' : (isDarkMode ? '#FFFFFF' : '#000000') }
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Divider */}
          <View style={[styles.filterDivider, { backgroundColor: isDarkMode ? '#48484A' : '#C7C7CC' }]} />

          {/* Sort Buttons */}
          {['newest', 'oldest', 'name', 'size', 'width', 'height'].map((sort) => (
            <TouchableOpacity
              key={sort}
              style={[
                styles.filterButton,
                sortOrder === sort && styles.filterButtonActive,
                { backgroundColor: sortOrder === sort ? '#34C759' : (isDarkMode ? '#2C2C2E' : '#F2F2F7') }
              ]}
              onPress={() => setSortOrder(sort)}
            >
              <Text style={[
                styles.filterButtonText,
                { color: sortOrder === sort ? '#FFFFFF' : (isDarkMode ? '#FFFFFF' : '#000000') }
              ]}>
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Clear Filters - Only show when filters are active */}
        {(searchQuery || filterType !== 'all' || sortOrder !== 'newest') && (
          <View style={styles.clearFiltersContainer}>
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setFilterType('all');
              setSortOrder('newest');
            }}>
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
      )}

      {/* Selection Controls */}
      {onSelectImages && (
        <View style={[styles.selectionControls, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectionButtonsContainer}
          >
            <TouchableOpacity 
              style={[styles.selectionButton, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7' }]}
              onPress={selectAll}
              disabled={selectedImageIds.size >= maxSelection}
            >
              <Ionicons name="checkmark-circle" size={16} color="#007AFF" />
              <Text style={[styles.selectionButtonText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                All Visible
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.selectionButton, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7' }]}
              onPress={() => selectByType('recent')}
              disabled={selectedImageIds.size >= maxSelection}
            >
              <Ionicons name="time" size={16} color="#34C759" />
              <Text style={[styles.selectionButtonText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Recent
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.selectionButton, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7' }]}
              onPress={() => selectByType('large')}
              disabled={selectedImageIds.size >= maxSelection}
            >
              <Ionicons name="expand" size={16} color="#FF9500" />
              <Text style={[styles.selectionButtonText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Large
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.selectionButton, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7' }]}
              onPress={() => selectByType('portrait')}
              disabled={selectedImageIds.size >= maxSelection}
            >
              <Ionicons name="phone-portrait" size={16} color="#AF52DE" />
              <Text style={[styles.selectionButtonText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Portrait
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.selectionButton, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7' }]}
              onPress={() => selectByType('landscape')}
              disabled={selectedImageIds.size >= maxSelection}
            >
              <Ionicons name="phone-landscape" size={16} color="#FF3B30" />
              <Text style={[styles.selectionButtonText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Landscape
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.selectionButton, { backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7' }]}
              onPress={clearSelection}
            >
              <Ionicons name="close-circle" size={16} color="#8E8E93" />
              <Text style={[styles.selectionButtonText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                Clear
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Selection Info */}
      {selectedImageIds.size > 0 && (
        <View style={[styles.selectionInfo, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}>
          <Text style={[styles.selectionText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            {selectedImageIds.size} of {maxSelection} selected
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Gallery Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
            Loading photos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImageItem}
          keyExtractor={(item, index) => item.id || item.uri || index.toString()}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Preview Modal */}
      {renderPreviewModal()}
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
    paddingTop: StatusBar.currentHeight || (Platform.OS === 'ios' ? 44 : 24),
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButton: {
    marginRight: 12,
  },
  cameraButton: {
    // No additional styles needed
  },
  deleteButton: {
    // No additional styles needed
  },
  deletionOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletionBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filtersRow: {
    marginBottom: 8,
  },
  filtersContent: {
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    borderColor: 'transparent',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  clearFiltersContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
  },
  selectionControls: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  selectionButtonsContainer: {
    paddingRight: 16,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  selectionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
  gridContainer: {
    padding: 16,
  },
  imageItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imageItemPhoto: {
    width: '100%',
    height: '100%',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
  },
  selectionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  previewBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  previewContent: {
    flex: 1,
    paddingTop: 50,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  previewSelectText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewImage: {
    flex: 1,
    margin: 16,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  previewMetaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default PhotoGalleryScreen;
