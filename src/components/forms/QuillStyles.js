import React, { useEffect } from 'react';
import { Platform } from 'react-native';

// This component is responsible for loading Quill CSS
const QuillStyles = () => {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Load Quill CSS
      const linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      document.head.appendChild(linkElement);

      // Add custom styles for dark mode support
      const styleElement = document.createElement('style');
      styleElement.textContent = `
        .ql-toolbar.ql-snow {
          border: 1px solid #ccc;
          box-sizing: border-box;
          font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif;
          padding: 8px;
        }
        
        .ql-container.ql-snow {
          border: 1px solid #ccc;
        }
        
        /* Dark mode styles */
        @media (prefers-color-scheme: dark) {
          .ql-toolbar.ql-snow {
            border-color: #444;
            background-color: #222;
          }
          
          .ql-container.ql-snow {
            border-color: #444;
            background-color: #333;
            color: #eee;
          }
          
          .ql-picker-label {
            color: #eee;
          }
          
          .ql-picker-options {
            background-color: #333;
          }
          
          .ql-snow .ql-stroke {
            stroke: #eee;
          }
          
          .ql-snow .ql-fill, .ql-snow .ql-stroke.ql-fill {
            fill: #eee;
          }
          
          .ql-snow.ql-toolbar button:hover,
          .ql-snow .ql-toolbar button:hover,
          .ql-snow.ql-toolbar button:focus,
          .ql-snow .ql-toolbar button:focus,
          .ql-snow.ql-toolbar button.ql-active,
          .ql-snow .ql-toolbar button.ql-active,
          .ql-snow.ql-toolbar .ql-picker-label:hover,
          .ql-snow .ql-toolbar .ql-picker-label:hover,
          .ql-snow.ql-toolbar .ql-picker-label.ql-active,
          .ql-snow .ql-toolbar .ql-picker-label.ql-active,
          .ql-snow.ql-toolbar .ql-picker-item:hover,
          .ql-snow .ql-toolbar .ql-picker-item:hover,
          .ql-snow.ql-toolbar .ql-picker-item.ql-selected,
          .ql-snow .ql-toolbar .ql-picker-item.ql-selected {
            color: #06c;
          }
          
          .ql-snow.ql-toolbar button:hover .ql-stroke,
          .ql-snow .ql-toolbar button:hover .ql-stroke,
          .ql-snow.ql-toolbar button:focus .ql-stroke,
          .ql-snow .ql-toolbar button:focus .ql-stroke,
          .ql-snow.ql-toolbar button.ql-active .ql-stroke,
          .ql-snow .ql-toolbar button.ql-active .ql-stroke,
          .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke,
          .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke,
          .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke,
          .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke,
          .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke,
          .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke,
          .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
          .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke,
          .ql-snow.ql-toolbar button:hover .ql-stroke-miter,
          .ql-snow .ql-toolbar button:hover .ql-stroke-miter,
          .ql-snow.ql-toolbar button:focus .ql-stroke-miter,
          .ql-snow .ql-toolbar button:focus .ql-stroke-miter,
          .ql-snow.ql-toolbar button.ql-active .ql-stroke-miter,
          .ql-snow .ql-toolbar button.ql-active .ql-stroke-miter,
          .ql-snow.ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
          .ql-snow .ql-toolbar .ql-picker-label:hover .ql-stroke-miter,
          .ql-snow.ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
          .ql-snow .ql-toolbar .ql-picker-label.ql-active .ql-stroke-miter,
          .ql-snow.ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
          .ql-snow .ql-toolbar .ql-picker-item:hover .ql-stroke-miter,
          .ql-snow.ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter,
          .ql-snow .ql-toolbar .ql-picker-item.ql-selected .ql-stroke-miter {
            stroke: #06c;
          }
        }
      `;
      document.head.appendChild(styleElement);

      // Cleanup function
      return () => {
        document.head.removeChild(linkElement);
        document.head.removeChild(styleElement);
      };
    }
  }, []);

  // This component doesn't render anything
  return null;
};

export default QuillStyles;
