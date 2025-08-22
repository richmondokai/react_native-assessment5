import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotes } from '../../context/NotesContext';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useFocusEffect } from '@react-navigation/native';
import { stripHtmlTags, getNoteTextContent } from '../../utils/htmlUtils';

const FavoritesScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const { notes } = useNotes();
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  
  // Track last refresh time to prevent excessive refreshing
  const lastRefreshTimeRef = useRef(0);
  const DEBOUNCE_TIME = 2000; // 2 seconds
  
  // Safety timeout to prevent stuck loading state
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.log('Safety timeout triggered - forcing loading state off');
        setLoading(false);
      }
    }, 5000); // 5 second safety timeout
    
    return () => clearTimeout(safetyTimeout);
  }, [loading]);

  // Seamless auto-refresh when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('=== FAVORITES SCREEN FOCUS EFFECT ===');
      console.log('FavoritesScreen focused - performing seamless refresh');
      
      let isActive = true; // Cleanup flag
      
      const performSeamlessRefresh = async () => {
        if (!isActive) return; // Prevent state updates if component unmounted
        
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
        
        // Only refresh if we haven't refreshed recently to avoid interfering with real-time updates
        if (timeSinceLastRefresh > DEBOUNCE_TIME) {
          lastRefreshTimeRef.current = now;
          console.log('Background refreshing favorites data');
          
          // Load favorites from current notes state (seamless - no loading indicator)
          if (isActive) {
            console.log('Calling loadFavorites from focus effect');
            loadFavorites(true);
          }
        } else {
          console.log(`Skipping refresh - last refresh was ${timeSinceLastRefresh}ms ago`);
          // Even if we skip the refresh, ensure favorites are up to date
          if (isActive && user && Array.isArray(notes)) {
            const favoriteNotes = notes.filter(note => note && note.isFavorite === true);
            const sortedFavorites = favoriteNotes.sort((a, b) => {
              const timeA = new Date(a.updatedAt || a.date || 0).getTime();
              const timeB = new Date(b.updatedAt || b.date || 0).getTime();
              return timeB - timeA;
            });
            setFavorites(sortedFavorites);
            console.log('Favorites updated from focus effect (skipped refresh):', sortedFavorites.length);
          }
        }
      };
      
      performSeamlessRefresh();
      
      // Cleanup function
      return () => {
        isActive = false;
      };
    }, [loadFavorites, notes, user]) // Depend on notes and user to ensure we have latest data
  );

  // Reload favorites whenever notes change (for real-time updates)
  useEffect(() => {
    console.log('=== FAVORITES SCREEN NOTES CHANGE EFFECT ===');
    console.log('FavoritesScreen: Notes or user changed, reloading favorites');
    console.log('Notes count:', notes?.length || 0);
    console.log('User:', user?.email || user?.id);
    console.log('Notes array:', notes?.map(n => ({ id: n.id, title: n.title, isFavorite: n.isFavorite })));
    
    // Directly update favorites when notes change
    if (user && Array.isArray(notes)) {
      const favoriteNotes = notes.filter(note => note && note.isFavorite === true);
      const sortedFavorites = favoriteNotes.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.date || 0).getTime();
        const timeB = new Date(b.updatedAt || b.date || 0).getTime();
        return timeB - timeA;
      });
      
      // Only update if the favorites actually changed
      const currentFavoritesString = JSON.stringify(favorites);
      const newFavoritesString = JSON.stringify(sortedFavorites);
      
      if (currentFavoritesString !== newFavoritesString) {
        console.log('Favorites changed - updating state');
        setFavorites(sortedFavorites);
        console.log('Favorites updated directly from notes change:', sortedFavorites.length);
        console.log('New favorites:', sortedFavorites.map(n => ({ id: n.id, title: n.title, isFavorite: n.isFavorite })));
      } else {
        console.log('Favorites unchanged - skipping update');
      }
    }
    console.log('=== END FAVORITES SCREEN NOTES CHANGE EFFECT ===');
  }, [notes, user, favorites]); // Depend on notes, user, and favorites for change detection

  // Additional effect to force refresh when favorites change
  useEffect(() => {
    console.log('=== FAVORITES SCREEN FAVORITES CHANGE EFFECT ===');
    console.log('Favorites state changed:', favorites?.length || 0);
    console.log('Current favorites:', favorites?.map(n => ({ id: n.id, title: n.title, isFavorite: n.isFavorite })));
    console.log('=== END FAVORITES SCREEN FAVORITES CHANGE EFFECT ===');
  }, [favorites]);
  
  // Set navigation options
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true
    });
  }, [navigation]);

  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadFavorites();
    setTimeout(() => setRefreshing(false), 300); // Small delay for visual feedback
  };

  const loadFavorites = React.useCallback((isSeamless = false) => {
    try {
      console.log('loadFavorites called with isSeamless:', isSeamless);
      // Only show loading indicator if not a seamless refresh
      if (!isSeamless) {
        console.log('Setting loading to true');
        setLoading(true);
      }
      
      if (!user) {
        console.log('No user available for favorites');
        setFavorites([]);
        setLoading(false); // Always set loading to false
        return;
      }
      
      console.log('=== FAVORITES SCREEN DEBUG ===');
      console.log('Loading favorites from notes context:', notes?.length || 0);
      console.log('Is seamless refresh:', isSeamless);
      
      // Filter favorites from the notes context directly with null safety
      const notesArray = Array.isArray(notes) ? notes : [];
      const favoriteNotes = notesArray.filter(note => note && note.isFavorite === true);
      
      console.log('Found favorite notes:', favoriteNotes.length);
      console.log('Favorite notes:', favoriteNotes.map(n => ({
        id: n.id,
        title: n.title,
        isFavorite: n.isFavorite
      })));
      
      // Sort by most recently updated
      const sortedFavorites = favoriteNotes.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.date || 0).getTime();
        const timeB = new Date(b.updatedAt || b.date || 0).getTime();
        return timeB - timeA;
      });
      
      setFavorites(sortedFavorites);
      console.log('Favorites state has been updated');
      console.log('=== END FAVORITES SCREEN DEBUG ===');
    } catch (error) {
      console.log('Error loading favorites:', error);
      // Set empty array on error to prevent crashes
      setFavorites([]);
    } finally {
      console.log('Setting loading to false');
      setLoading(false); // Always set loading to false
    }
  }, [notes, user]); // Stable function with proper dependencies

  const renderNoteItem = ({ item }) => {
    if (!item) return null;
    
    const date = new Date(item.date || new Date());
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    return (
      <TouchableOpacity
        style={[
          styles.noteItem, 
          isDarkMode && { 
            backgroundColor: darkModeStyles.card.backgroundColor,
            borderColor: darkModeStyles.card.borderColor,
          }
        ]}
        onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
      >
        <View style={styles.noteContent}>
          <Text style={[styles.noteTitle, isDarkMode && { color: darkModeStyles.text.color }]} numberOfLines={1}>
            {item.title || 'Untitled Note'}
          </Text>
          <Text style={[styles.notePreview, isDarkMode && { color: darkModeStyles.subText.color }]} numberOfLines={2}>
            {getNoteTextContent(item) || 'No content'}
          </Text>
          <View style={styles.noteFooter}>
            <Text style={[styles.noteDate, isDarkMode && { color: '#888' }]}>{formattedDate}</Text>
            <View style={styles.noteMetadata}>
              <Ionicons name="star" size={16} color="#FFD700" style={styles.noteIcon} />
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category || 'Personal') }]}>
                <Text style={styles.categoryText}>{item.category || 'Personal'}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Work':
        return '#4CAF50';
      case 'Personal':
        return '#2196F3';
      case 'Ideas':
        return '#FF9800';
      case 'To-Do':
        return '#9C27B0';
      default:
        return '#607D8B';
    }
  };

  if (loading) {
    console.log('FavoritesScreen: Showing loading state');
    return (
      <View style={[styles.loadingContainer, darkModeStyles.container]}>
        <ActivityIndicator size="large" color={isDarkMode ? "#4a9eff" : "#007AFF"} />
      </View>
    );
  }

  console.log('=== FAVORITES SCREEN RENDER ===');
  console.log('Rendering favorites screen');
  console.log('favorites state:', favorites);
  console.log('favorites length:', favorites?.length);
  console.log('favorites is array?', Array.isArray(favorites));
  console.log('loading state:', loading);
  console.log('notes from context:', notes?.length || 0);
  console.log('notes with favorites:', notes?.filter(n => n?.isFavorite)?.map(n => ({ id: n.id, title: n.title, isFavorite: n.isFavorite })));
  console.log('=== END RENDER DEBUG ===');

  return (
    <View style={[styles.container, darkModeStyles.container]}>
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>You are offline. Showing cached favorites.</Text>
        </View>
      )}
      

      
      {(() => {
        const hasData = favorites && favorites.length > 0;
        console.log('=== RENDER CONDITION DEBUG ===');
        console.log('favorites:', !!favorites);
        console.log('favorites.length:', favorites?.length);
        console.log('favorites.length > 0:', favorites?.length > 0);
        console.log('hasData condition result:', hasData);
        console.log('=== END CONDITION DEBUG ===');
        
        return hasData ? (
          <>
            {console.log('=== RENDERING FLATLIST ===')}
            <FlatList
              data={favorites}
              renderItem={(props) => {
                console.log('FlatList renderItem called with:', props.item?.title);
                return renderNoteItem(props);
              }}
              keyExtractor={item => {
                const key = item?.id?.toString() || Math.random().toString();
                console.log('FlatList keyExtractor:', key);
                return key;
              }}
              contentContainerStyle={styles.notesList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[isDarkMode ? "#4a9eff" : "#007AFF"]}
                  tintColor={isDarkMode ? "#4a9eff" : "#007AFF"}
                />
              }
            />
          </>
        ) : (
          <>
            {console.log('=== RENDERING EMPTY STATE ===')}
            <View style={[styles.emptyContainer, isDarkMode && { backgroundColor: 'transparent' }]}>
              <Ionicons name="star-outline" size={80} color={isDarkMode ? "#444" : "#ccc"} />
              <Text style={[styles.emptyText, isDarkMode && { color: darkModeStyles.subText.color }]}>No favorites yet</Text>
              <Text style={[styles.emptySubtext, isDarkMode && { color: darkModeStyles.subText.color }]}>Star your important notes to see them here</Text>
            </View>
          </>
        );
      })()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  offlineBanner: {
    backgroundColor: '#FF3B30',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesList: {
    padding: 16,
  },
  noteItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  notePreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  noteMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteIcon: {
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#999',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },

});

export default FavoritesScreen;