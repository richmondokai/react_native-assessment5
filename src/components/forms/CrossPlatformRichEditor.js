import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity
} from 'react-native';
import { useDarkMode } from '../../hooks/useDarkMode';
import { actions, RichEditor, RichToolbar } from 'react-native-pell-rich-editor';
import { Ionicons } from '@expo/vector-icons';

const CrossPlatformRichEditor = ({
  value,
  onChangeText,
  placeholder = "Start typing...",
  style,
  editable = true
}) => {
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const richText = useRef();
  const scrollRef = useRef();
  const [content, setContent] = useState(value || '');
  const [isReady, setIsReady] = useState(false);
  const [height, setHeight] = useState(300);
  
  // Initialize content when the editor is ready
  useEffect(() => {
    if (isReady && richText.current && value !== content) {
      // Use a small delay to ensure the editor is fully ready
      const timer = setTimeout(() => {
        if (richText.current) {
          richText.current.setContentHTML(value || '');
          setContent(value || '');
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isReady, value]);
  
  // Handle editor content change
  const handleContentChange = (html) => {
    setContent(html);
    if (onChangeText) {
      onChangeText(html);
    }
  };
  
  // Handle editor height change
  const handleHeightChange = (height) => {
    setHeight(Math.max(height, 300)); // Minimum height of 300
  };
  
  // Custom action handler for the toolbar
  const handleCustomAction = (action) => {
    if (action === 'clear') {
      richText.current?.setContentHTML('');
    }
  };
  
  // Custom icons for the toolbar
  const renderIcon = (iconName, tintColor) => {
    return <Ionicons name={iconName} size={24} color={tintColor} />;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, style]}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        <RichToolbar
          style={[
            styles.toolbar,
            isDarkMode && { backgroundColor: darkModeStyles.input.backgroundColor }
          ]}
          editor={richText}
          disabled={!editable}
          selectedIconTint="#2095F2"
          disabledIconTint="#bfbfbf"
          onPressAddImage={() => {}}
          iconMap={{
            [actions.heading1]: () => renderIcon('text', '#000'),
            [actions.heading2]: () => renderIcon('text-outline', '#000'),
            [actions.heading3]: () => renderIcon('text-sharp', '#000'),
            [actions.heading4]: () => renderIcon('list-outline', '#000'),
            [actions.heading5]: () => renderIcon('list', '#000'),
            [actions.heading6]: () => renderIcon('list-sharp', '#000'),
          }}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.heading1,
            actions.heading2,
            actions.insertBulletsList,
            actions.insertOrderedList,
            actions.alignLeft,
            actions.alignCenter,
            actions.alignRight,
            actions.insertLink,
            'clear',
          ]}
          iconSize={24}
        />
        
        <RichEditor
          ref={richText}
          style={[
            styles.richEditor,
            { height },
            isDarkMode && {
              backgroundColor: darkModeStyles.input.backgroundColor,
              color: darkModeStyles.text.color
            }
          ]}
          placeholder={placeholder}
          initialContentHTML={value || ''}
          editorInitializedCallback={() => setIsReady(true)}
          onChange={handleContentChange}
          onHeightChange={handleHeightChange}
          editable={editable}
          initialHeight={300}
          useContainer={true}
          containerStyle={styles.editorContainer}
          pasteAsPlainText={true}
          disabled={!editable}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
  },
  scrollContainer: {
    flex: 1,
  },
  editorContainer: {
    flex: 1,
    minHeight: 300,
  },
  toolbar: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  richEditor: {
    flex: 1,
    minHeight: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 10,
  },
});

export default CrossPlatformRichEditor;
