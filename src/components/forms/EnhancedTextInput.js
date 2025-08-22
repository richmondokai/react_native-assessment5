import React, { useState, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDarkMode } from '../../hooks/useDarkMode';

const EnhancedTextInput = forwardRef(({
  label,
  value,
  onChangeText,
  onFocus,
  onBlur,
  error,
  placeholder,
  secureTextEntry,
  multiline = false,
  numberOfLines = 1,
  leftIcon,
  rightIcon,
  onRightIconPress,
  autoCapitalize = 'none',
  keyboardType = 'default',
  autoCorrect = true,
  autoComplete = 'off',
  maxLength,
  editable = true,
  style,
  containerStyle,
  labelStyle,
  errorStyle,
  ...props
}, ref) => {
  const { isDarkMode } = useDarkMode();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus && onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur && onBlur(e);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const inputStyles = [
    styles.input,
    {
      backgroundColor: isDarkMode ? '#2C2C2E' : '#FFFFFF',
      borderColor: error 
        ? '#FF3B30' 
        : isFocused 
          ? '#007AFF' 
          : (isDarkMode ? '#48484A' : '#E5E5EA'),
      color: isDarkMode ? '#FFFFFF' : '#000000',
      paddingLeft: leftIcon ? 45 : 16,
      paddingRight: (secureTextEntry || rightIcon) ? 45 : 16,
      height: multiline ? Math.max(numberOfLines * 22 + 24, 44) : 44,
      textAlignVertical: multiline ? 'top' : 'center',
    },
    editable === false && {
      opacity: 0.6,
      backgroundColor: isDarkMode ? '#1C1C1E' : '#F2F2F7',
    },
    style,
  ];

  const placeholderTextColor = isDarkMode ? '#8E8E93' : '#6D6D80';

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[
          styles.label,
          { color: isDarkMode ? '#FFFFFF' : '#000000' },
          isFocused && { color: '#007AFF' },
          error && { color: '#FF3B30' },
          labelStyle,
        ]}>
          {label}
        </Text>
      )}
      
      <View style={styles.inputContainer}>
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Ionicons
              name={leftIcon}
              size={20}
              color={isFocused ? '#007AFF' : (isDarkMode ? '#8E8E93' : '#6D6D80')}
            />
          </View>
        )}
        
        <TextInput
          ref={ref}
          style={inputStyles}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          secureTextEntry={secureTextEntry && !showPassword}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          maxLength={maxLength}
          editable={editable}
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={togglePasswordVisibility}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={isDarkMode ? '#8E8E93' : '#6D6D80'}
            />
          </TouchableOpacity>
        )}
        
        {!secureTextEntry && rightIcon && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={isDarkMode ? '#8E8E93' : '#6D6D80'}
            />
          </TouchableOpacity>
        )}
        
        {maxLength && (
          <View style={styles.characterCount}>
            <Text style={[
              styles.characterCountText,
              { color: isDarkMode ? '#8E8E93' : '#6D6D80' },
              (value?.length || 0) > maxLength * 0.9 && { color: '#FF9500' },
              (value?.length || 0) >= maxLength && { color: '#FF3B30' },
            ]}>
              {value?.length || 0}/{maxLength}
            </Text>
          </View>
        )}
      </View>
      
      {error && (
        <Text style={[
          styles.errorText,
          errorStyle,
        ]}>
          {error}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  leftIconContainer: {
    position: 'absolute',
    left: 16,
    top: 12,
    zIndex: 1,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 16,
    top: 12,
    zIndex: 1,
  },
  characterCount: {
    position: 'absolute',
    right: 8,
    bottom: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  characterCountText: {
    fontSize: 10,
    fontWeight: '500',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
});

EnhancedTextInput.displayName = 'EnhancedTextInput';

export default EnhancedTextInput;
