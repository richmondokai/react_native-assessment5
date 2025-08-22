import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDarkMode } from '../../hooks/useDarkMode';

// Define rich text actions
const actions = {
  keyboard: 'keyboard',
  setBold: 'bold',
  setItalic: 'italic',
  setUnderline: 'underline',
  removeFormat: 'removeFormat',
  insertBulletsList: 'insertBulletsList',
  insertOrderedList: 'insertOrderedList',
  indent: 'indent',
  outdent: 'outdent',
  insertLink: 'insertLink',
  heading1: 'heading1',
  heading2: 'heading2',
  alignLeft: 'alignLeft',
  alignCenter: 'alignCenter',
  alignRight: 'alignRight',
};

// Default actions to display in toolbar
const defaultActions = [
  actions.setBold,
  actions.setItalic,
  actions.setUnderline,
  actions.insertBulletsList,
  actions.insertOrderedList,
  actions.heading1,
  actions.heading2,
  actions.alignLeft,
  actions.alignRight,
];

// Map actions to Ionicons names
const getIconNameForAction = (action) => {
  switch (action) {
    case actions.setBold:
      return 'document-text-outline';
    case actions.setItalic:
      return 'document-text';
    case actions.setUnderline:
      return 'text';
    case actions.insertBulletsList:
      return 'list';
    case actions.insertOrderedList:
      return 'list-circle';
    case actions.heading1:
      return 'text-sharp';
    case actions.heading2:
      return 'text-outline';
    case actions.alignLeft:
      return 'arrow-back';
    case actions.alignCenter:
      return 'remove';
    case actions.alignRight:
      return 'arrow-forward';
    case actions.removeFormat:
      return 'close-circle-outline';
    case actions.indent:
      return 'chevron-forward';
    case actions.outdent:
      return 'chevron-back';
    default:
      return 'help-circle-outline';
  }
};

const ModernRichTextEditor = ({
  value,
  onChangeText,
  placeholder = "Start typing...",
  style,
  editable = true,
  toolbarActions = defaultActions
}) => {
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const [content, setContent] = useState(value || '');
  const [selectedActions, setSelectedActions] = useState([]);
  const textInputRef = useRef(null);
  
  // Handle content changes
  const handleContentChange = (text) => {
    console.log('📝 Direct editor content changed:', text?.substring(0, 100) + (text?.length > 100 ? '...' : ''));
    setContent(text);
    if (onChangeText) {
      onChangeText(text);
    }
  };

  // Update local content when prop changes
  React.useEffect(() => {
    if (value !== content) {
      console.log('📝 Updating content from prop:', value?.substring(0, 100));
      setContent(value || '');
    }
  }, [value]);
  
  // Handle toolbar button press
  const handleToolbarAction = (action) => {
    console.log(`📝 Toolbar action: ${action}`);
    
    // Focus the text input
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
    
    // Toggle selection state for the action
    if (selectedActions.includes(action)) {
      setSelectedActions(selectedActions.filter(a => a !== action));
    } else {
      setSelectedActions([...selectedActions, action]);
    }
    
    // Apply formatting based on action
    // In a real implementation, this would modify the text with formatting
    // For now, we just log the action
    console.log(`📝 Applied formatting: ${action}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, style]}
    >
      <View style={[
        styles.editorContainer,
        isDarkMode && {
          backgroundColor: darkModeStyles.input.backgroundColor,
          borderColor: darkModeStyles.input.borderColor,
        }
      ]}>
        {/* Enhanced formatting toolbar */}
        <View style={[
          styles.toolbar,
          isDarkMode && {
            backgroundColor: darkModeStyles.card.backgroundColor,
            borderBottomColor: darkModeStyles.card.borderColor,
          }
        ]}>
          <FlatList
            horizontal
            data={toolbarActions.map(action => ({
              action,
              selected: selectedActions.includes(action)
            }))}
            keyExtractor={(item) => item.action}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.toolbarButton,
                  item.selected && styles.toolbarButtonSelected,
                  isDarkMode && item.selected && { backgroundColor: '#4a9eff33' }
                ]}
                onPress={() => handleToolbarAction(item.action)}
              >
                <Ionicons 
                  name={getIconNameForAction(item.action)} 
                  size={22} 
                  color={item.selected 
                    ? (isDarkMode ? '#4a9eff' : '#007AFF')
                    : (isDarkMode ? darkModeStyles.text.color : '#333')} 
                />
              </TouchableOpacity>
            )}
          />
        </View>
        
        {/* Direct text editor */}
        <ScrollView 
          style={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              isDarkMode && { color: darkModeStyles.text.color }
            ]}
            value={content}
            onChangeText={handleContentChange}
            placeholder={placeholder}
            placeholderTextColor={isDarkMode ? darkModeStyles.subText.color : '#999999'}
            multiline={true}
            scrollEnabled={false}
            editable={editable}
            keyboardType="default"
            autoCapitalize="sentences"
            autoCorrect={true}
            blurOnSubmit={false}
          />
        </ScrollView>
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
  toolbar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingHorizontal: 5,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    borderRadius: 4,
  },
  toolbarButtonSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  scrollContainer: {
    flex: 1,
    padding: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    minHeight: 200,
    textAlignVertical: 'top',
  },
});

export default ModernRichTextEditor;