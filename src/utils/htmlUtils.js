/**
 * Utility functions for handling HTML content
 */

/**
 * Strip HTML tags from a string and decode HTML entities
 * @param {string} html - HTML string to strip tags from
 * @returns {string} - Plain text without HTML tags
 */
export const stripHtmlTags = (html) => {
  if (!html) return '';
  
  // First replace common HTML entities
  let text = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Then strip all HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Remove excessive whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

/**
 * Extract text content from a note's content field, handling rich content
 * @param {Object} note - Note object
 * @returns {string} - Plain text content
 */
export const getNoteTextContent = (note) => {
  if (!note) return '';
  
  // Handle rich content if available
  if (note.richContent) {
    if (typeof note.richContent === 'string') {
      return stripHtmlTags(note.richContent);
    } else if (typeof note.richContent === 'object') {
      // Handle different rich content formats
      if (note.richContent.html) {
        return stripHtmlTags(note.richContent.html);
      } else if (note.richContent.content) {
        return stripHtmlTags(note.richContent.content);
      }
    }
  }
  
  // If no rich content or if it's not in expected format, fall back to regular content
  return stripHtmlTags(note.content || '');
};
