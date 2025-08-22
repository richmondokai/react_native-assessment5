import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useDarkMode } from '../../hooks/useDarkMode';

const ExpoGoBanner = ({ feature = 'this feature' }) => {
  const { isDarkMode } = useDarkMode();
  const isExpoGo = Constants.appOwnership === 'expo';

  if (!isExpoGo) return null;

  const handleLearnMore = () => {
    Linking.openURL('https://docs.expo.dev/develop/development-builds/introduction/');
  };

  return (
    <View style={[styles.banner, { backgroundColor: isDarkMode ? '#2C2C2E' : '#FFF8E1' }]}>
      <View style={styles.content}>
        <Ionicons name="information-circle" size={20} color="#FF9500" />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            Development Mode
          </Text>
          <Text style={[styles.message, { color: isDarkMode ? '#E5E5E7' : '#3A3A3C' }]}>
            {feature} requires a development build or standalone app for full functionality.
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.learnMore} onPress={handleLearnMore}>
        <Text style={styles.learnMoreText}>Learn More</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  learnMore: {
    alignSelf: 'flex-start',
    marginLeft: 32,
  },
  learnMoreText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ExpoGoBanner;
