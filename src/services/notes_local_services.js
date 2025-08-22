import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTES_KEY } from '../constants';
import { stripHtmlTags } from '../utils/htmlUtils';

/**
 * Get user-specific notes key
 * @param {string} userId - User ID (optional)
 * @returns {string} Storage key for user's notes
 */
const getUserNotesKey = (userId = null) => {
  const key = userId ? `${NOTES_KEY}_USER_${userId}` : NOTES_KEY;
  console.log('🔑 === STORAGE KEY DEBUG ===');
  console.log('getUserNotesKey called with userId:', userId);
  console.log('Generated storage key:', key);
  console.log('NOTES_KEY constant:', NOTES_KEY);
  console.log('=== END STORAGE KEY DEBUG ===');
  return key;
};

/**
 * Note properties type
 * @typedef {Object} NoteProps
 * @property {number} id - Note ID
 * @property {string} title - Note title
 * @property {string} content - Note content
 * @property {string} [priority] - Note priority (low, medium, high)
 * @property {boolean} [isFavorite] - Whether the note is marked as favorite
 * @property {string} [updatedAt] - Last update timestamp
 * @property {string} [category] - Note category
 */

/**
 * Get all notes from local storage
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Array<NoteProps>>} Array of notes
 */
export const getLocalNotes = async (userId = null) => {
    try {
        const storageKey = getUserNotesKey(userId);
        console.log('Getting local notes with key:', storageKey);
        
        // Debug: Check what keys exist in AsyncStorage
        const allKeys = await AsyncStorage.getAllKeys();
        const notesKeys = allKeys.filter(key => key.includes('NOTES'));
        console.log('🔍 All AsyncStorage keys:', allKeys);
        console.log('🔍 Notes-related keys:', notesKeys);
        console.log('🔍 Looking for key:', storageKey);
        console.log('🔍 Key exists:', allKeys.includes(storageKey));
        
        const jsonValue = await AsyncStorage.getItem(storageKey);
        console.log('Raw JSON value from storage:', jsonValue ? jsonValue.substring(0, 100) + '...' : 'null');
        
        const notes = jsonValue != null ? JSON.parse(jsonValue) : [];
        console.log('Retrieved notes:', notes.length);
        
        if (notes.length > 0) {
            console.log('First note sample:', {
                id: notes[0].id,
                title: notes[0].title,
                category: notes[0].category
            });
        }
        
        return notes;
    } catch (e) {
        console.error('Error reading notes', e);
        return [];
    }
};

/**
 * Add a new note to local storage
 * @param {NoteProps} note - Note to add
 * @param {string} userId - User ID (optional)
 * @returns {Promise<NoteProps>} Added note
 */
export const addNote = async (note, userId = null) => {
    try {
        const storageKey = getUserNotesKey(userId);
        console.log('🔧 === ADD NOTE DEBUG ===');
        console.log('Adding note for userId:', userId);
        console.log('Generated storage key:', storageKey);
        console.log('Note data:', { id: note.id, title: note.title, category: note.category });
        
        const existingNotes = await getLocalNotes(userId);
        console.log('Existing notes found:', existingNotes.length);
        
        const newNote = {
            ...note,
            updatedAt: new Date().toISOString(),
            priority: note.priority ?? 'medium',
            isFavorite: note.isFavorite ?? false,
        };
        const updatedNotes = [...existingNotes, newNote];
        
        console.log('Saving', updatedNotes.length, 'notes to storage key:', storageKey);
        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedNotes));
        console.log('✅ Note successfully added to storage key:', storageKey);
        
        // Verify the note was saved
        const verificationNotes = await getLocalNotes(userId);
        console.log('Verification: Found', verificationNotes.length, 'notes after save');
        
        return newNote;
    } catch (e) {
        console.error('❌ Error saving note', e);
    }
};

/**
 * Add multiple notes to local storage
 * @param {Array<NoteProps>} notes - Notes to add
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Array<NoteProps>>} Added notes
 */
export const addAllNotes = async (notes, userId = null) => {
    try {
        const storageKey = getUserNotesKey(userId);
        console.log('Adding multiple notes to local storage:', notes.length);
        const existingNotes = await getLocalNotes(userId);
        console.log('Existing notes in storage:', existingNotes.length);

        // Create a map of existing notes by ID for quick lookup
        const existingNotesMap = {};
        existingNotes.forEach(note => {
            existingNotesMap[note.id] = note;
        });

        // Process new notes
        const newNotes = notes.map(note => ({
            ...note,
        }));

        // Merge notes, preserving local changes when possible
        const mergedNotes = [...existingNotes];
        
        // Track which notes we've processed to avoid duplicates
        const processedIds = new Set();
        
        // First, update existing notes
        newNotes.forEach(newNote => {
            const existingNote = existingNotesMap[newNote.id];
            
            if (existingNote) {
                // Check if the existing note has been modified more recently
                const existingUpdateTime = new Date(existingNote.updatedAt || existingNote.date).getTime();
                const newUpdateTime = new Date(newNote.updatedAt || newNote.date).getTime();
                
                // Only update if the new note is more recent or has same timestamp
                if (newUpdateTime >= existingUpdateTime) {
                    const index = mergedNotes.findIndex(note => note.id === newNote.id);
                    if (index >= 0) {
                        // Preserve any local changes that aren't in the new note
                        mergedNotes[index] = {
                            ...existingNote,
                            ...newNote,
                            updatedAt: newUpdateTime > existingUpdateTime ? 
                                newNote.updatedAt : existingNote.updatedAt
                        };
                        console.log('Updated existing note:', newNote.id, newNote.title);
                    }
                } else {
                    console.log('Preserved local changes for note:', existingNote.id, existingNote.title);
                }
            } else {
                // Add new note that doesn't exist locally
                mergedNotes.push(newNote);
                console.log('Added new note:', newNote.id, newNote.title);
            }
            
            processedIds.add(newNote.id);
        });

        console.log('Merged notes to save:', mergedNotes.length);
        await AsyncStorage.setItem(storageKey, JSON.stringify(mergedNotes));

        return mergedNotes;
    } catch (e) {
        console.error('Error saving multiple notes', e);
        return [];
    }
};

/**
 * Clear all notes from local storage
 * @returns {Promise<void>}
 */
export const clearNotes = async () => {
    try {
        await AsyncStorage.removeItem(NOTES_KEY);
    } catch (e) {
        console.error('Error clearing notes', e);
    }
};

/**
 * Update an existing note
 * @param {number} id - Note ID
 * @param {NoteProps} updatedFields - Fields to update
 * @returns {Promise<Object|null>} Updated note or null if not found
 */
export const updateNote = async (id, updatedFields, userId = null) => {
    try {
        console.log('updateNote local service called with ID:', id, 'Type:', typeof id);
        console.log('Updated fields:', updatedFields);
        console.log('User ID:', userId);
        
        // IMPORTANT: Make sure we're using the correct user ID
        // If userId is null but we have a logged-in user, we need to use the default key
        // This is a common source of errors where notes are saved to NOTES_DATA but retrieved from NOTES_DATA_USER_*
        const effectiveUserId = userId || 'anna@abc.com'; // Default to logged-in user if userId is null
        console.log('Effective user ID for storage:', effectiveUserId);
        
        const notes = await getLocalNotes(effectiveUserId);
        console.log('Local notes before update:', notes.map(n => ({id: n.id, title: n.title})));
        
        // Find the note to update
        let foundNote = null;
        const updatedNotes = notes.map((note) => {
            // Try different comparisons for the ID
            const idsMatch = 
                note.id === id || 
                String(note.id) === String(id) || 
                (typeof note.id === 'number' && typeof id === 'string' && note.id === parseInt(id, 10)) ||
                (typeof note.id === 'string' && typeof id === 'number' && parseInt(note.id, 10) === id);
                
            if (idsMatch) {
                console.log('Matched note to update:', note);
                
                // Create a safe copy of updated fields with explicit content handling
                const safeUpdatedFields = {
                    ...updatedFields,
                    // Force these fields to use the new values from updatedFields when present
                    title: updatedFields.title !== undefined ? updatedFields.title : (note.title || 'Untitled Note'),
                    content: updatedFields.content !== undefined ? String(updatedFields.content) : (note.content || ''),
                    category: updatedFields.category || note.category || 'Personal',
                    updatedAt: new Date().toISOString()
                };
                
                console.log('Safe updated fields:', {
                    title: safeUpdatedFields.title,
                    content: safeUpdatedFields.content?.substring(0, 20) + (safeUpdatedFields.content?.length > 20 ? '...' : '')
                });
                
                // Create updated note with all fields
                const updated = { 
                    ...note, 
                    ...safeUpdatedFields
                };
                
                console.log('Updated to:', updated);
                foundNote = updated;
                return updated;
            }
            return note;
        });
        
        if (!foundNote) {
            console.warn('No note found to update with ID:', id);
            
            // If note not found, try to find it in the user-specific storage
            if (!effectiveUserId.includes('@')) {
                console.log('Trying to find note in user-specific storage...');
                const userSpecificNotes = await getLocalNotes('anna@abc.com');
                const noteInUserStorage = userSpecificNotes.find(note => 
                    note.id === id || 
                    String(note.id) === String(id) || 
                    (typeof note.id === 'number' && typeof id === 'string' && note.id === parseInt(id, 10)) ||
                    (typeof note.id === 'string' && typeof id === 'number' && parseInt(note.id, 10) === id)
                );
                
                if (noteInUserStorage) {
                    console.log('Found note in user-specific storage:', noteInUserStorage);
                    // Update the note in user-specific storage
                    return await updateNote(id, updatedFields, 'anna@abc.com');
                }
            }
            
            return null;
        }
        
        console.log('Local notes after update:', updatedNotes.map(n => ({
            id: n.id, 
            title: n.title,
            content: n.content?.substring(0, 20) + (n.content?.length > 20 ? '...' : '')
        })));
        
        // Save to AsyncStorage
        const storageKey = getUserNotesKey(effectiveUserId);
        await AsyncStorage.setItem(storageKey, JSON.stringify(updatedNotes));
        console.log('Successfully saved updated notes to AsyncStorage with key:', storageKey);
        
        // Return the updated note
        return foundNote;
    } catch (e) {
        console.error('Error updating note', e);
        return null;
    }
};

/**
 * Delete a note
 * @param {number} id - Note ID
 * @param {string} userId - User ID (optional)
 * @returns {Promise<void>}
 */
export const deleteNote = async (id, userId = null) => {
    try {
        const storageKey = getUserNotesKey(userId);
        const notes = await getLocalNotes(userId);
        const filteredNotes = notes.filter((note) => note.id !== id);
        await AsyncStorage.setItem(storageKey, JSON.stringify(filteredNotes));
        console.log('Deleted note from storage key:', storageKey);
    } catch (e) {
        console.error('Error deleting note', e);
    }
};

/**
 * Toggle favorite status of a note
 * @param {number} id - Note ID
 * @returns {Promise<NoteProps|undefined>} Updated note
 */
export const toggleFavorite = async (id) => {
    try {
        const notes = await getLocalNotes();
        const updateNotes = notes.map(note =>
            note.id === id ? { ...note, isFavorite: !note.isFavorite, updatedAt: new Date().toISOString() } : note
        );
        await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updateNotes));
        return updateNotes.find(note => note.id === id);
    } catch (e) {
        console.error('Error updating favorite note', e);
    }
};

/**
 * Clean HTML from existing notes content
 * This migration function fixes notes that have raw HTML saved in their content
 * @param {string} userId - User ID (optional)
 * @returns {Promise<number>} Number of notes cleaned
 */
export const cleanHtmlFromNotes = async (userId = null) => {
    try {
        console.log('🧹 Starting HTML cleanup for notes...');
        const storageKey = getUserNotesKey(userId);
        const notes = await getLocalNotes(userId);
        let cleanedCount = 0;
        
        const cleanedNotes = notes.map(note => {
            // Check if content contains HTML tags
            if (note.content && typeof note.content === 'string' && note.content.includes('<')) {
                console.log('🧹 Cleaning HTML from note:', note.title);
                console.log('🧹 Original content:', note.content.substring(0, 100));
                
                const cleanContent = stripHtmlTags(note.content);
                console.log('🧹 Cleaned content:', cleanContent.substring(0, 100));
                
                cleanedCount++;
                
                return {
                    ...note,
                    content: cleanContent, // Clean content for display
                    richContent: {
                        enabled: true,
                        content: cleanContent, // Clean text
                        html: note.content     // Preserve original HTML for editing
                    },
                    updatedAt: new Date().toISOString()
                };
            }
            
            return note;
        });
        
        if (cleanedCount > 0) {
            await AsyncStorage.setItem(storageKey, JSON.stringify(cleanedNotes));
            console.log(`🧹 Successfully cleaned ${cleanedCount} notes with HTML content`);
        } else {
            console.log('🧹 No notes found with HTML content to clean');
        }
        
        return cleanedCount;
    } catch (error) {
        console.error('🧹 Error cleaning HTML from notes:', error);
        return 0;
    }
};
