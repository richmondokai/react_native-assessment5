import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { BASE_URL } from '../../constants';

import { SocialService } from '../../services/socialService';
import { LocationService } from '../../services/locationService';
import { useDarkMode } from '../../hooks/useDarkMode';
import { NotificationService } from '../../services/notificationService';
import { stripHtmlTags } from '../../utils/htmlUtils';
import { cleanHtmlFromNotes } from '../../services/notes_local_services';
import { useSocialNotifications } from '../../context/SocialNotificationContext';

const { width } = Dimensions.get('window');

const SocialFeedScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { isDarkMode } = useDarkMode();
  const { markAsViewed, addLike: addLikeNotification, testAddLike } = useSocialNotifications();

  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [filter, setFilter] = useState('recent');
  const [optimisticLikes, setOptimisticLikes] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [allFeedData, setAllFeedData] = useState([]); // Store all notes for client-side filtering

  const animatedValues = useRef({}).current;

  // Add ref to track if we're already loading to prevent infinite loops
  const isLoadingRef = useRef(false);

  // Function to get complete image URL
  const getCompleteImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath; // Already complete URL
    return `${BASE_URL}${imagePath}`; // Add base URL to relative path
  };

  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log('Skipping feed load - already loading');
      return;
    }
    
    console.log('Loading feed for filter:', filter);
    isLoadingRef.current = true;
    
    loadFeed(0, true).finally(() => {
      isLoadingRef.current = false;
    });
  }, [filter]);

  // Reapply filter when user location becomes available (for nearby filter)
  useEffect(() => {
    if (userLocation && filter === 'nearby' && allFeedData.length > 0) {
      console.log('User location obtained, reapplying nearby filter');
      applyNoteFilter(allFeedData, 'nearby').then(filteredNotes => {
        setFeedData(filteredNotes);
      });
    }
  }, [userLocation, filter, allFeedData]);

  useEffect(() => {
    // Load optimistic likes from storage
    loadOptimisticLikes();
    
    // Clean HTML from existing notes on social feed load
    cleanupHtmlInNotes();
    
    // Mark social feed as viewed
    markAsViewed();
    
    // Get user location for nearby filtering
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const hasPermission = await LocationService.requestPermissions(false);
      if (hasPermission) {
        const location = await LocationService.getCurrentLocation();
        setUserLocation(location);
        console.log('Got user location for nearby filtering:', location);
      } else {
        console.log('Location permission denied, nearby filtering will be disabled');
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const applyNoteFilter = async (notes, filterType) => {
    switch (filterType) {
      case 'recent':
        return notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      case 'popular':
        return notes.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      
      case 'nearby':
        if (!userLocation) {
          console.log('No user location available for nearby filtering');
          Alert.alert(
            'Location Required',
            'Please enable location services to see nearby notes.',
            [
              { 
                text: 'Enable Location', 
                onPress: getUserLocation 
              },
              { 
                text: 'Cancel', 
                style: 'cancel' 
              }
            ]
          );
          return [];
        }
        
        try {
          const nearbyNotes = await LocationService.findNearbyNotes(notes, userLocation, 10); // 10km radius
          console.log(`Found ${nearbyNotes.length} nearby notes out of ${notes.length} total`);
          return nearbyNotes;
        } catch (error) {
          console.error('Error filtering nearby notes:', error);
          return [];
        }
      
      default:
        return notes;
    }
  };

  const cleanupHtmlInNotes = async () => {
    try {
      console.log('🧹 Social Feed: Running HTML cleanup...');
      
      // Clear the cached feed data first to force fresh load
      await SocialService.clearCachedFeedData();
      console.log('🧹 Social Feed: Cleared cached feed data');
      
      const userId = user?.email || user?.id;
      if (userId) {
        const cleanedCount = await cleanHtmlFromNotes(userId);
        console.log(`🧹 Social Feed: Cleaned ${cleanedCount} notes from local storage`);
      }
      
      // Force refresh the feed after cleaning
      console.log('🧹 Social Feed: Forcing feed refresh...');
      setFeedData([]); // Clear current feed data
      handleRefresh();
      
    } catch (error) {
      console.error('🧹 Social Feed: Error during HTML cleanup:', error);
    }
  };

  const loadOptimisticLikes = async () => {
    try {
      const likes = await SocialService.getOptimisticLikes();
      setOptimisticLikes(likes);
    } catch (error) {
      console.error('Error loading optimistic likes:', error);
    }
  };

  const loadFeed = async (offset = 0, reset = false) => {
    try {
      console.log(`Loading feed - offset: ${offset}, reset: ${reset}, filter: ${filter}`);
      
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let data;
      if (isConnected) {
        try {
          data = await SocialService.getFeed(20, offset);
          // Cache the data
          if (offset === 0 && data?.notes) {
            await SocialService.cacheFeedData(data.notes);
          }
        } catch (apiError) {
          console.warn('API call failed, falling back to cache:', apiError.message);
          // Fall back to cache if API fails
          const cachedData = await SocialService.getCachedFeedData();
          data = { notes: cachedData || [], hasMore: false };
        }
      } else {
        // Load from cache when offline
        const cachedData = await SocialService.getCachedFeedData();
        data = { notes: cachedData || [], hasMore: false };
      }

      // Handle different API response formats
      let notes = [];
      if (data?.notes && Array.isArray(data.notes)) {
        notes = data.notes;
      } else if (data?.data && Array.isArray(data.data)) {
        notes = data.data;
      } else if (Array.isArray(data)) {
        notes = data;
      }

      // Clean HTML from notes content before processing
      notes = notes.map(note => ({
        ...note,
        content: stripHtmlTags(note.content || '')
      }));

      // Deduplicate notes based on title and content to handle server duplicates
      notes = deduplicateNotes(notes);

      // Store all notes for client-side filtering
      if (reset || offset === 0) {
        setAllFeedData(notes);
      } else {
        setAllFeedData(prev => {
          const combined = [...prev, ...notes];
          return deduplicateNotes(combined);
        });
      }

      // Apply filter-specific processing
      let filteredNotes = await applyNoteFilter(notes, filter);

      if (filteredNotes.length >= 0) {
        if (reset || offset === 0) {
          setFeedData(filteredNotes);
          setCurrentOffset(0);
        } else {
          // When loading more, also deduplicate against existing data
          setFeedData(prev => {
            const combined = [...prev, ...filteredNotes];
            return deduplicateNotes(combined);
          });
        }
        setHasMore(data.hasMore !== false && notes.length === 20);
        console.log(`Feed loaded successfully: ${filteredNotes.length} filtered notes from ${notes.length} total`);
      } else {
        console.warn('Invalid feed data received:', data);
        setFeedData([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading feed:', error);
      // Don't show alert on every error to prevent spam
      setFeedData([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setCurrentOffset(0);
    // Clear cache and force fresh load
    SocialService.clearCachedFeedData();
    loadFeed(0, true);
  }, [filter]);

  // Deduplicate notes based on title, content, and author
  const deduplicateNotes = (notes) => {
    const seen = new Map();
    const deduplicated = [];

    for (const note of notes) {
      // Create a unique key based on title, content, and author
      const key = `${note.title || ''}-${(note.content || '').substring(0, 50)}-${note.author?.id || note.author?.email || ''}`;
      
      if (!seen.has(key)) {
        seen.set(key, true);
        deduplicated.push(note);
      } else {
        console.log(`Duplicate note filtered out: "${note.title}" by ${note.author?.name || 'Unknown'}`);
      }
    }

    console.log(`Deduplication: ${notes.length} -> ${deduplicated.length} notes`);
    return deduplicated;
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && isConnected) {
      const nextOffset = currentOffset + 20;
      setCurrentOffset(nextOffset);
      loadFeed(nextOffset, false);
    }
  };

  const handleLike = async (noteId, currentLikes, isLiked) => {
    if (!isConnected) {
      Alert.alert('Offline', 'You need an internet connection to like notes');
      return;
    }

    try {
      // Animate like button
      if (!animatedValues[noteId]) {
        animatedValues[noteId] = new Animated.Value(1);
      }

      Animated.sequence([
        Animated.timing(animatedValues[noteId], {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValues[noteId], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Optimistic update
      const newLikeCount = isLiked ? currentLikes - 1 : currentLikes + 1;
      const newIsLiked = !isLiked;

      setFeedData(prev => prev.map(note => 
        note.id === noteId 
          ? { ...note, likesCount: newLikeCount, isLikedByUser: newIsLiked }
          : note
      ));

      // Store optimistic update
      setOptimisticLikes(prev => ({
        ...prev,
        [noteId]: { likes: newLikeCount, isLiked: newIsLiked }
      }));

      // Perform actual API call
      await SocialService.optimisticLike(noteId, currentLikes, isLiked);

      // Add badge notification for liked notes
      if (!isLiked) {
        const noteData = feedData.find(note => note.id === noteId);
        if (noteData && noteData.author) {
          addLikeNotification(noteId, noteData.author.id || noteData.author.email);
        }
      }

      // If this is a new like (not unlike), prepare notification data
      if (!isLiked && user) {
        try {
          const noteData = feedData.find(note => note.id === noteId);
          if (noteData && noteData.author) {
            // For testing: temporarily allow notifications on own notes
            // Remove this condition in production: && noteData.author.id !== user.id
            
            console.log('Processing like notification for note:', noteId);
            console.log('Note author:', noteData.author.id, noteData.author.name);
            console.log('Current user:', user.id, user.name);
            
            // Debug stored tokens to understand authentication issue
            await NotificationService.debugStoredTokens();
            
            // Check if we have the author's push token
            if (noteData.author.pushToken) {
              console.log('Author has push token, sending notification...');
              // Create notification data for the note author
              await NotificationService.sendLikeNotification(
                noteData.author,
                user,
                noteData.title,
                noteId
              );
              console.log('Like notification sent successfully');
            } else {
              console.log('Note author has no push token in feed data');
              console.log('Note: Backend doesn\'t provide user push tokens - this is expected');
              
              // For now, only send notifications to the current user's own notes
              if (noteData.author.id === user.id) {
                try {
                  const currentUserToken = await NotificationService.getCurrentUserPushToken();
                  console.log('Current user push token available:', !!currentUserToken);
                  
                  if (currentUserToken) {
                    console.log('Sending self-notification for testing...');
                    console.log('Using token:', currentUserToken);
                    
                    // If it's the current user's own note, use their token for testing
                    const selfAuthor = { ...noteData.author, pushToken: currentUserToken };
                    await NotificationService.sendLikeNotification(
                      selfAuthor,
                      user,
                      noteData.title,
                      noteId
                    );
                    console.log('Self-notification sent successfully for testing');
                  } else {
                    console.log('No push token available for current user');
                  }
                } catch (selfError) {
                  console.log('Self-notification attempt failed:', selfError.message);
                }
              } else {
                console.log('Cross-user notifications not supported - backend doesn\'t provide user push tokens');
                console.log('This is expected behavior based on available endpoints');
              }
            }
          } else {
            console.log('No note data or author found for notification');
          }
        } catch (notificationError) {
          console.warn('Failed to send like notification:', notificationError);
          // Don't fail the like operation if notification fails
        }
      }

      // Remove optimistic update on success
      setOptimisticLikes(prev => {
        const updated = { ...prev };
        delete updated[noteId];
        return updated;
      });

    } catch (error) {
      console.error('Error liking note:', error);
      
      // Only revert if it's a critical error (not just API failure)
      if (!error.message.includes('Request failed with status code')) {
        // Revert optimistic update on critical failure
        setFeedData(prev => prev.map(note => 
          note.id === noteId 
            ? { ...note, likesCount: currentLikes, isLikedByUser: isLiked }
            : note
        ));
        
        setOptimisticLikes(prev => {
          const updated = { ...prev };
          delete updated[noteId];
          return updated;
        });

        Alert.alert('Error', 'Failed to like note');
      } else {
        console.log('API error handled gracefully - like will persist locally');
      }
    }
  };

  const renderFilterButtons = () => (
    <View style={[
      styles.filterContainer, 
      { 
        backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
        borderTopWidth: 0,
        marginTop: 5, // Add some space below the title
        paddingTop: 0,
        position: 'relative',
        top: 0
      }
    ]}>
      {[
        { key: 'recent', label: 'Recent', icon: 'time-outline' },
        { key: 'popular', label: 'Popular', icon: 'heart-outline' },
        { key: 'nearby', label: 'Nearby', icon: 'location-outline' },
      ].map(item => (
        <TouchableOpacity
          key={item.key}
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === item.key ? '#007AFF' : 'transparent',
            }
          ]}
          onPress={() => setFilter(item.key)}
        >
          <Ionicons
            name={item.icon}
            size={16}
            color={filter === item.key ? '#FFFFFF' : (isDarkMode ? '#8E8E93' : '#6D6D80')}
          />
          <Text style={[
            styles.filterText,
            {
              color: filter === item.key ? '#FFFFFF' : (isDarkMode ? '#8E8E93' : '#6D6D80')
            }
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderNote = ({ item }) => {
    const optimisticData = optimisticLikes[item.id];
    const displayLikes = optimisticData ? optimisticData.likes : item.likesCount;
    const displayIsLiked = optimisticData ? optimisticData.isLiked : item.isLikedByUser;

    return (
      <View
        style={[styles.noteCard, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF' }]}
      >
        {/* User Info */}
        <View style={styles.userInfo}>
          <View style={styles.userAvatarContainer}>
            {item.author?.profilePicture ? (
              <Image
                source={{ uri: getCompleteImageUrl(item.author.profilePicture) }}
                style={styles.userAvatar}
                onError={(error) => {
                  console.log('Social feed profile picture failed to load:', item.author.profilePicture);
                  console.log('Complete URL attempted:', getCompleteImageUrl(item.author.profilePicture));
                }}
                onLoad={() => {
                  console.log('Social feed profile picture loaded successfully:', item.author.profilePicture);
                }}
              />
            ) : (
              <View style={[styles.userAvatarPlaceholder, { backgroundColor: isDarkMode ? '#48484A' : '#E5E5EA' }]}>
                <Text style={[styles.userAvatarText, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                  {(item.author?.name || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
              {item.author?.name || 'Anonymous'}
            </Text>
            <Text style={[styles.noteDate, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
              {new Date(item.createdAt).toLocaleDateString()} • {item.category}
            </Text>
          </View>
          {item.location && (
            <View style={styles.locationBadge}>
              <Ionicons name="location" size={12} color="#007AFF" />
              <Text style={styles.locationText}>
                {item.location.address || 'Location available'}
                {filter === 'nearby' && item.distance !== undefined && 
                  ` • ${item.distance.toFixed(1)}km away`
                }
              </Text>
            </View>
          )}
        </View>

        {/* Note Content */}
        <View style={styles.noteContent}>
          <Text style={[styles.noteTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            {item.title}
          </Text>
          <Text
            style={[styles.noteText, { color: isDarkMode ? '#E5E5E7' : '#3A3A3C' }]}
            numberOfLines={3}
          >
            {stripHtmlTags(item.content)}
          </Text>
        </View>

        {/* Note Images */}
        {item.images && item.images.length > 0 && (
          <View style={styles.imagesContainer}>
            <Image
              source={{ uri: item.images[0] }}
              style={styles.noteImage}
              resizeMode="cover"
            />
            {item.images.length > 1 && (
              <View style={styles.moreImagesOverlay}>
                <Text style={styles.moreImagesText}>+{item.images.length - 1}</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => handleLike(item.id, displayLikes, displayIsLiked)}
          >
            <Animated.View
              style={{
                transform: [{ scale: animatedValues[item.id] || 1 }]
              }}
            >
              <Ionicons
                name={displayIsLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={displayIsLiked ? '#FF3B30' : (isDarkMode ? '#8E8E93' : '#6D6D80')}
              />
            </Animated.View>
            <Text style={[
              styles.likeCount,
              {
                color: displayIsLiked ? '#FF3B30' : (isDarkMode ? '#8E8E93' : '#6D6D80')
              }
            ]}>
              {displayLikes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton}>
            <Ionicons
              name="share-outline"
              size={20}
              color={isDarkMode ? '#8E8E93' : '#6D6D80'}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="people-outline"
        size={64}
        color={isDarkMode ? '#48484A' : '#C7C7CC'}
      />
      <Text style={[styles.emptyTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
        No Posts Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
        {isConnected
          ? 'Be the first to share a public note!'
          : 'Connect to the internet to see public notes'
        }
      </Text>
    </View>
  );

  const renderOfflineBanner = () => (
    <View style={styles.offlineBanner}>
      <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
      <Text style={styles.offlineText}>Viewing cached content</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#F2F2F7' }]}>
      {!isConnected && renderOfflineBanner()}
      {renderFilterButtons()}
      
      {/* Debug: Test notification badge - remove in production */}
      {__DEV__ && (
        <TouchableOpacity
          style={{
            backgroundColor: '#4CAF50',
            padding: 8,
            margin: 10,
            borderRadius: 5,
            alignItems: 'center'
          }}
          onPress={testAddLike}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
            Test Notification
          </Text>
        </TouchableOpacity>
      )}
      


      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#8E8E93' : '#6D6D80' }]}>
            Loading feed...
          </Text>
        </View>
      ) : (
        <FlatList
          data={feedData}
          renderItem={renderNote}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.feedContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
              </View>
            ) : null
          }
        />
             )}
     </View>
   );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  offlineBanner: {
    backgroundColor: '#FF9500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    marginTop: 0,
    paddingTop: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  feedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  noteCard: {
    borderRadius: 12,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatarContainer: {
    marginRight: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  noteDate: {
    fontSize: 12,
    marginTop: 2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationText: {
    fontSize: 11,
    color: '#007AFF',
    marginLeft: 4,
  },
  noteContent: {
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  imagesContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  noteImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moreImagesText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  shareButton: {
    padding: 8,
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
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
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
  },
});

export default SocialFeedScreen;
