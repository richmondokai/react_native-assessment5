import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNotes } from '../../context/NotesContext';
import { useNetwork } from '../../context/NetworkContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useFocusEffect } from '@react-navigation/native';
import { NOTES_KEY } from '../../constants';
import { stripHtmlTags, getNoteTextContent } from '../../utils/htmlUtils';

const NotesListScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const { notes, isLoading: loading, refreshNotes } = useNotes();
  const { isConnected } = useNetwork();
  
  // Use a ref to track last refresh time to prevent excessive refreshing
  const lastRefreshTimeRef = useRef(0);
  // Debounce time in milliseconds (2 seconds)
  const DEBOUNCE_TIME = 2000;
  
  // Refresh notes when screen is focused, but with debounce to prevent excessive refreshing
  useFocusEffect(
    React.useCallback(() => {
      console.log('NotesListScreen focused');
      
      // Use a flag to prevent multiple refreshes
      let isMounted = true;
      
          // Only refresh on first focus or when returning from edit
      // We'll use a session storage flag to track if we're coming from an edit
      const checkAndRefresh = async () => {
        try {
          const editCompleted = await AsyncStorage.getItem('EDIT_COMPLETED');
          const isFirstLoad = lastRefreshTimeRef.current === 0;
          
          if (isFirstLoad || editCompleted === 'true') {
            console.log('Refreshing notes - first load or edit completed');
            lastRefreshTimeRef.current = Date.now();
            
            if (editCompleted === 'true') {
              await AsyncStorage.removeItem('EDIT_COMPLETED');
              console.log('Edit completed flag cleared');
            }
            
            if (isMounted) {
              try {
                // Only set refreshing if we're not already loading
                if (!refreshing && !loading) {
                  setRefreshing(true);
                }
                
                // Set a timeout to ensure we don't get stuck in loading state
                const refreshPromise = refreshNotes().catch(err => {
                  console.log('Caught refresh error:', err);
                  return { success: false, error: err.message };
                });
                
                const timeoutPromise = new Promise((resolve) => {
                  setTimeout(() => {
                    console.log('Refresh timeout reached');
                    resolve({ success: true, timedOut: true });
                  }, 5000); // 5 second timeout
                });
                
                // Use Promise.race to handle potential hanging
                try {
                  await Promise.race([refreshPromise, timeoutPromise]);
                } catch (raceError) {
                  console.log('Error in refresh race:', raceError);
                }
                console.log('Notes refreshed from context or timed out');
              } catch (error) {
                console.error('Error refreshing notes on focus:', error);
              } finally {
                // Always reset refreshing state after a delay to ensure UI updates
                if (isMounted) {
                  setTimeout(() => {
                    setRefreshing(false);
                  }, 300);
                }
              }
            }
          } else {
            console.log('Skipping refresh - not first load or after edit');
          }
        } catch (error) {
          console.error('Error checking refresh status:', error);
        }
      };
      
      // Execute the check and refresh
      checkAndRefresh();
      
      return () => {
        // Cleanup function when screen is unfocused
        console.log('NotesListScreen unfocused');
        isMounted = false;
      };
    }, []) // Remove dependencies to prevent infinite loops
  );

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotes();
    setRefreshing(false);
  };

  const handleSearchPress = () => {
    navigation.navigate('Search');
  };

  const handleAddNote = () => {
    navigation.navigate('NoteDetail', { isNew: true });
  };

  const renderNoteItem = ({ item }) => {
    const creationDate = new Date(item.date);
    const formattedDate = `${creationDate.toLocaleDateString()} ${creationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
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
            {item.title}
          </Text>
          <Text style={[styles.notePreview, isDarkMode && { color: darkModeStyles.subText.color }]} numberOfLines={2}>
            {getNoteTextContent(item)}
          </Text>
          <View style={styles.noteFooter}>
            <View style={styles.dateContainer}>
              <Text style={[styles.noteDate, isDarkMode && { color: '#888' }]}>{formattedDate}</Text>
            </View>
            <View style={styles.noteMetadata}>
              {item.isFavorite && (
                <Ionicons name="star" size={16} color="#FFD700" style={styles.noteIcon} />
              )}
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
                <Text style={styles.categoryText}>{item.category}</Text>
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
    return (
      <View style={[styles.loadingContainer, darkModeStyles.container]}>
        <ActivityIndicator size="large" color={isDarkMode ? "#4a9eff" : "#007AFF"} />
      </View>
    );
  }

  // Sort notes by creation date in descending order (newest first)
  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt || 0);
    const dateB = new Date(b.date || b.createdAt || 0);
    
    // Debug logging for the first few notes
    if (notes.length <= 5) {
      console.log(`📅 Sorting note "${a.title}" (${a.date}) vs "${b.title}" (${b.date})`);
      console.log(`📅 Date A: ${dateA.toISOString()}, Date B: ${dateB.toISOString()}`);
      console.log(`📅 Comparison result: ${dateB.getTime() - dateA.getTime()}`);
    }
    
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <View style={[styles.container, darkModeStyles.container]}>
      <TouchableOpacity 
        style={[styles.searchBar, isDarkMode && { 
          backgroundColor: darkModeStyles.card.backgroundColor,
          borderColor: darkModeStyles.card.borderColor,
        }]}
        onPress={handleSearchPress}
      >
        <Ionicons name="search" size={20} color={isDarkMode ? "#b0b0b0" : "#666"} />
        <Text style={[styles.searchPlaceholder, isDarkMode && { color: "#888" }]}>Search notes...</Text>
      </TouchableOpacity>
      
      {sortedNotes.length > 0 ? (
        <FlatList
          data={sortedNotes}
          renderItem={renderNoteItem}
          keyExtractor={item => item.id}
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
      ) : (
        <View style={[styles.emptyContainer, isDarkMode && { backgroundColor: 'transparent' }]}>
          <Ionicons name="document-text-outline" size={80} color={isDarkMode ? "#444" : "#ccc"} />
          <Text style={[styles.emptyText, isDarkMode && { color: darkModeStyles.subText.color }]}>No notes yet</Text>
          <Text style={[styles.emptySubtext, isDarkMode && { color: darkModeStyles.subText.color }]}>Tap the + button to create your first note</Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.fab, isDarkMode && { backgroundColor: darkModeStyles.button.backgroundColor }]}
        onPress={handleAddNote}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchPlaceholder: {
    marginLeft: 10,
    fontSize: 16,
    color: '#999',
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
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  dateLabel: {
    fontSize: 10,
    color: '#999',
    marginLeft: 4,
    fontStyle: 'italic',
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
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    right: 20,
    bottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default NotesListScreen;