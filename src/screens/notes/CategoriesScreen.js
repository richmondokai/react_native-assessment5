import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDarkMode } from '../../hooks/useDarkMode';
import { stripHtmlTags } from '../../utils/htmlUtils';
import { useAuth } from '../../context/AuthContext';
import { useNotes } from '../../context/NotesContext';
import { useFocusEffect } from '@react-navigation/native';

const CategoriesScreen = ({ navigation }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryNotes, setCategoryNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const { user } = useAuth();
  const { notes } = useNotes();
  
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

  const defaultCategories = [
    { name: 'Personal', color: '#2196F3', icon: 'person-outline' },
    { name: 'Work', color: '#4CAF50', icon: 'briefcase-outline' },
    { name: 'Ideas', color: '#FF9800', icon: 'bulb-outline' },
    { name: 'To-Do', color: '#9C27B0', icon: 'checkbox-outline' }
  ];

  // Seamless auto-refresh when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('=== CATEGORIES SCREEN FOCUS EFFECT ===');
      console.log('CategoriesScreen focused - performing seamless refresh');
      
      let isActive = true; // Cleanup flag
      
      const performSeamlessRefresh = async () => {
        if (!isActive) return; // Prevent state updates if component unmounted
        
        const now = Date.now();
        const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
        
        // Only refresh if we haven't refreshed recently to avoid interfering with real-time updates
        if (timeSinceLastRefresh > DEBOUNCE_TIME) {
          lastRefreshTimeRef.current = now;
          console.log('Background refreshing categories data');
          
          // Load categories from current notes state (seamless - no loading indicator)
          if (isActive) {
            loadCategories(true);
            if (selectedCategory) {
              loadCategoryNotes(selectedCategory);
            }
          }
        } else {
          console.log(`Skipping refresh - last refresh was ${timeSinceLastRefresh}ms ago`);
          // Even if we skip the refresh, ensure categories are up to date
          if (isActive && user && Array.isArray(notes)) {
            // Update categories
            if (notes.length > 0) {
              const categoryCounts = {};
              notes.forEach(note => {
                if (note) {
                  const category = note.category || 'Personal';
                  if (categoryCounts[category]) {
                    categoryCounts[category]++;
                  } else {
                    categoryCounts[category] = 1;
                  }
                }
              });
              
              const categoryList = defaultCategories.map(cat => ({
                ...cat,
                count: categoryCounts[cat.name] || 0
              }));
              
              setCategories(categoryList);
              console.log('Categories updated from focus effect (skipped refresh)');
            }
            
            // Update category notes if a category is selected
            if (selectedCategory) {
              const filteredNotes = notes.filter(note => note && (note.category || 'Personal') === selectedCategory);
              const sortedCategoryNotes = filteredNotes.sort((a, b) => {
                const timeA = new Date(a.updatedAt || a.date || 0).getTime();
                const timeB = new Date(b.updatedAt || b.date || 0).getTime();
                return timeB - timeA;
              });
              setCategoryNotes(sortedCategoryNotes);
              console.log('Category notes updated from focus effect (skipped refresh):', sortedCategoryNotes.length);
            }
          }
        }
      };
      
      performSeamlessRefresh();
      
      // Cleanup function
      return () => {
        isActive = false;
      };
    }, [loadCategories, loadCategoryNotes, selectedCategory, notes, user]) // Depend on notes and user to ensure we have latest data
  );

  // Reload categories whenever notes change (for real-time updates)
  useEffect(() => {
    console.log('=== CATEGORIES SCREEN NOTES CHANGE EFFECT ===');
    console.log('CategoriesScreen: Notes or user changed, reloading categories');
    console.log('Notes count:', notes?.length || 0);
    console.log('User:', user?.email || user?.id);
    console.log('Notes array:', notes?.map(n => ({ id: n.id, title: n.title, category: n.category })));
    
    // Directly update categories when notes change
    if (user && Array.isArray(notes)) {
      if (notes.length > 0) {
        // Get unique categories and count notes in each with null safety
        const categoryCounts = {};
        notes.forEach(note => {
          if (note) {
            const category = note.category || 'Personal'; // Default to Personal if no category
            if (categoryCounts[category]) {
              categoryCounts[category]++;
            } else {
              categoryCounts[category] = 1;
            }
          }
        });
        
        console.log('Category counts:', categoryCounts);
        
        // Map to our category format
        const categoryList = defaultCategories.map(cat => ({
          ...cat,
          count: categoryCounts[cat.name] || 0
        }));
        
        console.log('Final category list:', categoryList);
        
        // Only update if the categories actually changed
        const currentCategoriesString = JSON.stringify(categories);
        const newCategoriesString = JSON.stringify(categoryList);
        
        if (currentCategoriesString !== newCategoriesString) {
          console.log('Categories changed - updating state');
          setCategories(categoryList);
          console.log('Categories updated directly from notes change');
        } else {
          console.log('Categories unchanged - skipping update');
        }
      } else {
        // No notes yet, show empty categories
        const emptyCategories = defaultCategories.map(cat => ({
          ...cat,
          count: 0
        }));
        
        const currentCategoriesString = JSON.stringify(categories);
        const newCategoriesString = JSON.stringify(emptyCategories);
        
        if (currentCategoriesString !== newCategoriesString) {
          console.log('Categories changed to empty - updating state');
          setCategories(emptyCategories);
        }
      }
    }
    console.log('=== END CATEGORIES SCREEN NOTES CHANGE EFFECT ===');
  }, [notes, user, categories]); // Depend on notes, user, and categories for change detection

  // Additional effect to force refresh when categories change
  useEffect(() => {
    console.log('=== CATEGORIES SCREEN CATEGORIES CHANGE EFFECT ===');
    console.log('Categories state changed:', categories?.length || 0);
    console.log('Current categories:', categories?.map(cat => ({ name: cat.name, count: cat.count })));
    console.log('=== END CATEGORIES SCREEN CATEGORIES CHANGE EFFECT ===');
  }, [categories]);

  // Additional effect to force refresh when category notes change
  useEffect(() => {
    console.log('=== CATEGORIES SCREEN CATEGORY NOTES CHANGE EFFECT ===');
    console.log('Category notes state changed:', categoryNotes?.length || 0);
    console.log('Current category notes:', categoryNotes?.map(n => ({ id: n.id, title: n.title, category: n.category })));
    console.log('=== END CATEGORIES SCREEN CATEGORY NOTES CHANGE EFFECT ===');
  }, [categoryNotes]);

  // Reload category notes when selectedCategory changes or notes change
  useEffect(() => {
    console.log('=== CATEGORIES SCREEN CATEGORY NOTES EFFECT ===');
    console.log('Selected category or notes changed');
    console.log('Selected category:', selectedCategory);
    console.log('Notes count:', notes?.length || 0);
    
    if (selectedCategory && user && Array.isArray(notes)) {
      // Directly update category notes when notes change
      const filteredNotes = notes.filter(note => note && (note.category || 'Personal') === selectedCategory);
      console.log('Filtered notes for', selectedCategory + ':', filteredNotes.length);
      
      // Sort by most recently updated
      const sortedCategoryNotes = filteredNotes.sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.date || 0).getTime();
        const timeB = new Date(b.updatedAt || b.date || 0).getTime();
        return timeB - timeA;
      });
      
      // Only update if the category notes actually changed
      const currentNotesString = JSON.stringify(categoryNotes);
      const newNotesString = JSON.stringify(sortedCategoryNotes);
      
      if (currentNotesString !== newNotesString) {
        console.log('Category notes changed - updating state');
        setCategoryNotes(sortedCategoryNotes);
        console.log('Category notes updated directly from notes change:', sortedCategoryNotes.length);
      } else {
        console.log('Category notes unchanged - skipping update');
      }
    } else if (selectedCategory) {
      // If we have a selected category but no notes/user, clear the notes
      setCategoryNotes([]);
    }
    console.log('=== END CATEGORIES SCREEN CATEGORY NOTES EFFECT ===');
  }, [selectedCategory, notes, user, categoryNotes]); // Depend on notes, user, and categoryNotes for change detection
  
  // Set navigation options
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true
    });
  }, [navigation]);

  const loadCategories = React.useCallback((isSeamless = false) => {
    try {
      console.log('=== LOAD CATEGORIES FUNCTION CALLED ===');
      console.log('loadCategories called with isSeamless:', isSeamless);
      console.log('=== CATEGORIES SCREEN DEBUG ===');
      console.log('Is seamless refresh:', isSeamless);
      
      if (!user) {
        console.log('No user available for categories');
        setCategories(defaultCategories.map(cat => ({ ...cat, count: 0 })));
        console.log('Setting loading to false (no user)');
        setLoading(false); // Always set loading to false
        return;
      }
      
      console.log('Loading categories from notes context:', notes?.length || 0);
      const notesArray = Array.isArray(notes) ? notes : [];
      
      if (notesArray.length > 0) {
        console.log('Found notes in storage:', notesArray.length);
        console.log('Notes data:', notesArray.map(n => ({
          id: n.id,
          title: n.title,
          category: n.category
        })));
        
        // Get unique categories and count notes in each with null safety
        const categoryCounts = {};
        notesArray.forEach(note => {
          if (note) {
            const category = note.category || 'Personal'; // Default to Personal if no category
            if (categoryCounts[category]) {
              categoryCounts[category]++;
            } else {
              categoryCounts[category] = 1;
            }
          }
        });
        
        console.log('Category counts:', categoryCounts);
        
        // Map to our category format
        const categoryList = defaultCategories.map(cat => ({
          ...cat,
          count: categoryCounts[cat.name] || 0
        }));
        
        console.log('Final category list:', categoryList);
        setCategories(categoryList);
      } else {
        console.log('No notes found in storage');
        // No notes yet, show empty categories
        setCategories(defaultCategories.map(cat => ({
          ...cat,
          count: 0
        })));
      }
      console.log('=== END CATEGORIES SCREEN DEBUG ===');
    } catch (error) {
      console.error('Error loading categories:', error);
      console.error('Error stack:', error.stack);
      
      // Set default categories on error
      setCategories(defaultCategories.map(cat => ({
        ...cat,
        count: 0
      })));
    } finally {
      console.log('Setting loading to false');
      setLoading(false); // Always set loading to false
    }
  }, [notes, user]); // Stable function with proper dependencies

  const loadCategoryNotes = React.useCallback((category) => {
    setLoading(true);
    try {
      console.log('=== LOAD CATEGORY NOTES FUNCTION CALLED ===');
      console.log('loadCategoryNotes called for category:', category);
      console.log('=== LOADING CATEGORY NOTES ===');
      console.log('Loading notes for category:', category);
      
      if (!user) {
        console.log('No user available for category notes');
        setCategoryNotes([]);
        setLoading(false);
        return;
      }
      
      const notesArray = Array.isArray(notes) ? notes : [];
      console.log('Notes from context for category:', notesArray.length);
      
      if (notesArray.length > 0) {
        console.log('All notes:', notesArray.length);
        const filteredNotes = notesArray.filter(note => note && (note.category || 'Personal') === category);
        console.log('Filtered notes for', category + ':', filteredNotes.length);
        console.log('Filtered notes:', filteredNotes.map(n => ({
          id: n.id,
          title: n.title,
          category: n.category
        })));
        
        // Sort by most recently updated
        const sortedCategoryNotes = filteredNotes.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.date || 0).getTime();
          const timeB = new Date(b.updatedAt || b.date || 0).getTime();
          return timeB - timeA;
        });
        
        setCategoryNotes(sortedCategoryNotes);
      } else {
        console.log('No notes in storage');
        setCategoryNotes([]);
      }
      console.log('=== END LOADING CATEGORY NOTES ===');
    } catch (error) {
      console.error('Error loading category notes:', error);
      console.error('Error stack:', error.stack);
      
      // Set empty array on error
      setCategoryNotes([]);
    } finally {
      setLoading(false);
    }
  }, [notes, user]); // Stable function with proper dependencies

  const handleCategoryPress = (category) => {
    if (selectedCategory === category.name) {
      // If already selected, deselect it
      setSelectedCategory(null);
      setCategoryNotes([]);
    } else {
      setSelectedCategory(category.name);
      loadCategoryNotes(category.name);
    }
  };

  const renderCategoryItem = ({ item }) => {
    const isSelected = selectedCategory === item.name;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isDarkMode && { 
            backgroundColor: isSelected ? `${item.color}30` : darkModeStyles.card.backgroundColor,
            borderColor: darkModeStyles.card.borderColor
          },
          !isDarkMode && isSelected && { backgroundColor: `${item.color}20` }
        ]}
        onPress={() => handleCategoryPress(item)}
      >
        <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={24} color="#fff" />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, isDarkMode && { color: darkModeStyles.text.color }]}>{item.name}</Text>
          <Text style={[styles.categoryCount, isDarkMode && { color: darkModeStyles.subText.color }]}>{item.count} notes</Text>
        </View>
        <Ionicons 
          name={isSelected ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={isDarkMode ? "#b0b0b0" : "#999"} 
        />
      </TouchableOpacity>
    );
  };

  const renderNoteItem = ({ item }) => {
    const date = new Date(item.date);
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    return (
      <TouchableOpacity
        style={[
          styles.noteItem, 
          isDarkMode && { 
            backgroundColor: '#2c2c2c',
            borderColor: darkModeStyles.card.borderColor 
          }
        ]}
        onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
      >
        <View style={styles.noteContent}>
          <Text style={[styles.noteTitle, isDarkMode && { color: darkModeStyles.text.color }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.notePreview, isDarkMode && { color: darkModeStyles.subText.color }]} numberOfLines={2}>
            {stripHtmlTags(item.content)}
          </Text>
          <View style={styles.noteFooter}>
            <Text style={[styles.noteDate, isDarkMode && { color: '#888' }]}>{formattedDate}</Text>
            {item.isFavorite && (
              <Ionicons name="star" size={16} color="#FFD700" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !selectedCategory) {
    console.log('CategoriesScreen: Showing loading state');
    return (
      <View style={[styles.loadingContainer, darkModeStyles.container]}>
        <ActivityIndicator size="large" color={isDarkMode ? "#4a9eff" : "#007AFF"} />
      </View>
    );
  }

  console.log('=== CATEGORIES SCREEN RENDER ===');
  console.log('Rendering categories screen');
  console.log('categories state:', categories);
  console.log('categories length:', categories?.length);
  console.log('selectedCategory:', selectedCategory);
  console.log('categoryNotes length:', categoryNotes?.length);
  console.log('notes from context:', notes?.length || 0);
  console.log('notes with categories:', notes?.map(n => ({ id: n.id, title: n.title, category: n.category })));
  console.log('=== END RENDER DEBUG ===');

  return (
    <View style={[styles.container, darkModeStyles.container]}>

      
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={item => item.name}
        contentContainerStyle={styles.categoriesList}
      />

      {selectedCategory && (
        <View style={[styles.notesContainer, isDarkMode && { 
          backgroundColor: darkModeStyles.card.backgroundColor,
          borderTopColor: darkModeStyles.separator.backgroundColor
        }]}>
          <Text style={[styles.notesTitle, isDarkMode && { color: darkModeStyles.text.color }]}>
            {selectedCategory} Notes ({categoryNotes.length})
          </Text>
          
          {loading ? (
            <ActivityIndicator size="small" color={isDarkMode ? "#4a9eff" : "#007AFF"} style={styles.notesLoading} />
          ) : categoryNotes.length > 0 ? (
            <FlatList
              data={categoryNotes}
              renderItem={renderNoteItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.notesList}
            />
          ) : (
            <View style={[styles.emptyNotesContainer, isDarkMode && { backgroundColor: 'transparent' }]}>
              <Text style={[styles.emptyNotesText, isDarkMode && { color: darkModeStyles.subText.color }]}>
                No notes in this category yet
              </Text>
            </View>
          )}
        </View>
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
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    color: '#333',
  },
  categoriesList: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  notesContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 16,
    color: '#333',
  },
  notesLoading: {
    marginTop: 20,
  },
  notesList: {
    padding: 16,
  },
  noteItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
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
  emptyNotesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyNotesText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },

});

export default CategoriesScreen;
