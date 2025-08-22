import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

/**
 * Image compression and processing utilities
 */

export const ImageUtils = {
  /**
   * Compress an image to different quality levels
   * @param {string} uri - Image URI
   * @param {object} options - Compression options
   * @returns {Promise<object>} Compressed image results
   */
  async compressImage(uri, options = {}) {
    const {
      quality = 0.8,
      maxWidth = 1200,
      maxHeight = 1200,
      format = ImageManipulator.SaveFormat.JPEG
    } = options;

    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: maxWidth,
              height: maxHeight
            }
          }
        ],
        {
          compress: quality,
          format: format,
        }
      );

      const fileInfo = await FileSystem.getInfoAsync(result.uri);
      
      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        size: fileInfo.size
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      throw error;
    }
  },

  /**
   * Create multiple sizes of an image (thumbnail, medium, large)
   * @param {string} uri - Original image URI
   * @param {object} options - Size options
   * @returns {Promise<object>} Multiple image sizes
   */
  async createImageSizes(uri, options = {}) {
    const {
      thumbnailSize = 200,
      mediumSize = 800,
      largeSize = 1600,
      quality = 0.8
    } = options;

    try {
      console.log('📸 Creating image sizes for:', uri);

      // Original image info
      const originalInfo = await FileSystem.getInfoAsync(uri);
      
      // Create thumbnail
      const thumbnail = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: thumbnailSize, height: thumbnailSize } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Create medium size
      const medium = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: mediumSize } }],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Create large size (for high-res viewing)
      const large = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: largeSize } }],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      // Get file sizes
      const thumbnailInfo = await FileSystem.getInfoAsync(thumbnail.uri);
      const mediumInfo = await FileSystem.getInfoAsync(medium.uri);
      const largeInfo = await FileSystem.getInfoAsync(large.uri);

      const result = {
        original: {
          uri: uri,
          size: originalInfo.size
        },
        thumbnail: {
          uri: thumbnail.uri,
          size: thumbnailInfo.size,
          width: thumbnail.width,
          height: thumbnail.height
        },
        medium: {
          uri: medium.uri,
          size: mediumInfo.size,
          width: medium.width,
          height: medium.height
        },
        large: {
          uri: large.uri,
          size: largeInfo.size,
          width: large.width,
          height: large.height
        }
      };

      console.log('📸 Image sizes created:', {
        original: `${Math.round(originalInfo.size / 1024)}KB`,
        thumbnail: `${Math.round(thumbnailInfo.size / 1024)}KB`,
        medium: `${Math.round(mediumInfo.size / 1024)}KB`,
        large: `${Math.round(largeInfo.size / 1024)}KB`
      });

      return result;
    } catch (error) {
      console.error('Error creating image sizes:', error);
      throw error;
    }
  },

  /**
   * Extract metadata from an image
   * @param {object} asset - Image asset from ImagePicker
   * @returns {object} Extracted metadata
   */
  extractImageMetadata(asset) {
    const metadata = {
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      fileName: asset.fileName,
      type: asset.type,
      uri: asset.uri,
      location: null,
      dateTaken: null,
      camera: null,
      orientation: null
    };

    // Extract EXIF data if available
    if (asset.exif) {
      const exif = asset.exif;
      
      // GPS location
      if (exif.GPS && exif.GPS.Latitude && exif.GPS.Longitude) {
        metadata.location = {
          latitude: exif.GPS.Latitude,
          longitude: exif.GPS.Longitude,
          altitude: exif.GPS.Altitude || null
        };
      }

      // Date taken
      if (exif.DateTime || exif.DateTimeOriginal) {
        metadata.dateTaken = exif.DateTimeOriginal || exif.DateTime;
      }

      // Camera information
      if (exif.Make || exif.Model) {
        metadata.camera = {
          make: exif.Make,
          model: exif.Model,
          software: exif.Software
        };
      }

      // Orientation
      if (exif.Orientation) {
        metadata.orientation = exif.Orientation;
      }

      // Additional technical data
      metadata.technical = {
        iso: exif.ISOSpeedRatings,
        fNumber: exif.FNumber,
        exposureTime: exif.ExposureTime,
        focalLength: exif.FocalLength,
        flash: exif.Flash
      };
    }

    return metadata;
  },

  /**
   * Calculate image compression ratio
   * @param {number} originalSize - Original file size in bytes
   * @param {number} compressedSize - Compressed file size in bytes
   * @returns {number} Compression ratio as percentage
   */
  calculateCompressionRatio(originalSize, compressedSize) {
    if (!originalSize || originalSize === 0) return 0;
    return Math.round((1 - compressedSize / originalSize) * 100);
  },

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  /**
   * Get image dimensions from URI
   * @param {string} uri - Image URI
   * @returns {Promise<object>} Image dimensions
   */
  async getImageDimensions(uri) {
    return new Promise((resolve, reject) => {
      const Image = require('react-native').Image;
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });
  },

  /**
   * Validate image file
   * @param {object} asset - Image asset
   * @param {object} constraints - Validation constraints
   * @returns {object} Validation result
   */
  validateImage(asset, constraints = {}) {
    const {
      maxFileSize = 10 * 1024 * 1024, // 10MB
      maxWidth = 4000,
      maxHeight = 4000,
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
    } = constraints;

    const errors = [];

    // Check file size
    if (asset.fileSize && asset.fileSize > maxFileSize) {
      errors.push(`File size (${this.formatFileSize(asset.fileSize)}) exceeds maximum allowed size (${this.formatFileSize(maxFileSize)})`);
    }

    // Check dimensions
    if (asset.width > maxWidth || asset.height > maxHeight) {
      errors.push(`Image dimensions (${asset.width}×${asset.height}) exceed maximum allowed size (${maxWidth}×${maxHeight})`);
    }

    // Check file type
    if (asset.type && !allowedTypes.includes(asset.type.toLowerCase())) {
      errors.push(`File type ${asset.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Create image attachment object
   * @param {object} processedImages - Processed image sizes
   * @param {object} metadata - Image metadata
   * @param {string} source - Image source (camera/library)
   * @returns {object} Image attachment object
   */
  createImageAttachment(processedImages, metadata, source) {
    return {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      uri: processedImages.medium.uri,
      thumbnail: processedImages.thumbnail.uri,
      large: processedImages.large.uri,
      original: processedImages.original.uri,
      metadata: {
        ...metadata,
        source: source,
        addedAt: new Date().toISOString(),
        sizes: {
          thumbnail: {
            width: processedImages.thumbnail.width,
            height: processedImages.thumbnail.height,
            size: processedImages.thumbnail.size
          },
          medium: {
            width: processedImages.medium.width,
            height: processedImages.medium.height,
            size: processedImages.medium.size
          },
          large: {
            width: processedImages.large.width,
            height: processedImages.large.height,
            size: processedImages.large.size
          },
          original: {
            size: processedImages.original.size
          }
        },
        compressionRatio: this.calculateCompressionRatio(
          processedImages.original.size,
          processedImages.medium.size
        )
      }
    };
  }
};

export default ImageUtils;