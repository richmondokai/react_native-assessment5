import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDarkMode } from '../../hooks/useDarkMode';
import { stripHtmlTags } from '../../utils/htmlUtils';
import { NOTES_KEY } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { getLocalNotes } from '../../services/notes_local_services';

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const { user } = useAuth();

  useEffect(() => {
    loadNotes();
    
    // Set up a listener for when we return to this screen to refresh notes
    const unsubscribe = navigation.addListener('focus', () => {
      loadNotes();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadNotes = async () => {
    try {
      console.log('=== SEARCH SCREEN DEBUG ===');
      const userId = user?.email || user?.id;
      
      if (!userId) {
        console.log('No user ID available for search');
        setAllNotes([]);
        setIsLoading(false);
        return;
      }
      
      console.log('Loading notes for search, user:', userId);
      const notesArray = await getLocalNotes(userId);
      
      if (notesArray && notesArray.length > 0) {
        console.log('Found notes for search:', notesArray.length);
        console.log('Notes data:', notesArray.map(n => ({
          id: n.id,
          title: n.title,
          category: n.category,
          contentLength: n.content?.length || 0
        })));
        setAllNotes(notesArray);
      } else {
        console.log('No notes found in storage for search');
        setAllNotes([]);
      }
      console.log('=== END SEARCH SCREEN DEBUG ===');
    } catch (error) {
      console.log('Error loading notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setIsSearching(true);
    
    console.log('=== SEARCH DEBUG ===');
    console.log('Search query:', searchQuery);
    console.log('All notes count:', allNotes.length);
    
    // Simple search implementation - searches in title and content
    const query = searchQuery.toLowerCase().trim();
    const results = allNotes.filter(note => {
      const title = (note.title || '').toLowerCase();
      const content = (note.content || '').toLowerCase();
      const matches = title.includes(query) || content.includes(query);
      
      if (matches) {
        console.log('Found match:', {
          id: note.id,
          title: note.title,
          titleMatch: title.includes(query),
          contentMatch: content.includes(query)
        });
      }
      
      return matches;
    });
    
    console.log('Search results count:', results.length);
    console.log('=== END SEARCH DEBUG ===');
    
    setSearchResults(results);
    setIsSearching(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const renderNoteItem = ({ item }) => {
    const date = new Date(item.date);
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    // Highlight matching text in title and content
    const highlightText = (text) => {
      if (!searchQuery.trim()) return text;
      
      const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
      return parts.map((part, index) => {
        if (part.toLowerCase() === searchQuery.toLowerCase()) {
          return <Text key={index} style={[styles.highlightedText, isDarkMode && { backgroundColor: '#665500' }]}>{part}</Text>;
        }
        return part;
      });
    };
    
    return (
      <TouchableOpacity
        style={[styles.noteItem, isDarkMode && { 
          backgroundColor: darkModeStyles.card.backgroundColor,
          borderColor: darkModeStyles.card.borderColor
        }]}
        onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
      >
        <View style={styles.noteContent}>
          <Text style={[styles.noteTitle, isDarkMode && { color: darkModeStyles.text.color }]}>
            {highlightText(item.title)}
          </Text>
          <Text style={[styles.notePreview, isDarkMode && { color: darkModeStyles.subText.color }]} numberOfLines={2}>
            {highlightText(stripHtmlTags(item.content))}
          </Text>
          <View style={styles.noteFooter}>
            <Text style={[styles.noteDate, isDarkMode && { color: '#888' }]}>{formattedDate}</Text>
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

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, darkModeStyles.container]}>
        <ActivityIndicator size="large" color={isDarkMode ? "#4a9eff" : "#007AFF"} />
      </View>
    );
  }

  return (
    <View style={[styles.container, darkModeStyles.container]}>
      <View style={[styles.searchBarContainer, isDarkMode && { 
        backgroundColor: darkModeStyles.card.backgroundColor,
        borderBottomColor: darkModeStyles.separator.backgroundColor
      }]}>
        <View style={[styles.searchBar, isDarkMode && { 
          backgroundColor: '#2c2c2c',
          borderColor: darkModeStyles.card.borderColor
        }]}>
          <Ionicons name="search" size={20} color={isDarkMode ? "#b0b0b0" : "#666"} />
          <TextInput
            style={[styles.searchInput, isDarkMode && { color: darkModeStyles.text.color }]}
            placeholder="Search notes..."
            placeholderTextColor={isDarkMode ? '#888' : '#999'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color={isDarkMode ? "#b0b0b0" : "#999"} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        <View style={[styles.loadingContainer, { backgroundColor: 'transparent' }]}>
          <ActivityIndicator size="small" color={isDarkMode ? "#4a9eff" : "#007AFF"} />
        </View>
      ) : (
        <>
          {searchQuery.length > 0 && (
            <Text style={[styles.resultsCount, isDarkMode && { 
              color: darkModeStyles.subText.color,
              borderBottomColor: darkModeStyles.separator.backgroundColor
            }]}>
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
            </Text>
          )}
          
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderNoteItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.notesList}
            />
          ) : (
            searchQuery.length > 0 && (
              <View style={[styles.emptyContainer, isDarkMode && { backgroundColor: 'transparent' }]}>
                <Ionicons name="search-outline" size={60} color={isDarkMode ? "#444" : "#ccc"} />
                <Text style={[styles.emptyText, isDarkMode && { color: darkModeStyles.subText.color }]}>No results found</Text>
                <Text style={[styles.emptySubtext, isDarkMode && { color: darkModeStyles.subText.color }]}>Try different keywords</Text>
              </View>
            )
          )}
        </>
      )}
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
  searchBarContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    padding: 0,
  },
  resultsCount: {
    padding: 16,
    fontSize: 14,
    color: '#666',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  highlightedText: {
    backgroundColor: '#FFFF00',
    fontWeight: '500',
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

export default SearchScreen;