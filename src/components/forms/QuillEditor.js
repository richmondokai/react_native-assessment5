import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Text,
  Dimensions
} from 'react-native';
import { useDarkMode } from '../../hooks/useDarkMode';

// Import the Quill library
let Quill = null;

// This component renders a Quill rich text editor
const QuillEditor = ({
  value,
  onChangeText,
  placeholder = "Start typing...",
  style,
  editable = true
}) => {
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const editorRef = useRef(null);
  const quillInstance = useRef(null);
  const [editorReady, setEditorReady] = useState(false);
  const [editorContent, setEditorContent] = useState(value || '');
  const [editorHeight, setEditorHeight] = useState(300);
  const contentChanged = useRef(false);
  const isInitialRender = useRef(true);

  // Dynamically import Quill on the web platform only
  useEffect(() => {
    if (Platform.OS === 'web') {
      import('quill').then(module => {
        Quill = module.default;
        setEditorReady(true);
      });
    }
  }, []);

  // Initialize Quill when the component mounts
  useEffect(() => {
    if (Platform.OS === 'web' && editorReady && editorRef.current && !quillInstance.current) {
      // Initialize Quill with options
      quillInstance.current = new Quill(editorRef.current, {
        theme: 'snow',
        placeholder: placeholder,
        readOnly: !editable,
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'align': [] }],
            ['clean'],
            ['link', 'image']
          ]
        }
      });

      // Listen for text changes
      quillInstance.current.on('text-change', () => {
        if (quillInstance.current) {
          const html = quillInstance.current.root.innerHTML;
          setEditorContent(html);
          contentChanged.current = true;
          
          if (onChangeText) {
            onChangeText(html);
          }
        }
      });

      // Set initial content
      if (value) {
        quillInstance.current.clipboard.dangerouslyPasteHTML(value);
      }
    }

    return () => {
      // Clean up Quill instance when component unmounts
      if (quillInstance.current) {
        quillInstance.current = null;
      }
    };
  }, [editorReady, editorRef, placeholder, editable]);

  // Update content when value prop changes
  useEffect(() => {
    // Skip on initial render
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    // Only update if content hasn't been changed by user
    if (quillInstance.current && value !== editorContent && !contentChanged.current) {
      quillInstance.current.clipboard.dangerouslyPasteHTML(value || '');
      setEditorContent(value || '');
    }

    // Reset the content changed flag
    contentChanged.current = false;
  }, [value]);

  // Handle dark mode
  useEffect(() => {
    if (Platform.OS === 'web' && editorRef.current) {
      const editorElement = editorRef.current;
      
      if (isDarkMode) {
        editorElement.style.backgroundColor = darkModeStyles.input.backgroundColor;
        editorElement.style.color = darkModeStyles.text.color;
        editorElement.style.borderColor = darkModeStyles.input.borderColor;
      } else {
        editorElement.style.backgroundColor = '#FFFFFF';
        editorElement.style.color = '#000000';
        editorElement.style.borderColor = '#E0E0E0';
      }
    }
  }, [isDarkMode, darkModeStyles]);

  // Render fallback for non-web platforms
  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Text style={styles.fallbackText}>
          Rich text editing is only available on web platforms.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, style]}
    >
      <View style={styles.editorContainer}>
        {/* This div will be used to initialize Quill */}
        <div 
          ref={editorRef} 
          style={{ 
            height: editorHeight, 
            width: '100%',
            backgroundColor: isDarkMode ? darkModeStyles.input.backgroundColor : '#FFFFFF',
            color: isDarkMode ? darkModeStyles.text.color : '#000000',
            borderColor: isDarkMode ? darkModeStyles.input.borderColor : '#E0E0E0'
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  }
});

export default QuillEditor;
