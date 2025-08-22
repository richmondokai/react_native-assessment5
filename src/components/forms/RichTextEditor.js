import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDarkMode } from '../../hooks/useDarkMode';

const RichTextEditor = ({ 
  value = '', 
  onChangeText, 
  placeholder = 'Start typing...',
  style,
  autoFocus = false 
}) => {
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const [text, setText] = useState(value);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [formatting, setFormatting] = useState({
    bold: false,
    italic: false,
    underline: false,
    listType: null // 'bullet' or 'numbered'
  });
  
  const textInputRef = useRef(null);
  const [richContent, setRichContent] = useState({
    blocks: [],
    formatting: {}
  });

  const handleTextChange = useCallback((newText) => {
    setText(newText);
    if (onChangeText) {
      onChangeText(newText);
    }
  }, [onChangeText]);

  const handleSelectionChange = useCallback((event) => {
    const { start, end } = event.nativeEvent.selection;
    setSelectionStart(start);
    setSelectionEnd(end);
  }, []);

  const applyFormatting = useCallback((formatType) => {
    const selectedText = text.substring(selectionStart, selectionEnd);
    
    if (selectedText.length === 0) {
      Alert.alert('No Selection', 'Please select text to format');
      return;
    }

    let formattedText = text;
    let markers = '';
    
    switch (formatType) {
      case 'bold':
        markers = '**';
        break;
      case 'italic':
        markers = '*';
        break;
      case 'underline':
        markers = '__';
        break;
      default:
        return;
    }

    // Check if text is already formatted
    const beforeText = text.substring(0, selectionStart);
    const afterText = text.substring(selectionEnd);
    
    if (beforeText.endsWith(markers) && afterText.startsWith(markers)) {
      // Remove formatting
      formattedText = beforeText.slice(0, -markers.length) + selectedText + afterText.slice(markers.length);
      setFormatting(prev => ({ ...prev, [formatType]: false }));
    } else {
      // Add formatting
      formattedText = beforeText + markers + selectedText + markers + afterText;
      setFormatting(prev => ({ ...prev, [formatType]: true }));
    }

    handleTextChange(formattedText);
    
    // Update selection to maintain cursor position
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.setNativeProps({
          selection: { 
            start: selectionStart + markers.length, 
            end: selectionEnd + markers.length 
          }
        });
      }
    }, 10);
  }, [text, selectionStart, selectionEnd, handleTextChange]);

  const addList = useCallback((listType) => {
    const lines = text.split('\n');
    const lineIndex = text.substring(0, selectionStart).split('\n').length - 1;
    const currentLine = lines[lineIndex];
    
    let newLine = '';
    const bulletPrefix = '• ';
    const numberedPrefix = '1. ';
    
    if (listType === 'bullet') {
      if (currentLine.startsWith(bulletPrefix)) {
        // Remove bullet
        newLine = currentLine.substring(bulletPrefix.length);
      } else {
        // Add bullet
        newLine = bulletPrefix + currentLine.trim();
      }
    } else if (listType === 'numbered') {
      if (/^\d+\.\s/.test(currentLine)) {
        // Remove numbering
        newLine = currentLine.replace(/^\d+\.\s/, '');
      } else {
        // Add numbering
        const lineNumber = lines.slice(0, lineIndex).filter(line => /^\d+\.\s/.test(line)).length + 1;
        newLine = `${lineNumber}. ${currentLine.trim()}`;
      }
    }
    
    lines[lineIndex] = newLine;
    const newText = lines.join('\n');
    handleTextChange(newText);
    
    setFormatting(prev => ({ ...prev, listType: listType }));
  }, [text, selectionStart, handleTextChange]);

  const insertHeading = useCallback(() => {
    const beforeText = text.substring(0, selectionStart);
    const afterText = text.substring(selectionStart);
    const headingText = '# Heading\n';
    
    const newText = beforeText + headingText + afterText;
    handleTextChange(newText);
    
    // Position cursor after heading
    setTimeout(() => {
      if (textInputRef.current) {
        textInputRef.current.focus();
        textInputRef.current.setNativeProps({
          selection: { 
            start: selectionStart + headingText.length, 
            end: selectionStart + headingText.length 
          }
        });
      }
    }, 10);
  }, [text, selectionStart, handleTextChange]);

  const formatButtons = [
    { type: 'bold', icon: 'text', active: formatting.bold },
    { type: 'italic', icon: 'text-outline', active: formatting.italic },
    { type: 'underline', icon: 'text', active: formatting.underline },
    { type: 'heading', icon: 'text', action: insertHeading },
    { type: 'bullet', icon: 'list', action: () => addList('bullet'), active: formatting.listType === 'bullet' },
    { type: 'numbered', icon: 'list-outline', action: () => addList('numbered'), active: formatting.listType === 'numbered' }
  ];

  return (
    <View style={[styles.container, style]}>
      {/* Formatting Toolbar */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={[styles.toolbar, isDarkMode && { backgroundColor: darkModeStyles.card.backgroundColor }]}
        contentContainerStyle={styles.toolbarContent}
        keyboardShouldPersistTaps="handled"
      >
        {formatButtons.map((button) => (
          <TouchableOpacity
            key={button.type}
            style={[
              styles.formatButton,
              button.active && styles.formatButtonActive,
              isDarkMode && { borderColor: darkModeStyles.card.borderColor },
              button.active && isDarkMode && { backgroundColor: darkModeStyles.primary.backgroundColor }
            ]}
            onPress={button.action || (() => applyFormatting(button.type))}
          >
            <Ionicons 
              name={button.icon} 
              size={16} 
              color={
                button.active 
                  ? (isDarkMode ? '#FFFFFF' : '#FFFFFF')
                  : (isDarkMode ? darkModeStyles.text.color : '#666')
              } 
            />
            <Text style={[
              styles.formatButtonText,
              button.active && styles.formatButtonTextActive,
              isDarkMode && { color: button.active ? '#FFFFFF' : darkModeStyles.text.color }
            ]}>
              {button.type.charAt(0).toUpperCase() + button.type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Text Input */}
      <TextInput
        ref={textInputRef}
        style={[
          styles.textInput,
          isDarkMode && {
            backgroundColor: darkModeStyles.input.backgroundColor,
            color: darkModeStyles.text.color,
            borderColor: darkModeStyles.input.borderColor
          }
        ]}
        value={text}
        onChangeText={handleTextChange}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        placeholderTextColor={isDarkMode ? '#8E8E93' : '#999'}
        multiline
        autoFocus={autoFocus}
        textAlignVertical="top"
        scrollEnabled={true}
        keyboardType="default"
        returnKeyType="default"
        blurOnSubmit={false}
        enablesReturnKeyAutomatically={false}
        keyboardDismissMode="none"
        nestedScrollEnabled={true}
      />

      {/* Preview/Help Text */}
      <View style={styles.helpContainer}>
        <Text style={[styles.helpText, isDarkMode && { color: darkModeStyles.subText.color }]}>
          Select text and use toolbar to format. Supports **bold**, *italic*, __underline__, # headings, • bullets, and numbered lists.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
  },
  toolbar: {
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    maxHeight: 60,
  },
  toolbarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  formatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  formatButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  formatButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  formatButtonTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  helpContainer: {
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 6,
    marginTop: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default RichTextEditor;
