import React, { useState, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useDarkMode } from '../../hooks/useDarkMode';

const LikeButton = ({
  isLiked = false,
  likeCount = 0,
  onPress,
  size = 'medium',
  disabled = false,
  showCount = true,
  style,
}) => {
  const { isDarkMode } = useDarkMode();
  const [isAnimating, setIsAnimating] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartScaleAnim = useRef(new Animated.Value(1)).current;

  const getSizes = () => {
    switch (size) {
      case 'small':
        return { iconSize: 16, fontSize: 12 };
      case 'medium':
        return { iconSize: 20, fontSize: 14 };
      case 'large':
        return { iconSize: 24, fontSize: 16 };
      default:
        return { iconSize: 20, fontSize: 14 };
    }
  };

  const { iconSize, fontSize } = getSizes();

  const handlePress = async () => {
    if (disabled || isAnimating) return;

    try {
      setIsAnimating(true);

      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Button scale animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Heart animation for likes
      if (!isLiked) {
        Animated.sequence([
          Animated.timing(heartScaleAnim, {
            toValue: 1.3,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(heartScaleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // Call the onPress handler
      if (onPress) {
        await onPress();
      }
    } catch (error) {
      console.error('Error handling like button press:', error);
    } finally {
      setIsAnimating(false);
    }
  };

  const getIconColor = () => {
    if (disabled) {
      return isDarkMode ? '#48484A' : '#C7C7CC';
    }
    if (isLiked) {
      return '#FF3B30';
    }
    return isDarkMode ? '#8E8E93' : '#6D6D80';
  };

  const getTextColor = () => {
    if (disabled) {
      return isDarkMode ? '#48484A' : '#C7C7CC';
    }
    if (isLiked) {
      return '#FF3B30';
    }
    return isDarkMode ? '#8E8E93' : '#6D6D80';
  };

  const formatLikeCount = (count) => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}k`;
    return `${(count / 1000000).toFixed(1)}m`;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.container,
          {
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ scale: heartScaleAnim }] }}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={iconSize}
            color={getIconColor()}
          />
        </Animated.View>
        
        {showCount && (
          <Text style={[
            styles.countText,
            {
              fontSize,
              color: getTextColor(),
              marginLeft: size === 'small' ? 4 : 6,
            }
          ]}>
            {formatLikeCount(likeCount)}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countText: {
    fontWeight: '600',
  },
});

export default LikeButton;
