import { StyleSheet, Platform } from 'react-native';

/**
 * iOS Human Interface Guidelines styling constants and components
 * Reference: https://developer.apple.com/design/human-interface-guidelines/
 */

// iOS Color System
export const IOSColors = {
  // System Colors
  systemBlue: '#007AFF',
  systemRed: '#FF3B30',
  systemOrange: '#FF9500',
  systemYellow: '#FFCC00',
  systemGreen: '#34C759',
  systemTeal: '#5AC8FA',
  systemIndigo: '#5856D6',
  systemPurple: '#AF52DE',
  systemPink: '#FF2D92',
  
  // Gray Colors
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',
  
  // Label Colors
  label: '#000000',
  secondaryLabel: '#3C3C43',
  tertiaryLabel: '#3C3C43',
  quaternaryLabel: '#2C2C2E',
  
  // Fill Colors
  systemFill: '#78788033',
  secondarySystemFill: '#78788028',
  tertiarySystemFill: '#7676801F',
  quaternarySystemFill: '#74748014',
  
  // Background Colors
  systemBackground: '#FFFFFF',
  secondarySystemBackground: '#F2F2F7',
  tertiarySystemBackground: '#FFFFFF',
  
  // Grouped Background Colors
  systemGroupedBackground: '#F2F2F7',
  secondarySystemGroupedBackground: '#FFFFFF',
  tertiarySystemGroupedBackground: '#F2F2F7',
  
  // Separator Colors
  separator: '#C6C6C8',
  opaqueSeparator: '#C6C6C8',
};

// iOS Typography Scale
export const IOSTypography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 25,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  body: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 22,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 21,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 13,
  },
};

// iOS Spacing System
export const IOSSpacing = {
  // Standard iOS spacing values
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
  
  // Specific iOS spacing
  listItemHeight: 44,
  sectionHeaderHeight: 35,
  navigationBarHeight: 44,
  tabBarHeight: 49,
  statusBarHeight: 20,
  safeAreaPadding: 16,
};

// Common iOS Styles
export const IOSCommonStyles = StyleSheet.create({
  // Container Styles
  screenContainer: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? IOSColors.systemGroupedBackground : '#f8f8f8',
  },
  
  // Section Styles
  sectionContainer: {
    backgroundColor: Platform.OS === 'ios' ? IOSColors.secondarySystemGroupedBackground : '#fff',
    marginHorizontal: Platform.OS === 'ios' ? 0 : 16,
    marginBottom: Platform.OS === 'ios' ? IOSSpacing.xl : IOSSpacing.sm,
    borderRadius: Platform.OS === 'ios' ? 0 : 8,
    ...Platform.select({
      ios: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: IOSColors.separator,
      },
      android: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }
    }),
  },
  
  sectionHeader: {
    fontSize: Platform.OS === 'ios' ? 13 : 18,
    fontWeight: Platform.OS === 'ios' ? '400' : 'bold',
    textTransform: Platform.OS === 'ios' ? 'uppercase' : 'none',
    letterSpacing: Platform.OS === 'ios' ? 0.8 : 0,
    marginTop: Platform.OS === 'ios' ? IOSSpacing.xl : IOSSpacing.lg,
    marginBottom: Platform.OS === 'ios' ? 6 : IOSSpacing.sm,
    paddingHorizontal: IOSSpacing.md,
    color: Platform.OS === 'ios' ? IOSColors.systemGray : '#333',
  },
  
  // List Item Styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 11 : 14,
    paddingHorizontal: IOSSpacing.md,
    minHeight: Platform.OS === 'ios' ? IOSSpacing.listItemHeight : undefined,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Platform.OS === 'ios' ? IOSColors.separator : '#f0f0f0',
  },
  
  listItemText: {
    ...Platform.select({
      ios: IOSTypography.body,
      android: { fontSize: 16, fontWeight: 'normal' }
    }),
    color: Platform.OS === 'ios' ? IOSColors.label : '#333',
  },
  
  listItemIcon: {
    marginRight: IOSSpacing.md,
    width: 29,
    textAlign: 'center',
  },
  
  // Form Styles
  formContainer: {
    backgroundColor: Platform.OS === 'ios' ? IOSColors.secondarySystemGroupedBackground : '#fff',
    marginHorizontal: Platform.OS === 'ios' ? 0 : IOSSpacing.md,
    borderRadius: Platform.OS === 'ios' ? 0 : 12,
    ...Platform.select({
      ios: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: IOSColors.separator,
      }
    }),
  },
  
  inputLabel: {
    ...Platform.select({
      ios: IOSTypography.body,
      android: { fontSize: 16, fontWeight: '600' }
    }),
    marginBottom: IOSSpacing.sm,
    color: Platform.OS === 'ios' ? IOSColors.label : '#333',
  },
  
  textInput: {
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderRadius: Platform.OS === 'ios' ? 10 : 12,
    paddingHorizontal: IOSSpacing.md,
    paddingVertical: IOSSpacing.md,
    ...Platform.select({
      ios: {
        ...IOSTypography.body,
        minHeight: IOSSpacing.listItemHeight,
      },
      android: {
        fontSize: 16,
      }
    }),
    borderColor: Platform.OS === 'ios' ? IOSColors.separator : '#E5E5EA',
  },
  
  // Button Styles
  primaryButton: {
    height: Platform.OS === 'ios' ? IOSSpacing.listItemHeight : 50,
    borderRadius: Platform.OS === 'ios' ? 8 : 12,
    backgroundColor: IOSColors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  primaryButtonText: {
    color: '#FFFFFF',
    ...Platform.select({
      ios: {
        ...IOSTypography.body,
        fontWeight: '600',
      },
      android: {
        fontSize: 16,
        fontWeight: '600',
      }
    }),
  },
  
  secondaryButton: {
    height: Platform.OS === 'ios' ? IOSSpacing.listItemHeight : 50,
    borderRadius: Platform.OS === 'ios' ? 8 : 12,
    borderWidth: Platform.OS === 'ios' ? StyleSheet.hairlineWidth : 1,
    borderColor: IOSColors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  
  secondaryButtonText: {
    color: IOSColors.systemBlue,
    ...Platform.select({
      ios: {
        ...IOSTypography.body,
        fontWeight: '600',
      },
      android: {
        fontSize: 16,
        fontWeight: '600',
      }
    }),
  },
  
  // Navigation Styles
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: IOSSpacing.md,
    paddingVertical: Platform.OS === 'ios' ? IOSSpacing.sm : IOSSpacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Platform.OS === 'ios' ? IOSColors.separator : '#E5E5EA',
    backgroundColor: Platform.OS === 'ios' ? IOSColors.tertiarySystemBackground : undefined,
  },
  
  navigationTitle: {
    flex: 1,
    textAlign: 'center',
    ...Platform.select({
      ios: {
        ...IOSTypography.headline,
      },
      android: {
        fontSize: 18,
        fontWeight: '600',
      }
    }),
  },
  
  // Card Styles
  card: {
    backgroundColor: Platform.OS === 'ios' ? IOSColors.secondarySystemGroupedBackground : '#fff',
    borderRadius: Platform.OS === 'ios' ? 10 : 12,
    padding: IOSSpacing.md,
    marginHorizontal: IOSSpacing.md,
    marginVertical: IOSSpacing.sm,
    ...Platform.select({
      ios: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: IOSColors.separator,
      },
      android: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }
    }),
  },
  
  // Helper Styles
  hairlineWidth: StyleSheet.hairlineWidth,
  
  // iOS-specific shadows
  iosShadow: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    },
    android: {
      elevation: 2,
    }
  }),
});

// Helper functions
export const createIOSStyle = (iosStyle, androidStyle = {}) => {
  return Platform.select({
    ios: iosStyle,
    android: androidStyle,
  });
};

export const getIOSColor = (colorName, fallback = '#000000') => {
  return Platform.OS === 'ios' ? IOSColors[colorName] || fallback : fallback;
};

export const getIOSSpacing = (spacingName) => {
  return IOSSpacing[spacingName] || 0;
};

export const applyIOSTypography = (textStyle) => {
  if (Platform.OS === 'ios' && IOSTypography[textStyle]) {
    return IOSTypography[textStyle];
  }
  return {};
};

export default {
  IOSColors,
  IOSTypography,
  IOSSpacing,
  IOSCommonStyles,
  createIOSStyle,
  getIOSColor,
  getIOSSpacing,
  applyIOSTypography,
};
