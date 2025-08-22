import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNotes, addNotes, updateNotes, deleteNotes, getFavoriteNotes as getRemoteFavorites, addFavoriteNotes, deleteFavoriteNotes } from '../services/notes_remote_services';
import { getLocalNotes, addNote, updateNote as updateLocalNote, deleteNote as deleteLocalNote, addAllNotes, toggleFavorite, cleanHtmlFromNotes } from '../services/notes_local_services';
import { useNetwork } from './NetworkContext';
import { useAuth } from './AuthContext';
import offlineQueueService, { OPERATION_TYPES, OPERATION_PRIORITY } from '../services/offline_queue_service';
import syncService from '../services/sync_service';
import { debugAsyncStorage } from '../utils/debugStorage';

// Create context
export const NotesContext = createContext({
  notes: [],
  isLoading: true,
  createNote: () => {},
  updateNote: () => {},
  deleteNote: () => {},
  getNoteById: () => {},
  getNotesByCategory: () => {},
  getFavoriteNotes: () => {},
  addToFavorites: () => {},
  removeFromFavorites: () => {},
  searchNotes: () => {},
  clearAllNotes: () => {},
  refreshNotes: () => {},
});

/**
 * Notes provider component
 */
export const NotesProvider = ({ children }) => {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected } = useNetwork();
  const { isAuthenticated, user } = useAuth();
  
  // Load notes when authenticated or user changes
  useEffect(() => {
    const effectId = Math.random().toString(36).substr(2, 9);
    console.log(`=== NOTES CONTEXT AUTH EFFECT [${effectId}] ===`);
    console.log('Auth state changed - isAuthenticated:', isAuthenticated);
    console.log('User object:', user);
    console.log('User ID:', user?.id);
    console.log('User email:', user?.email);
    console.log('Effect dependencies:', { isAuthenticated, userId: user?.id, userEmail: user?.email });
    
    if (isAuthenticated && user) {
      console.log(`=== NOTES CONTEXT: User authenticated, loading notes [${effectId}] ===`);
      console.log('User:', user);
      loadNotes();
    } else {
      // When not authenticated, clear notes to prevent data leakage
      console.log(`=== NOTES CONTEXT: User not authenticated, clearing notes [${effectId}] ===`);
      console.log('⚠️ WARNING: This will clear notes from state but they remain in AsyncStorage');
      setNotes([]);
      setIsLoading(false);
    }
    console.log(`=== END NOTES CONTEXT AUTH EFFECT [${effectId}] ===`);
  }, [isAuthenticated, user?.id, user?.email]); // React to user ID changes

  // Create a stable user identifier to prevent unnecessary effect runs
  const userIdentifier = React.useMemo(() => {
    if (user?.email || user?.id) {
      return `${user.email || user.id}`;
    }
    return null;
  }, [user?.email, user?.id]);

  // Alternative effect with stable user identifier
  useEffect(() => {
    const stableEffectId = Math.random().toString(36).substr(2, 9);
    console.log(`=== NOTES CONTEXT STABLE AUTH EFFECT [${stableEffectId}] ===`);
    console.log('Stable auth state changed - isAuthenticated:', isAuthenticated);
    console.log('Stable user identifier:', userIdentifier);
    console.log('User object:', user);
    
    if (isAuthenticated && userIdentifier) {
      console.log(`=== NOTES CONTEXT: User authenticated with stable ID, loading notes [${stableEffectId}] ===`);
      loadNotes();
    } else if (!isAuthenticated) {
      // When not authenticated, clear notes to prevent data leakage
      console.log(`=== NOTES CONTEXT: User not authenticated, clearing notes [${stableEffectId}] ===`);
      console.log('⚠️ WARNING: This will clear notes from state but they remain in AsyncStorage');
      setNotes([]);
      setIsLoading(false);
    }
    console.log(`=== END NOTES CONTEXT STABLE AUTH EFFECT [${stableEffectId}] ===`);
  }, [isAuthenticated, userIdentifier]); // Use stable user identifier

  // Debug effect to track notes state changes
  useEffect(() => {
    console.log('=== NOTES CONTEXT STATE CHANGE DEBUG ===');
    console.log('Notes state changed:', notes.length);
    console.log('Current notes:', notes.map(n => ({ id: n.id, title: n.title, category: n.category })));
    console.log('=== END NOTES STATE CHANGE DEBUG ===');
  }, [notes]);

  // Debug effect to track user object changes
  useEffect(() => {
    const userEffectId = Math.random().toString(36).substr(2, 9);
    console.log(`=== NOTES CONTEXT USER CHANGE DEBUG [${userEffectId}] ===`);
    console.log('User object changed');
    console.log('User ID:', user?.id);
    console.log('User email:', user?.email);
    console.log('User object reference:', user);
    console.log('User object type:', typeof user);
    console.log('User object keys:', Object.keys(user || {}));
    console.log(`=== END USER CHANGE DEBUG [${userEffectId}] ===`);
  }, [user?.id, user?.email]);
  
  // Load cached notes when not authenticated (preserves data across login/logout)
  const loadCachedNotes = async () => {
    setIsLoading(true);
    try {
      console.log('=== LOADING CACHED NOTES FOR UNAUTHENTICATED USER ===');
      // DO NOT load any cached notes when not authenticated to prevent data leakage
      console.log('User not authenticated - not loading any cached notes');
      setNotes([]);
    } catch (error) {
      console.error('Error loading cached notes:', error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cleanup effect to clear timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
    };
  }, []);
  
  // Load notes from storage and sync if online (preserves local notes)
  const loadNotes = async () => {
    const loadId = Math.random().toString(36).substr(2, 9);
    console.log(`=== LOADING NOTES FOR AUTHENTICATED USER [${loadId}] ===`);
    setIsLoading(true);
    
    try {
      // Use email as primary identifier to ensure unique user isolation
      const userId = user?.email || user?.id;
      
      console.log('🔍 === USER ID DEBUG ===');
      console.log('User email:', user?.email);
      console.log('User ID:', user?.id);
      console.log('Selected userId for notes:', userId);
      console.log('User object type:', typeof user);
      console.log('User object keys:', Object.keys(user || {}));
      console.log('=== END USER ID DEBUG ===');
      
      if (!userId) {
        console.error('ERROR: No user ID or email available for notes isolation!');
        setNotes([]);
        setIsLoading(false);
        return;
      }
      
      console.log('Loading notes for user ID:', userId);
      console.log('Full user object:', user);
      
      // DEBUG: Show all AsyncStorage before loading notes (temporarily disabled to fix crash)
      console.log('🔍 === DEBUGGING STORAGE BEFORE LOADING NOTES ===');
      // await debugAsyncStorage();
      
      // Load from local storage first for immediate display
      const storedNotes = await getLocalNotes(userId);
      console.log('Found local notes for user', userId, ':', storedNotes.length);
      
      if (storedNotes.length > 0) {
        console.log('📝 EXISTING NOTES FOUND:');
        storedNotes.forEach((note, index) => {
          console.log(`  ${index + 1}. "${note.title}" (${note.category || 'No category'})`);
        });
      } else {
        console.log('📝 NO EXISTING NOTES - CLEAN SLATE');
      }
      
      // Clean any existing HTML from notes content before setting state
      console.log('🧹 Checking for HTML content in notes...');
      const cleanedCount = await cleanHtmlFromNotes(userId);
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned ${cleanedCount} notes with HTML content, reloading...`);
        // Reload notes after cleaning
        const cleanedNotes = await getLocalNotes(userId);
        setNotes(cleanedNotes);
        console.log('✅ Notes state set with cleaned content');
      } else {
        console.log('Setting notes in state:', storedNotes.length);
        console.log('⚠️ ABOUT TO SET NOTES - This should persist the notes');
        setNotes(storedNotes);
        console.log('✅ Notes state set successfully');
      }
      
      // Verify the notes were set
      setTimeout(() => {
        console.log('🔍 VERIFICATION: Notes state after setNotes:', notes.length);
      }, 100);
      
      // IMPORTANT: Do NOT sync server notes during initial load for new users
      // This could cause notes from other users to appear
      // Only sync if user already has some local notes (indicating they're an existing user)
      if (isConnected && storedNotes.length > 0) {
        try {
          console.log('User has existing local notes, syncing with server...');
          // Get notes from API
          const remoteNotes = await getNotes();
          console.log('Found server notes:', remoteNotes?.length || 0);
          
          if (remoteNotes && remoteNotes.length > 0) {
            // Merge server notes with local notes (preserves local-only notes)
            const mergedNotes = await addAllNotes(remoteNotes, userId);
            console.log('Merged notes total:', mergedNotes.length);
            setNotes(mergedNotes);
          } else {
            console.log('No server notes found, keeping local notes');
            // Keep local notes if server has none
          }
        } catch (syncError) {
          console.warn('Error syncing with server:', syncError);
          console.log('Continuing with local notes due to sync error');
          // Continue with local notes on sync error
        }
      } else if (isConnected) {
        console.log('🚫 SKIPPING server sync for new user - preventing data contamination');
      } else {
        console.log('Offline - using local notes only');
      }
      
      console.log('=== END LOADING NOTES ===');
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Create a new note
   * @param {Object} noteData - Note data
   * @returns {Promise<Object>} Created note
   */
  const createNote = async (noteData) => {
    try {
      console.log('=== CREATE NOTE (OFFLINE-FIRST) DEBUG ===');
      console.log('Note data:', noteData);
      console.log('Network connected:', isConnected);
      console.log('Current user:', user);
      
      // Get user ID for proper isolation
      const userId = user?.email || user?.id;
      if (!userId) {
        console.error('ERROR: Cannot create note - no user ID available!');
        return { success: false, error: 'User not properly authenticated' };
      }
      
      // Add date if not provided
      if (!noteData.date) {
        noteData.date = new Date().toISOString();
      }
      
      // Step 1: Always create note locally first (offline-first approach)
      const localNoteData = {
        ...noteData,
        id: Date.now(), // Generate temporary ID
        updatedAt: new Date().toISOString(),
        category: noteData.category || 'Personal',
        isFavorite: noteData.isFavorite || false,
        isPublic: noteData.isPublic !== undefined ? noteData.isPublic : true, // Default to public for social feed
        syncStatus: 'pending', // Mark as needing sync
        isLocalOnly: !isConnected // Track if created offline
      };
      
      console.log('Creating note locally for user:', userId, 'Title:', localNoteData.title);
      const createdNote = await addNote(localNoteData, userId);
      
      // Step 2: Handle server sync (online or queue for later)
      if (isConnected) {
        try {
          console.log('Attempting to sync note to server...');
          await addNotes(
            noteData.title,
            noteData.content,
            noteData.priority || noteData.category || 'medium',
            noteData.isPublic
          );
          
          // Mark as synced if successful
          const syncedNote = { ...createdNote, syncStatus: 'synced', isLocalOnly: false };
          await updateLocalNote(createdNote.id, syncedNote, userId);
          console.log('Note successfully synced to server');
          
          // IMPORTANT: Do NOT trigger a full sync here as it can restore deleted notes
          // Only sync specific operations to avoid conflicts
          
        } catch (serverError) {
          console.log('Server sync failed, adding to offline queue:', serverError.message);
          
          // Add to offline queue for later sync
          await offlineQueueService.addOperation(
            OPERATION_TYPES.CREATE_NOTE,
            { noteData: localNoteData },
            OPERATION_PRIORITY.NORMAL
          );
        }
      } else {
        console.log('Offline - adding note creation to queue');
        
        // Add to offline queue for later sync
        await offlineQueueService.addOperation(
          OPERATION_TYPES.CREATE_NOTE,
          { noteData: localNoteData },
          OPERATION_PRIORITY.NORMAL
        );
      }
      
      // Update notes state
      console.log('About to update notes state with created note:', {
        id: createdNote.id,
        title: createdNote.title,
        contentLength: createdNote.content?.length || 0
      });
      
      setNotes(prevNotes => {
        const newNotes = [createdNote, ...prevNotes];
        console.log('Notes state updated. New state has', newNotes.length, 'notes');
        console.log('First note in state:', {
          id: newNotes[0].id,
          title: newNotes[0].title,
          contentLength: newNotes[0].content?.length || 0
        });
        return newNotes;
      });
      
      return { success: true, note: createdNote };
    } catch (error) {
      console.error('Error creating note:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to create note'
      };
    }
  };
  
  /**
   * Update an existing note
   * @param {string} noteId - Note ID
   * @param {Object} noteData - Updated note data
   * @returns {Promise<Object>} Update result
   */
  const updateNote = async (noteId, noteData) => {
    console.log('=== UPDATE NOTE (OFFLINE-FIRST) DEBUG ===');
    console.log('updateNote called with ID:', noteId, 'and data:', noteData);
    console.log('Network connected:', isConnected);
    
    try {
      // Convert noteId to both string and number formats for more robust comparison
      const noteIdStr = String(noteId);
      const noteIdNum = Number(noteId);
      
      // Find the existing note with more flexible ID comparison
      const existingNote = notes.find(note => 
        note.id === noteId || 
        String(note.id) === noteIdStr || 
        (Number(note.id) === noteIdNum && !isNaN(noteIdNum))
      );
      
      console.log('Existing note found:', existingNote);
      
      if (!existingNote) {
        console.log(`Note with ID ${noteId} not found in state`);
        return { success: false, error: 'Note not found' };
      }
      
      // Step 1: Always update locally first (offline-first approach)
      const updatedNoteData = {
        ...existingNote,
        ...noteData,
        // Ensure these fields are always present
        title: noteData.title !== undefined ? noteData.title : (existingNote.title || 'Untitled Note'),
        content: noteData.content !== undefined ? noteData.content : (existingNote.content || ''),
        category: noteData.category || existingNote.category || 'Personal',
        isFavorite: noteData.isFavorite !== undefined ? noteData.isFavorite : (existingNote.isFavorite || false),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending' // Mark as needing sync
      };
      
      console.log('Updating note locally:', updatedNoteData.title);
      await updateLocalNote(noteId, updatedNoteData);
      
      // Step 2: Handle server sync (online or queue for later)
      if (isConnected) {
        try {
          console.log('Attempting to sync note update to server...');
          await updateNotes(
            noteId,
            updatedNoteData.title,
            updatedNoteData.content,
            updatedNoteData.priority || updatedNoteData.category || 'medium',
            updatedNoteData.isPublic
          );
          
          // Mark as synced if successful
          const syncedNote = { ...updatedNoteData, syncStatus: 'synced' };
          await updateLocalNote(noteId, syncedNote);
          console.log('Note update successfully synced to server');
          
        } catch (serverError) {
          console.log('Server sync failed, adding to offline queue:', serverError.message);
          
          // Add to offline queue for later sync
          await offlineQueueService.addOperation(
            OPERATION_TYPES.UPDATE_NOTE,
            { noteId, noteData: updatedNoteData },
            OPERATION_PRIORITY.NORMAL
          );
        }
      } else {
        console.log('Offline - adding note update to queue');
        
        // Add to offline queue for later sync
        await offlineQueueService.addOperation(
          OPERATION_TYPES.UPDATE_NOTE,
          { noteId, noteData: updatedNoteData },
          OPERATION_PRIORITY.NORMAL
        );
      }
      
      // Step 3: Update UI immediately with local note
      const updatedNotes = await getLocalNotes();
      setNotes(updatedNotes);
      
      console.log('=== END UPDATE NOTE DEBUG ===');
      
      return { success: true, note: updatedNoteData };
    } catch (error) {
      console.error('Error updating note:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to update note'
      };
    }
  };
  
  /**
   * Delete a note
   * @param {string} noteId - Note ID
   * @returns {Promise<Object>} Delete result
   */
  const deleteNote = async (noteId) => {
    console.log('=== DELETE NOTE (OFFLINE-FIRST) DEBUG ===');
    console.log('deleteNote called with ID:', noteId);
    console.log('Network connected:', isConnected);
    
    try {
      // Find the existing note
      const existingNote = notes.find(note => note.id === noteId);
      if (!existingNote) {
        console.log(`Note with ID ${noteId} not found in state`);
        return { success: false, error: 'Note not found' };
      }
      
      console.log(`Deleting note: ${existingNote.title}`);
      
      // Step 1: Always delete from local storage first (offline-first approach)
      const userId = user?.email || user?.id;
      await deleteLocalNote(noteId, userId);
      console.log('Note deleted locally');
      
      // Step 2: Handle server sync (online or queue for later)
      if (isConnected) {
        try {
          console.log('Attempting to delete note from server...');
          await deleteNotes(noteId);
          console.log('Note successfully deleted from server');
          
        } catch (serverError) {
          console.log('Server deletion failed, adding to offline queue:', serverError.message);
          
          // Add to offline queue for later sync
          await offlineQueueService.addOperation(
            OPERATION_TYPES.DELETE_NOTE,
            { noteId, id: noteId }, // Include both formats for compatibility
            OPERATION_PRIORITY.NORMAL
          );
        }
      } else {
        console.log('Offline - adding note deletion to queue');
        
        // Add to offline queue for later sync
        await offlineQueueService.addOperation(
          OPERATION_TYPES.DELETE_NOTE,
          { noteId, id: noteId }, // Include both formats for compatibility
          OPERATION_PRIORITY.NORMAL
        );
      }
      
      // Step 3: Update notes state immediately
      setNotes(prevNotes => {
        const filteredNotes = prevNotes.filter(note => note.id !== noteId);
        console.log(`Notes state updated after deletion. Remaining notes: ${filteredNotes.length}`);
        return filteredNotes;
      });
      
      console.log('=== END DELETE NOTE DEBUG ===');
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting note:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to delete note'
      };
    }
  };
  
  /**
   * Get a note by ID
   * @param {string} noteId - Note ID
   * @returns {Object|null} Note object or null if not found
   */
  const getNoteById = (noteId) => {
    console.log('Looking for note with ID:', noteId, 'Type:', typeof noteId);
    console.log('Available notes:', notes.map(n => ({id: n.id, title: n.title, type: typeof n.id})));
    
    // Try to find the note with exact ID match first
    let foundNote = notes.find(note => note.id === noteId);
    
    // If not found and noteId is a string but might represent a number
    if (!foundNote && typeof noteId === 'string' && !isNaN(Number(noteId))) {
      // Try to find with numeric comparison
      const numericId = Number(noteId);
      foundNote = notes.find(note => 
        (typeof note.id === 'number' && note.id === numericId) || 
        (typeof note.id === 'string' && Number(note.id) === numericId)
      );
    }
    
    // If not found and noteId is a number
    if (!foundNote && typeof noteId === 'number') {
      // Try to find with string comparison
      const stringId = String(noteId);
      foundNote = notes.find(note => String(note.id) === stringId);
    }
    
    console.log('Found note:', foundNote);
    return foundNote || null;
  };
  
  /**
   * Get notes by category
   * @param {string} category - Category name
   * @returns {Array} Filtered notes
   */
  const getNotesByCategory = (category) => {
    return notes.filter(note => note.category === category);
  };
  
  /**
   * Get favorite notes
   * @param {string|number} userId - User ID
   * @returns {Promise<Array>} Favorite notes
   */
  const getFavoriteNotes = async (userId) => {
    try {
      console.log('=== GET FAVORITE NOTES DEBUG ===');
      console.log('User ID:', userId);
      console.log('Is connected:', isConnected);
      
      // Always check local storage first to see what favorites we have  
      const localNotes = await getLocalNotes(userId);
      const localFavorites = Array.isArray(localNotes) ? localNotes.filter(note => note.isFavorite) : [];
      console.log('Local notes count:', localNotes?.length || 0);
      console.log('Local favorites count:', localFavorites.length);
      console.log('Local favorites:', localFavorites.map(n => ({
        id: n.id, 
        title: n.title, 
        isFavorite: n.isFavorite
      })));
      
      if (isConnected) {
        try {
          // If online, get from API
          console.log('Fetching favorites from remote API...');
          const favoriteNotes = await getRemoteFavorites();
          console.log('Remote favorites received:', favoriteNotes?.length || 0);
          console.log('Remote favorites:', favoriteNotes);
          
          // For now, prioritize local favorites since the remote API might not be in sync
          // TODO: Implement proper sync between local and remote favorites
          console.log('Using local favorites instead of remote for now');
          console.log('=== END GET FAVORITE NOTES DEBUG ===');
          return localFavorites;
        } catch (remoteError) {
          console.log('Error fetching remote favorites:', remoteError);
          console.log('Falling back to local favorites');
          console.log('=== END GET FAVORITE NOTES DEBUG ===');
          return localFavorites;
        }
      } else {
        // If offline, use local storage
        console.log('Offline - using local favorites');
        console.log('=== END GET FAVORITE NOTES DEBUG ===');
        return localFavorites;
      }
    } catch (error) {
      console.error('Error getting favorite notes:', error);
      // Fallback to local filtering with null safety
      try {
        const localNotes = await getLocalNotes(userId);
        const fallbackFavorites = Array.isArray(localNotes) ? localNotes.filter(note => note.isFavorite) : [];
        console.log('Fallback favorites count:', fallbackFavorites.length);
        return fallbackFavorites;
      } catch (fallbackError) {
        console.error('Fallback error getting local notes:', fallbackError);
        return []; // Always return empty array as last resort
      }
    }
  };
  
  /**
   * Add a note to favorites
   * @param {string|number} noteId - Note ID
   * @param {string|number} userId - User ID
   * @returns {Promise<Object>} Result of the operation
   */
  const addToFavorites = async (noteId, userId) => {
    try {
      if (isConnected) {
        // If online, add to favorites on the server
        await addFavoriteNotes(noteId);
      } else {
        // Track pending operation for offline
        const pendingOps = await AsyncStorage.getItem('PENDING_OPERATIONS') || '[]';
        const operations = JSON.parse(pendingOps);
        operations.push({
          type: 'ADD_TO_FAVORITES',
          data: { noteId, userId },
          id: `fav_add_${Date.now()}`
        });
        await AsyncStorage.setItem('PENDING_OPERATIONS', JSON.stringify(operations));
      }
      
      // Update local storage and state
      const updatedNote = await toggleFavorite(noteId);
      
      // Update notes state
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === noteId ? { ...note, isFavorite: true } : note
        )
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error adding to favorites:', error);
      return {
        success: false,
        error: error.message || 'Failed to add to favorites'
      };
    }
  };
  
  /**
   * Remove a note from favorites
   * @param {string|number} userId - User ID
   * @param {string|number} noteId - Note ID
   * @returns {Promise<Object>} Result of the operation
   */
  const removeFromFavorites = async (userId, noteId) => {
    try {
      if (isConnected) {
        // If online, remove from favorites on the server
        await deleteFavoriteNotes(noteId);
      } else {
        // Track pending operation for offline
        const pendingOps = await AsyncStorage.getItem('PENDING_OPERATIONS') || '[]';
        const operations = JSON.parse(pendingOps);
        operations.push({
          type: 'REMOVE_FROM_FAVORITES',
          data: { userId, noteId },
          id: `fav_remove_${Date.now()}`
        });
        await AsyncStorage.setItem('PENDING_OPERATIONS', JSON.stringify(operations));
      }
      
      // Update local storage and state
      const updatedNote = await toggleFavorite(noteId);
      
      // Update notes state
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === noteId ? { ...note, isFavorite: false } : note
        )
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error removing from favorites:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove from favorites'
      };
    }
  };
  
  /**
   * Search notes by query
   * @param {string} query - Search query
   * @returns {Array} Matching notes
   */
  const searchNotes = (query) => {
    const searchLower = query.toLowerCase();
    
    return notes.filter(note => 
      note.title.toLowerCase().includes(searchLower) || 
      note.content.toLowerCase().includes(searchLower)
    );
  };
  
  /**
   * Refresh notes from storage and server
   * @returns {Promise<Object>} Refresh result
   */
  // Track last refresh time to prevent excessive refreshing
  const lastRefreshTimeRef = useRef(0);
  // Use a ref to track the safety timeout to prevent conflicts with multiple simultaneous calls
  const safetyTimeoutRef = useRef(null);
  const REFRESH_DEBOUNCE = 3000; // 3 seconds - increased to prevent excessive refreshing
  
  const refreshNotes = async () => {
    try {
      // Check if we've refreshed recently to prevent excessive refreshing
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
      
      // If we're already loading, don't start another refresh
      if (isLoading) {
        console.log('Skipping refresh - already loading');
        return { success: true, skipped: true };
      }
      
      if (timeSinceLastRefresh < REFRESH_DEBOUNCE) {
        console.log(`Skipping refresh - last refresh was ${timeSinceLastRefresh}ms ago`);
        return { success: true, skipped: true };
      }
      
      // Additional check to prevent multiple simultaneous refresh calls
      if (safetyTimeoutRef.current) {
        console.log('Skipping refresh - safety timeout already active');
        return { success: true, skipped: true };
      }
      
      lastRefreshTimeRef.current = now;
      setIsLoading(true);
      console.log('Refreshing notes...');
      
      // Set a safety timeout to ensure we don't get stuck in loading state
      // Use a ref to prevent conflicts with multiple simultaneous calls
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      safetyTimeoutRef.current = setTimeout(() => {
        console.log('Safety timeout triggered - forcing loading state off');
        setIsLoading(false);
        safetyTimeoutRef.current = null;
      }, 10000); // 10 second timeout
      
      // Get user ID for proper note isolation
      const userId = user?.email || user?.id;
      
      if (!userId) {
        console.log('No user ID available for refresh - clearing notes');
        setNotes([]);
        return { success: true };
      }
      
      console.log('Refreshing notes for user:', userId);
      
      // Always refresh from local storage first to get the most recent changes
      const localNotes = await getLocalNotes(userId);
      console.log('Loaded notes from local storage:', localNotes.length);
      console.log('First few notes from local storage:', localNotes.slice(0, 3).map(n => ({
        id: n.id,
        title: n.title,
        contentLength: n.content?.length || 0
      })));
      
      // Immediately update state with local notes
      setNotes(localNotes);
      
      // If online, try to sync with server but prioritize local changes
      if (isConnected) {
        try {
          // Get notes from API
          console.log('Fetching notes from server...');
          const remoteNotes = await getNotes();
          console.log('Received notes from server:', remoteNotes?.length || 0);
          
          // Add to local storage while preserving local changes
          if (remoteNotes && remoteNotes.length > 0) {
            // This will merge remote notes with local notes, preserving local changes
            const mergedNotes = await addAllNotes(remoteNotes, userId);
            console.log('Set merged notes in state:', mergedNotes.length);
            
            // Update state with merged notes - but only if there are any
            if (mergedNotes && mergedNotes.length > 0) {
              setNotes(mergedNotes);
            }
          }
          
          // Update last sync time
          await AsyncStorage.setItem('LAST_SYNC_TIME', Date.now().toString());
        } catch (syncError) {
          console.warn('Error syncing with server:', syncError);
          // Continue with local notes on sync error
        }
      }
      
      // Get local notes one more time to ensure we have the latest
      const finalNotes = await getLocalNotes(userId);
      console.log('Final notes from local storage:', finalNotes.length);
      console.log('First few final notes:', finalNotes.slice(0, 3).map(n => ({
        id: n.id,
        title: n.title,
        contentLength: n.content?.length || 0
      })));
      setNotes(finalNotes);
      console.log('Final notes state set:', finalNotes.length);
      
      return { success: true };
    } catch (error) {
      console.error('Error refreshing notes:', error);
      
      return {
        success: false,
        error: error.message || 'Failed to refresh notes'
      };
    } finally {
      // Clear the safety timeout if it exists
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      
      // Ensure loading state is turned off
      setIsLoading(false);
    }
  };
  
  // Function to clear all notes (for user switching)
  const clearAllNotes = async () => {
    console.log('🗑️ === MANUALLY CLEARING ALL NOTES ===');
    
    // Clear from state
    setNotes([]);
    setIsLoading(false);
    
    // Also clear from AsyncStorage (nuclear option)
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const notesKeys = allKeys.filter(key => key.includes('NOTES'));
      
      console.log('🗑️ Removing notes keys from storage:', notesKeys);
      
      if (notesKeys.length > 0) {
        await AsyncStorage.multiRemove(notesKeys);
        console.log('✅ All notes cleared from storage');
      }
      
      // Debug what's left (temporarily disabled to fix crash)
      // await debugAsyncStorage();
      
    } catch (error) {
      console.error('❌ Error clearing notes from storage:', error);
    }
  };

  /**
   * Force sync all notes to server with isPublic field
   */
  const forceSyncAllNotes = async () => {
    try {
      console.log('=== FORCE SYNC ALL NOTES ===');
      const userId = user?.email || user?.id;
      if (!userId) {
        console.error('No user ID available for sync');
        return;
      }

      const localNotes = await getLocalNotes(userId);
      console.log(`Found ${localNotes.length} local notes to sync`);

      for (const note of localNotes) {
        try {
          console.log(`Syncing note: ${note.title} (isPublic: ${note.isPublic})`);
          
          if (note.id && typeof note.id === 'number' && note.id > 1000000000000) {
            // This looks like a locally generated ID, create new note
            await addNotes(
              note.title,
              note.content,
              note.category || 'Personal',
              note.isPublic !== undefined ? note.isPublic : true
            );
            console.log(`Created note on server: ${note.title}`);
          } else {
            // This has a server ID, update existing note
            await updateNotes(
              note.id,
              note.title,
              note.content,
              note.category || 'Personal',
              note.isPublic !== undefined ? note.isPublic : true
            );
            console.log(`Updated note on server: ${note.title}`);
          }
        } catch (noteError) {
          console.error(`Failed to sync note ${note.title}:`, noteError.message);
        }
      }

      console.log('=== FORCE SYNC COMPLETE ===');
    } catch (error) {
      console.error('Error in force sync:', error);
    }
  };

  // Context value
  const contextValue = {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    getNoteById,
    getNotesByCategory,
    getFavoriteNotes,
    addToFavorites,
    removeFromFavorites,
    searchNotes,
    clearAllNotes,
    refreshNotes,
  };
  
  return (
    <NotesContext.Provider value={contextValue}>
      {children}
    </NotesContext.Provider>
  );
};

/**
 * Custom hook to use notes context
 * @returns {Object} Notes context
 */
export const useNotes = () => useContext(NotesContext);
