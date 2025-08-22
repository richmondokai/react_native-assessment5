import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const SocialNotificationContext = createContext({
  likesCount: 0,
  addLike: () => {},
  resetLikes: () => {},
  markAsViewed: () => {},
});

export const useSocialNotifications = () => {
  const context = useContext(SocialNotificationContext);
  if (!context) {
    throw new Error('useSocialNotifications must be used within a SocialNotificationProvider');
  }
  return context;
};

export const SocialNotificationProvider = ({ children }) => {
  const [likesCount, setLikesCount] = useState(0);
  const { user } = useAuth();

  // Storage key for user-specific likes count
  const getLikesStorageKey = () => {
    const userId = user?.email || user?.id || 'anonymous';
    return `SOCIAL_LIKES_COUNT_${userId}`;
  };

  // Load likes count from storage
  useEffect(() => {
    loadLikesCount();
  }, [user]);

  const loadLikesCount = async () => {
    try {
      const storageKey = getLikesStorageKey();
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const count = parseInt(stored, 10);
        setLikesCount(isNaN(count) ? 0 : count);
        console.log('📱 Loaded social likes count:', count);
      }
    } catch (error) {
      console.error('Error loading likes count:', error);
    }
  };

  const saveLikesCount = async (count) => {
    try {
      const storageKey = getLikesStorageKey();
      await AsyncStorage.setItem(storageKey, count.toString());
      console.log('📱 Saved social likes count:', count);
    } catch (error) {
      console.error('Error saving likes count:', error);
    }
  };

  const addLike = (noteId, authorId) => {
    // Only add notification if the current user is the author of the liked note
    const currentUserId = user?.email || user?.id;
    if (authorId === currentUserId) {
      const newCount = likesCount + 1;
      setLikesCount(newCount);
      saveLikesCount(newCount);
      console.log('📱 Added like notification for your note:', noteId, 'new count:', newCount);
    }
  };

  const resetLikes = () => {
    setLikesCount(0);
    saveLikesCount(0);
    console.log('📱 Reset likes notification count');
  };

  const markAsViewed = () => {
    // When user visits social feed, reset the notification count
    // since they're now seeing any new likes on their notes
    if (likesCount > 0) {
      console.log('📱 Social feed viewed, resetting likes count from:', likesCount);
      resetLikes();
    } else {
      console.log('📱 Social feed viewed, no new likes to clear');
    }
  };

  // Test function to simulate likes (for development/testing)
  const testAddLike = () => {
    const newCount = likesCount + 1;
    setLikesCount(newCount);
    saveLikesCount(newCount);
    console.log('📱 Test: Added like notification, new count:', newCount);
  };

  const value = {
    likesCount,
    addLike,
    resetLikes,
    markAsViewed,
    testAddLike,
  };

  return (
    <SocialNotificationContext.Provider value={value}>
      {children}
    </SocialNotificationContext.Provider>
  );
};

export default SocialNotificationContext;
