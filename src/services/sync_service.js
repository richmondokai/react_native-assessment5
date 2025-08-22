import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getNotes, 
  addNotes, 
  updateNotes, 
  deleteNotes 
} from './notes_remote_services';
import { 
  getLocalNotes, 
  addNote, 
  updateNote, 
  deleteNote,
  addAllNotes 
} from './notes_local_services';
import offlineQueueService, { OPERATION_TYPES, OPERATION_PRIORITY } from './offline_queue_service';

/**
 * Conflict resolution strategies
 */
export const CONFLICT_RESOLUTION = {
  SERVER_WINS: 'server_wins',      // Server version takes precedence
  CLIENT_WINS: 'client_wins',      // Client version takes precedence  
  MERGE: 'merge',                  // Intelligent merge of both versions
  ASK_USER: 'ask_user'            // Prompt user to choose (future enhancement)
};

/**
 * Sync service for handling bidirectional data synchronization
 */
class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncCallbacks = [];
    this.conflictStrategy = CONFLICT_RESOLUTION.CLIENT_WINS; // Default: prioritize user changes
  }

  /**
   * Register a callback for sync status updates
   * @param {Function} callback - Callback function
   */
  onSyncStatusChange(callback) {
    this.syncCallbacks.push(callback);
  }

  /**
   * Remove a sync status callback
   * @param {Function} callback - Callback to remove
   */
  offSyncStatusChange(callback) {
    this.syncCallbacks = this.syncCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Notify all listeners of sync status change
   * @param {Object} status - Sync status object
   */
  notifyStatusChange(status) {
    this.syncCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in sync status callback:', error);
      }
    });
  }

  /**
   * Execute a full bidirectional sync
   * @param {boolean} force - Force sync even if already syncing
   * @returns {Promise<Object>} Sync result
   */
  async performFullSync(force = false) {
    if (this.isSyncing && !force) {
      console.log('Sync already in progress, skipping...');
      return { success: false, message: 'Sync already in progress' };
    }

    console.log('=== STARTING FULL BIDIRECTIONAL SYNC ===');
    this.isSyncing = true;
    this.notifyStatusChange({ isSyncing: true, stage: 'starting' });

    try {
      const result = {
        success: false,
        uploadedCount: 0,
        downloadedCount: 0,
        conflictsResolved: 0,
        errors: []
      };

      // Ensure errors array is always available
      if (!result.errors) {
        result.errors = [];
      }

      // Step 1: Upload local changes to server
      this.notifyStatusChange({ isSyncing: true, stage: 'uploading' });
      console.log('Step 1: Uploading local changes...');
      
      const uploadResult = await this.uploadLocalChanges();
      result.uploadedCount = uploadResult.count;
      if (uploadResult.errors && Array.isArray(uploadResult.errors)) {
        result.errors.push(...uploadResult.errors);
      }

      // Step 2: Download server changes and resolve conflicts
      this.notifyStatusChange({ isSyncing: true, stage: 'downloading' });
      console.log('Step 2: Downloading server changes...');
      
      const downloadResult = await this.downloadServerChanges();
      result.downloadedCount = downloadResult.count;
      result.conflictsResolved = downloadResult.conflictsResolved;
      if (downloadResult.errors && Array.isArray(downloadResult.errors)) {
        result.errors.push(...downloadResult.errors);
      }

      // Step 3: Clear completed operations
      this.notifyStatusChange({ isSyncing: true, stage: 'cleanup' });
      console.log('Step 3: Cleaning up completed operations...');
      
      await offlineQueueService.clearCompleted();

      // Update last sync time
      await AsyncStorage.setItem('LAST_SYNC_TIME', Date.now().toString());

      result.success = result.errors.length === 0;
      
      console.log('=== SYNC COMPLETED ===');
      console.log('Result:', result);
      
      this.notifyStatusChange({ 
        isSyncing: false, 
        stage: 'completed',
        lastSyncTime: Date.now(),
        result 
      });

      return result;

    } catch (error) {
      console.error('Critical error during sync:', error);
      
      this.notifyStatusChange({ 
        isSyncing: false, 
        stage: 'error',
        error: error.message 
      });

      return {
        success: false,
        error: error.message,
        uploadedCount: 0,
        downloadedCount: 0,
        conflictsResolved: 0,
        errors: [error.message]
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Upload local changes to server
   * @returns {Promise<Object>} Upload result
   */
  async uploadLocalChanges() {
    console.log('=== UPLOADING LOCAL CHANGES ===');
    let count = 0;
    const errors = [];

    try {
      const pendingOperations = await offlineQueueService.getQueue();
      const pendingOps = pendingOperations.filter(op => op.status === 'pending');
      
      console.log(`Found ${pendingOps.length} pending operations to upload`);

      for (const operation of pendingOps) {
        try {
          console.log(`Processing operation: ${operation.type} for note ${operation.data.noteId || 'new'}`);
          
          await offlineQueueService.updateOperationStatus(operation.id, 'processing');

          switch (operation.type) {
            case OPERATION_TYPES.CREATE_NOTE:
              await this.uploadCreateNote(operation);
              break;
              
            case OPERATION_TYPES.UPDATE_NOTE:
              await this.uploadUpdateNote(operation);
              break;
              
            case OPERATION_TYPES.DELETE_NOTE:
              await this.uploadDeleteNote(operation);
              break;
              
            case OPERATION_TYPES.TOGGLE_FAVORITE:
              await this.uploadToggleFavorite(operation);
              break;
              
            default:
              console.warn(`Unknown operation type: ${operation.type}`);
              continue;
          }

          await offlineQueueService.updateOperationStatus(operation.id, 'completed');
          count++;
          
        } catch (error) {
          console.error(`Error uploading operation ${operation.id}:`, error);
          errors.push(`${operation.type}: ${error.message}`);
          
          await offlineQueueService.incrementRetryCount(operation.id);
          
          if (operation.retryCount >= 3) {
            await offlineQueueService.updateOperationStatus(operation.id, 'failed', error.message);
          } else {
            await offlineQueueService.updateOperationStatus(operation.id, 'pending', error.message);
          }
        }
      }

      console.log(`=== UPLOAD COMPLETED: ${count} operations processed ===`);
      return { count, errors };

    } catch (error) {
      console.error('Error in upload process:', error);
      return { count, errors: [...errors, error.message] };
    }
  }

  /**
   * Upload a create note operation
   * @param {Object} operation - Operation object
   */
  async uploadCreateNote(operation) {
    const { noteData } = operation.data;
    
    console.log('Uploading new note:', noteData.title);
    
    // Create note on server
    await addNotes(
      noteData.title,
      noteData.content,
      noteData.category || noteData.priority || 'medium',
      noteData.isPublic
    );
    
    console.log('Note created on server successfully');
  }

  /**
   * Upload an update note operation
   * @param {Object} operation - Operation object
   */
  async uploadUpdateNote(operation) {
    const { noteId, noteData } = operation.data;
    
    console.log(`Uploading update for note ${noteId}:`, noteData.title);
    
    // Update note on server
    await updateNotes(
      noteId,
      noteData.title,
      noteData.content,
      noteData.category || noteData.priority || 'medium',
      noteData.isPublic
    );
    
    console.log('Note updated on server successfully');
  }

  /**
   * Upload a delete note operation
   * @param {Object} operation - Operation object
   */
  async uploadDeleteNote(operation) {
    const { noteId } = operation.data;
    
    console.log(`Uploading delete for note ${noteId}`);
    
    // Delete note on server
    await deleteNotes(noteId);
    
    console.log('Note deleted on server successfully');
  }

  /**
   * Upload a toggle favorite operation
   * @param {Object} operation - Operation object
   */
  async uploadToggleFavorite(operation) {
    const { noteId, isFavorite } = operation.data;
    
    console.log(`Uploading favorite toggle for note ${noteId}: ${isFavorite}`);
    
    // For now, this is handled locally since the server API doesn't support favorites directly
    // In a real implementation, you would call a favorites API endpoint here
    console.log('Favorite status handled locally (server API limitation)');
  }

  /**
   * Download server changes and handle conflicts
   * @returns {Promise<Object>} Download result
   */
  async downloadServerChanges() {
    console.log('=== DOWNLOADING SERVER CHANGES ===');
    let count = 0;
    let conflictsResolved = 0;
    const errors = [];

    try {
      // Get remote notes from server
      let remoteNotes;
      try {
        remoteNotes = await getNotes();
        console.log('Successfully retrieved remote notes from server');
        
        // Additional validation of the response
        if (remoteNotes === null || remoteNotes === undefined) {
          console.warn('Remote notes API returned null/undefined, treating as empty array');
          remoteNotes = [];
        }
        
        // Log the actual response for debugging
        console.log('Remote notes response type:', typeof remoteNotes);
        console.log('Remote notes response:', remoteNotes);
        
      } catch (remoteError) {
        console.error('Failed to get remote notes from server:', remoteError);
        return { 
          count: 0, 
          conflictsResolved: 0, 
          errors: [`Failed to get remote notes: ${remoteError.message}`] 
        };
      }

      // Get local notes
      let localNotes;
      try {
        localNotes = await getLocalNotes();
        console.log('Successfully retrieved local notes');
        
        // Additional validation of the response
        if (localNotes === null || localNotes === undefined) {
          console.warn('Local notes API returned null/undefined, treating as empty array');
          localNotes = [];
        }
        
        // Log the actual response for debugging
        console.log('Local notes response type:', typeof localNotes);
        console.log('Local notes response length:', localNotes?.length || 0);
        
      } catch (localError) {
        console.error('Failed to get local notes:', localError);
        return { 
          count: 0, 
          conflictsResolved: 0, 
          errors: [`Failed to get local notes: ${localError.message}`] 
        };
      }

      console.log(`Server has ${remoteNotes?.length || 0} notes`);
      console.log(`Local has ${localNotes?.length || 0} notes`);

      // Validate that remoteNotes is an array
      if (!remoteNotes || !Array.isArray(remoteNotes)) {
        console.log('Invalid remote notes response - not an array:', remoteNotes);
        return { count: 0, conflictsResolved: 0, errors: ['Invalid remote notes response'] };
      }

      if (remoteNotes.length === 0) {
        console.log('No remote notes to download');
        return { count: 0, conflictsResolved: 0, errors: [] };
      }

      // Validate that localNotes is an array
      if (!localNotes || !Array.isArray(localNotes)) {
        console.log('Invalid local notes response - not an array:', localNotes);
        return { count: 0, conflictsResolved: 0, errors: ['Invalid local notes response'] };
      }

      // Create maps for efficient lookup
      const localNotesMap = new Map(localNotes.map(note => [note.id, note]));
      const remoteNotesMap = new Map(remoteNotes.map(note => [note.id, note]));

      // Process each remote note
      for (const remoteNote of remoteNotes) {
        // Validate remote note structure
        if (!remoteNote || typeof remoteNote !== 'object') {
          console.warn('Invalid remote note structure, skipping:', remoteNote);
          continue;
        }

        if (!remoteNote.id) {
          console.warn('Remote note missing ID, skipping:', remoteNote);
          continue;
        }

        const localNote = localNotesMap.get(remoteNote.id);

        if (!localNote) {
          // New note from server - add to local
          console.log(`Adding new note from server: ${remoteNote.title || 'Untitled'}`);
          try {
            await addNote(remoteNote);
            count++;
          } catch (addError) {
            console.error(`Failed to add remote note ${remoteNote.id}:`, addError);
            errors.push(`Failed to add remote note: ${addError.message}`);
          }
          
        } else {
          // Note exists locally - check for conflicts
          const conflict = this.detectConflict(localNote, remoteNote);
          
          if (conflict) {
            console.log(`Conflict detected for note ${remoteNote.id}: ${remoteNote.title || 'Untitled'}`);
            try {
              const resolvedNote = await this.resolveConflict(localNote, remoteNote, conflict);
              
              if (resolvedNote) {
                await updateNote(resolvedNote.id, resolvedNote);
                conflictsResolved++;
                console.log(`Conflict resolved for note ${remoteNote.id}`);
              }
            } catch (resolveError) {
              console.error(`Failed to resolve conflict for note ${remoteNote.id}:`, resolveError);
              errors.push(`Failed to resolve conflict: ${resolveError.message}`);
            }
          } else {
            // Check if remote is newer
            try {
              const remoteTime = new Date(remoteNote.updatedAt || remoteNote.date);
              const localTime = new Date(localNote.updatedAt || localNote.date);
              
              if (remoteTime > localTime) {
                console.log(`Updating local note with newer server version: ${remoteNote.title || 'Untitled'}`);
                await updateNote(remoteNote.id, remoteNote);
                count++;
              }
            } catch (timeError) {
              console.error(`Failed to process time comparison for note ${remoteNote.id}:`, timeError);
              errors.push(`Failed to process time comparison: ${timeError.message}`);
            }
          }
        }
      }

      // Check for notes that exist locally but not on server (deleted remotely)
      // IMPORTANT: Only delete local notes if we're confident they were deleted on server
      // Check if there are pending delete operations for this note first
      for (const localNote of localNotes) {
        // Validate local note structure
        if (!localNote || typeof localNote !== 'object') {
          console.warn('Invalid local note structure, skipping:', localNote);
          continue;
        }

        if (!localNote.id) {
          console.warn('Local note missing ID, skipping:', localNote);
          continue;
        }

        if (!remoteNotesMap.has(localNote.id)) {
          // Check if there's a pending delete operation for this note
          try {
            const pendingDeleteOps = await offlineQueueService.getOperationsByType(OPERATION_TYPES.DELETE_NOTE);
            const hasPendingDelete = pendingDeleteOps.some(op => 
              op.data.noteId === localNote.id || op.data.id === localNote.id
            );
            
            if (!hasPendingDelete) {
              // Only delete if there's no pending delete operation
              // This note was likely deleted on the server by another client
              console.log(`Note deleted on server, removing locally: ${localNote.title || 'Untitled'}`);
              try {
                await deleteNote(localNote.id);
                count++;
              } catch (deleteError) {
                console.error(`Failed to delete local note ${localNote.id}:`, deleteError);
                errors.push(`Failed to delete local note: ${deleteError.message}`);
              }
            } else {
              console.log(`Note ${localNote.id} missing from server but has pending delete operation - keeping locally until sync completes`);
            }
          } catch (pendingError) {
            console.error(`Failed to check pending delete operations for note ${localNote.id}:`, pendingError);
            errors.push(`Failed to check pending delete operations: ${pendingError.message}`);
          }
        }
      }

      console.log(`=== DOWNLOAD COMPLETED: ${count} changes processed, ${conflictsResolved} conflicts resolved ===`);
      if (errors.length > 0) {
        console.warn(`⚠️ Download completed with ${errors.length} errors:`, errors);
      }
      return { count, conflictsResolved, errors };

    } catch (error) {
      console.error('Error in download process:', error);
      
      // Ensure we have a valid errors array
      const safeErrors = Array.isArray(errors) ? errors : [];
      
      // Add the error message safely
      const errorMessage = error?.message || 'Unknown error occurred';
      safeErrors.push(errorMessage);
      
      return { count, conflictsResolved, errors: safeErrors };
    }
  }

  /**
   * Detect if there's a conflict between local and remote notes
   * @param {Object} localNote - Local note
   * @param {Object} remoteNote - Remote note
   * @returns {Object|null} Conflict details or null if no conflict
   */
  detectConflict(localNote, remoteNote) {
    const localTime = new Date(localNote.updatedAt || localNote.date);
    const remoteTime = new Date(remoteNote.updatedAt || remoteNote.date);
    
    // Check if both have been modified recently (within 5 minutes of each other)
    const timeDiff = Math.abs(localTime - remoteTime);
    const conflictThreshold = 5 * 60 * 1000; // 5 minutes
    
    if (timeDiff < conflictThreshold) {
      // Check if content is different
      const titleConflict = localNote.title !== remoteNote.title;
      const contentConflict = localNote.content !== remoteNote.content;
      const categoryConflict = localNote.category !== remoteNote.category;
      
      if (titleConflict || contentConflict || categoryConflict) {
        return {
          type: 'simultaneous_edit',
          local: localNote,
          remote: remoteNote,
          conflicts: {
            title: titleConflict,
            content: contentConflict,
            category: categoryConflict
          }
        };
      }
    }
    
    return null;
  }

  /**
   * Resolve a conflict between local and remote notes
   * @param {Object} localNote - Local note
   * @param {Object} remoteNote - Remote note
   * @param {Object} conflict - Conflict details
   * @returns {Promise<Object>} Resolved note
   */
  async resolveConflict(localNote, remoteNote, conflict) {
    console.log(`Resolving conflict with strategy: ${this.conflictStrategy}`);
    
    switch (this.conflictStrategy) {
      case CONFLICT_RESOLUTION.CLIENT_WINS:
        // Local version wins - keep local changes
        console.log('CLIENT_WINS: Keeping local version');
        return localNote;
        
      case CONFLICT_RESOLUTION.SERVER_WINS:
        // Server version wins - use remote changes
        console.log('SERVER_WINS: Using server version');
        return remoteNote;
        
      case CONFLICT_RESOLUTION.MERGE:
        // Intelligent merge - combine both versions
        console.log('MERGE: Combining both versions');
        return this.mergeNotes(localNote, remoteNote);
        
      case CONFLICT_RESOLUTION.ASK_USER:
        // TODO: Implement user choice dialog
        console.log('ASK_USER: Not implemented, falling back to CLIENT_WINS');
        return localNote;
        
      default:
        console.log('Unknown conflict resolution strategy, using CLIENT_WINS');
        return localNote;
    }
  }

  /**
   * Merge two conflicting notes intelligently
   * @param {Object} localNote - Local note
   * @param {Object} remoteNote - Remote note
   * @returns {Object} Merged note
   */
  mergeNotes(localNote, remoteNote) {
    console.log('Performing intelligent merge...');
    
    const merged = { ...localNote };
    
    // Title: Use the longer one (assuming more detail is better)
    if (remoteNote.title && remoteNote.title.length > localNote.title.length) {
      merged.title = remoteNote.title;
    }
    
    // Content: Combine both if different
    if (localNote.content !== remoteNote.content) {
      if (localNote.content && remoteNote.content) {
        // Both have content - combine with separator
        merged.content = `${localNote.content}\n\n--- Merged from server ---\n${remoteNote.content}`;
      } else {
        // Use whichever has content
        merged.content = localNote.content || remoteNote.content;
      }
    }
    
    // Category: Prefer local (user's explicit choice)
    merged.category = localNote.category || remoteNote.category;
    
    // Favorite: Prefer local (user's explicit choice)
    merged.isFavorite = localNote.isFavorite !== undefined ? localNote.isFavorite : remoteNote.isFavorite;
    
    // Update timestamp to now since it's a merge
    merged.updatedAt = new Date().toISOString();
    
    console.log('Merge completed:', merged.title);
    return merged;
  }

  /**
   * Set conflict resolution strategy
   * @param {string} strategy - Resolution strategy
   */
  setConflictResolution(strategy) {
    this.conflictStrategy = strategy;
    console.log(`Conflict resolution strategy set to: ${strategy}`);
  }
}

// Export singleton instance
export default new SyncService();
