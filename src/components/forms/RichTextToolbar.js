import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDarkMode } from '../../hooks/useDarkMode';

const RichTextToolbar = ({ editor, style }) => {
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const [activeFormats, setActiveFormats] = useState({});

  const handleBold = () => {
    editor?.setBold();
    setActiveFormats(prev => ({ ...prev, bold: !prev.bold }));
  };

  const handleItalic = () => {
    editor?.setItalic();
    setActiveFormats(prev => ({ ...prev, italic: !prev.italic }));
  };

  const handleUnderline = () => {
    editor?.setUnderline();
    setActiveFormats(prev => ({ ...prev, underline: !prev.underline }));
  };

  const handleBulletList = () => {
    editor?.insertBulletsList();
  };

  const handleNumberedList = () => {
    editor?.insertOrderedList();
  };

  const handleHeading = (level) => {
    editor?.setHeading(level);
    setActiveFormats(prev => ({ ...prev, heading: level }));
  };

  const handleLink = () => {
    Alert.prompt(
      'Add Link',
      'Enter the URL:',
      (url) => {
        if (url) {
          Alert.prompt(
            'Link Title',
            'Enter link text (optional):',
            (title) => {
              editor?.insertLink(url, title || 'Link');
            }
          );
        }
      }
    );
  };

  const formatButtons = [
    {
      icon: 'text-outline',
      onPress: handleBold,
      active: activeFormats.bold,
      title: 'Bold'
    },
    {
      icon: 'text',
      onPress: handleItalic,
      active: activeFormats.italic,
      title: 'Italic'
    },
    {
      icon: 'text',
      onPress: handleUnderline,
      active: activeFormats.underline,
      title: 'Underline'
    },
    {
      icon: 'list-outline',
      onPress: handleBulletList,
      active: false,
      title: 'Bullet List'
    },
    {
      icon: 'list',
      onPress: handleNumberedList,
      active: false,
      title: 'Numbered List'
    },
    {
      icon: 'link-outline',
      onPress: handleLink,
      active: false,
      title: 'Link'
    }
  ];

  const headingButtons = [
    {
      text: 'H1',
      onPress: () => handleHeading(1),
      active: activeFormats.heading === 1
    },
    {
      text: 'H2',
      onPress: () => handleHeading(2),
      active: activeFormats.heading === 2
    },
    {
      text: 'H3',
      onPress: () => handleHeading(3),
      active: activeFormats.heading === 3
    }
  ];

  return (
    <View style={[
      styles.toolbar,
      isDarkMode && {
        backgroundColor: darkModeStyles.card.backgroundColor,
        borderBottomColor: darkModeStyles.card.borderColor,
      },
      style
    ]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbarContent}
      >
        {/* Heading Buttons */}
        {headingButtons.map((button, index) => (
          <TouchableOpacity
            key={`heading-${index}`}
            style={[
              styles.toolbarButton,
              styles.headingButton,
              button.active && styles.activeButton,
              isDarkMode && button.active && { backgroundColor: '#4a9eff' }
            ]}
            onPress={button.onPress}
          >
            <Text style={[
              styles.headingButtonText,
              isDarkMode && { color: darkModeStyles.text.color },
              button.active && styles.activeButtonText
            ]}>
              {button.text}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* Separator */}
        <View style={[
          styles.separator,
          isDarkMode && { backgroundColor: darkModeStyles.card.borderColor }
        ]} />
        
        {/* Format Buttons */}
        {formatButtons.map((button, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.toolbarButton,
              button.active && styles.activeButton,
              isDarkMode && button.active && { backgroundColor: '#4a9eff' }
            ]}
            onPress={button.onPress}
          >
            <Ionicons
              name={button.icon}
              size={20}
              color={
                button.active 
                  ? '#FFFFFF' 
                  : isDarkMode 
                    ? darkModeStyles.text.color 
                    : '#333333'
              }
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
  },
  toolbarContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 6,
    backgroundColor: 'transparent',
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingButton: {
    minWidth: 32,
  },
  headingButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  activeButtonText: {
    color: '#FFFFFF',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
});

export default RichTextToolbar;
