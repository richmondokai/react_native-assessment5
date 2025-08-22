import AsyncStorage from "@react-native-async-storage/async-storage";
import { axiosInstance } from "./axios_instance";
import { USER_KEY } from "../constants";

/**
 * Note list response type
 * @typedef {Array<Object>} NoteListResponse
 */

/**
 * Favorite response type
 * @typedef {Object} FavoriteResponse
 * @property {number} id - Favorite ID
 * @property {number} note_id - Note ID
 * @property {number} user_id - User ID
 * @property {Object} note - Note data
 */

/**
 * Get all notes from the API
 * @returns {Promise<NoteListResponse>} List of notes
 */
export const getNotes = async () => {
    try {
        const response = await axiosInstance.get("/api/notes");
        return response.data;
    } catch (error) {
        console.log("got error: ", error);
        const msg = error?.response?.data?.error || "Failed to get notes";
        throw new Error(msg);
    }
};

/**
 * Add a new note
 * @param {string} title - Note title
 * @param {string} content - Note content
 * @param {string} priority - Note priority
 * @returns {Promise<boolean>} Success status
 */
export const addNotes = async (title, content, priority, isPublic = true) => {
    try {
        const requestData = {
            title,
            content,
            category: priority,
            isPublic: isPublic
        };
        
        console.log('=== REMOTE SERVICE DEBUG ===');
        console.log('addNotes called with parameters:');
        console.log('- title:', title);
        console.log('- content length:', content?.length || 0);
        console.log('- priority/category:', priority);
        console.log('- isPublic:', isPublic);
        console.log('Request data being sent to API:', requestData);
        console.log('=== END REMOTE SERVICE DEBUG ===');
        
        await axiosInstance.post(
            `/api/notes`,
            requestData,
        );

        return true;
    } catch (error) {
        console.log("got error: ", error);
        const msg = error?.response?.data?.error || "Add Note Failed";
        throw new Error(msg);
    }
};

/**
 * Update an existing note
 * @param {number|string} id - Note ID
 * @param {string} title - Note title
 * @param {string} content - Note content
 * @param {string} priority - Note priority
 * @returns {Promise<boolean>} Success status
 */
export const updateNotes = async (id, title, content, priority, isPublic) => {
    try {
        // Make sure id is a number for the API
        const numericId = parseInt(id, 10);
        
        if (isNaN(numericId)) {
            // If id is not a valid number, we can't update it on the API
            console.log("Invalid note ID for API update:", id);
            return true; // Return true so local update continues
        }
        
        const requestData = {
            title,
            content,
            category: priority,
            isPublic: isPublic
        };
        
        console.log('=== UPDATE REMOTE SERVICE DEBUG ===');
        console.log('updateNotes called with parameters:');
        console.log('- id:', id, '-> numericId:', numericId);
        console.log('- title:', title);
        console.log('- content length:', content?.length || 0);
        console.log('- priority/category:', priority);
        console.log('- isPublic:', isPublic);
        console.log('Request data being sent to API:', requestData);
        console.log('=== END UPDATE REMOTE SERVICE DEBUG ===');
        
        await axiosInstance.put(
            `/api/notes/${numericId}`,
            requestData,
        );

        return true;
    } catch (error) {
        console.log("got error: ", error);
        
        // If we get a 404, the note doesn't exist on the server
        if (error.response && error.response.status === 404) {
            console.log("Note not found on server for update, continuing with local update");
            return true; // Return true so local update continues
        }
        
        const msg = error?.response?.data?.error || "Update Note Failed";
        throw new Error(msg);
    }
};

/**
 * Delete a note
 * @param {number|string} id - Note ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteNotes = async (id) => {
    try {
        // Make sure id is a number for the API
        const numericId = parseInt(id, 10);
        
        if (isNaN(numericId)) {
            // If id is not a valid number, we can't delete it from the API
            // but we can still delete it locally
            console.log("Invalid note ID for API deletion:", id);
            return true; // Return true so local deletion continues
        }
        
        await axiosInstance.delete(`/api/notes/${numericId}`);
        return true;
    } catch (error) {
        console.log("got error: ", error);
        
        // If we get a 404, the note doesn't exist on the server
        // This is fine for deletion - we'll just delete it locally
        if (error.response && error.response.status === 404) {
            console.log("Note not found on server, continuing with local deletion");
            return true; // Return true so local deletion continues
        }
        
        const msg = error?.response?.data?.error || "Delete Note Failed";
        throw new Error(msg);
    }
};

/**
 * Add a note to favorites
 * @param {number} id - Note ID
 * @returns {Promise<boolean>} Success status
 */
export const addFavoriteNotes = async (id) => {
    const user = await AsyncStorage.getItem(USER_KEY);
    const userId = JSON.parse(user || "{}")?.id;

    try {
        await axiosInstance.post(
            `/favorites`,
            {
                note_id: id,
                user_id: userId
            }
        );

        return true;
    } catch (error) {
        console.log("got error: ", error);
        const msg = error?.response?.data?.error || "Add to Favorites Failed";
        throw new Error(msg);
    }
};

/**
 * Get favorite notes for the current user
 * @returns {Promise<Array<FavoriteResponse>|null>} List of favorite notes
 */
export const getFavoriteNotes = async () => {
    const user = await AsyncStorage.getItem(USER_KEY);
    const userId = JSON.parse(user || "{}")?.id;

    try {
        const response = await axiosInstance.get(`/favorites/${userId}`);
        return response.data;
    } catch (error) {
        console.log("got error: get favorites ", error);
        const msg = error?.response?.data?.error || "Get Favorites Failed";
        throw new Error(msg);
    }
};

/**
 * Remove a note from favorites
 * @param {number} id - Note ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteFavoriteNotes = async (id) => {
    const user = await AsyncStorage.getItem(USER_KEY);
    const userId = JSON.parse(user || "{}")?.id;

    try {
        await axiosInstance.delete(`/favorites/${userId}/${id}`);
        return true;
    } catch (error) {
        console.log("got error: ", error);
        const msg = error?.response?.data?.error || "Delete Favorite Note Failed";
        throw new Error(msg);
    }
};
