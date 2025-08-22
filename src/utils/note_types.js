/**
 * Note properties type
 * @typedef {Object} NoteProps
 * @property {number} id - Note ID
 * @property {string} title - Note title
 * @property {string} content - Note content
 * @property {Object} [richContent] - Rich text formatting data
 * @property {Array<Object>} [attachments] - File attachments (images, audio)
 * @property {Object} [location] - Location data with coordinates and address
 * @property {string} [category] - Note category
 * @property {string} [priority] - Note priority (low, medium, high)
 * @property {boolean} [isFavorite] - Whether the note is marked as favorite
 * @property {string} [updatedAt] - Last update timestamp
 * @property {string} [createdAt] - Creation timestamp
 */

/**
 * Rich content formatting type
 * @typedef {Object} RichContent
 * @property {Array<Object>} blocks - Text blocks with formatting
 * @property {Object} formatting - Formatting metadata
 */

/**
 * Attachment type
 * @typedef {Object} Attachment
 * @property {string} id - Attachment ID
 * @property {string} type - Type (image, audio, document)
 * @property {string} uri - File URI or path
 * @property {string} [name] - Original filename
 * @property {number} [size] - File size in bytes
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * Location data type
 * @typedef {Object} LocationData
 * @property {Object} coords - Latitude and longitude coordinates
 * @property {Object} [address] - Address information
 * @property {string} [placeName] - Human readable place name
 */

/**
 * Note list response type
 * @typedef {Array<NoteProps>} NoteListResponse
 */

/**
 * Favorite response type
 * @typedef {Object} FavoriteResponse
 * @property {number} id - Favorite ID
 * @property {number} note_id - Note ID
 * @property {number} user_id - User ID
 * @property {Object} note - Note data
 */

// This file is for JSDoc type definitions only
// No actual code is exported
