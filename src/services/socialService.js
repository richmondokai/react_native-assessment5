import { axiosInstance } from './axios_instance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { stripHtmlTags } from '../utils/htmlUtils';

export class SocialService {
  static async getFeed(limit = 20, offset = 0) {
    try {
      const response = await axiosInstance.get(`/api/social/feed?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching social feed:', error);
      throw error;
    }
  }

  static async likeNote(noteId) {
    try {
      const response = await axiosInstance.post(`/api/social/notes/${noteId}/like`);
      return response.data;
    } catch (error) {
      console.error('Error liking note:', error);
      throw error;
    }
  }

  static async unlikeNote(noteId) {
    try {
      // Using POST for unlike as well - the backend will handle toggle logic
      const response = await axiosInstance.post(`/api/social/notes/${noteId}/like`);
      return response.data;
    } catch (error) {
      console.error('Error unliking note:', error);
      throw error;
    }
  }

  static async getNoteLikes(noteId) {
    try {
      const response = await axiosInstance.get(`/api/social/notes/${noteId}/likes`);
      return response.data;
    } catch (error) {
      console.error('Error fetching note likes:', error);
      throw error;
    }
  }

  static async registerForPushNotifications(deviceToken) {
    try {
      const response = await axiosInstance.post('/api/push/register', {
        deviceToken,
        platform: Platform.OS
      });
      return response.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      throw error;
    }
  }

  static async unregisterFromPushNotifications() {
    try {
      const response = await axiosInstance.post('/api/push/unregister');
      return response.data;
    } catch (error) {
      console.error('Error unregistering from push notifications:', error);
      throw error;
    }
  }

  // Offline caching for social feed
  static async cacheFeedData(feedData) {
    try {
      // Clean HTML from content before caching
      const cleanedData = feedData.map(note => ({
        ...note,
        content: stripHtmlTags(note.content || '')
      }));
      
      // Deduplicate before caching
      const deduplicatedData = this.deduplicateFeedData(cleanedData);
      
      await AsyncStorage.setItem('CACHED_SOCIAL_FEED', JSON.stringify({
        data: deduplicatedData,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error caching feed data:', error);
    }
  }

  static deduplicateFeedData(notes) {
    if (!Array.isArray(notes)) return notes;
    
    const seen = new Map();
    const deduplicated = [];

    for (const note of notes) {
      // Create a unique key based on title, content, and author
      const key = `${note.title || ''}-${(note.content || '').substring(0, 50)}-${note.author?.id || note.author?.email || ''}`;
      
      if (!seen.has(key)) {
        seen.set(key, true);
        deduplicated.push(note);
      }
    }

    if (deduplicated.length !== notes.length) {
      console.log(`Cache deduplication: ${notes.length} -> ${deduplicated.length} notes`);
    }
    
    return deduplicated;
  }

  static async getCachedFeedData() {
    try {
      const cached = await AsyncStorage.getItem('CACHED_SOCIAL_FEED');
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        
        // Check if cache is less than 30 minutes old
        const cacheAge = new Date() - new Date(timestamp);
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (cacheAge < thirtyMinutes) {
          // Clean HTML from cached data as well
          const cleanedData = data.map(note => ({
            ...note,
            content: stripHtmlTags(note.content || '')
          }));
          return cleanedData;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached feed data:', error);
      return null;
    }
  }

  static async clearCachedFeedData() {
    try {
      await AsyncStorage.removeItem('CACHED_SOCIAL_FEED');
      console.log('Social feed cache cleared');
    } catch (error) {
      console.error('Error clearing cached feed data:', error);
    }
  }

  // Optimistic updates for likes
  static async optimisticLike(noteId, currentLikes, isLiked) {
    const optimisticData = {
      noteId,
      likes: isLiked ? currentLikes - 1 : currentLikes + 1,
      isLiked: !isLiked
    };

    try {
      // Store optimistic update
      const existingOptimistic = await AsyncStorage.getItem('OPTIMISTIC_LIKES');
      const optimisticLikes = existingOptimistic ? JSON.parse(existingOptimistic) : {};
      
      optimisticLikes[noteId] = optimisticData;
      await AsyncStorage.setItem('OPTIMISTIC_LIKES', JSON.stringify(optimisticLikes));

      // Try to perform actual API call, but don't fail if it doesn't work
      try {
        if (isLiked) {
          await this.unlikeNote(noteId);
        } else {
          await this.likeNote(noteId);
        }
        
        // Remove optimistic update on success
        delete optimisticLikes[noteId];
        await AsyncStorage.setItem('OPTIMISTIC_LIKES', JSON.stringify(optimisticLikes));
        
        console.log('Like API call successful');
      } catch (apiError) {
        console.warn('Like API call failed, keeping optimistic update:', apiError.message);
        // Keep the optimistic update even if API fails
        // This allows the like functionality to work offline or when API is down
      }

      return optimisticData;
    } catch (error) {
      // Only revert if there's a critical error with local storage
      console.error('Critical error in optimistic like:', error);
      const existingOptimistic = await AsyncStorage.getItem('OPTIMISTIC_LIKES');
      const optimisticLikes = existingOptimistic ? JSON.parse(existingOptimistic) : {};
      delete optimisticLikes[noteId];
      await AsyncStorage.setItem('OPTIMISTIC_LIKES', JSON.stringify(optimisticLikes));
      
      throw error;
    }
  }

  static async getOptimisticLikes() {
    try {
      const optimistic = await AsyncStorage.getItem('OPTIMISTIC_LIKES');
      return optimistic ? JSON.parse(optimistic) : {};
    } catch (error) {
      console.error('Error getting optimistic likes:', error);
      return {};
    }
  }
}

export default SocialService;
