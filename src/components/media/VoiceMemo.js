import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  Animated
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useDarkMode } from '../../hooks/useDarkMode';

const VoiceMemo = ({ 
  attachments = [], 
  onAttachmentsChange, 
  maxRecordings = 5,
  style 
}) => {
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isRecordingStarted, setIsRecordingStarted] = useState(false);
  
  const recordingTimer = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      console.log('🎤 Cleaning up VoiceMemo component');
      // Only clean up if we're actually unmounting, not just re-rendering
      if (recordingTimer.current) {
        console.log('🎤 Clearing timer on unmount');
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      // Don't auto-stop recording on unmount - let user control it
      // The recording should only be stopped when user explicitly stops it
    };
  }, []); // Empty dependency array to prevent cleanup on every render

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need microphone access to record voice memos.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  };

  const openRecordingModal = () => {
    console.log('🎤 Opening recording modal...');
    if (attachments.filter(att => att.type === 'audio').length >= maxRecordings) {
      Alert.alert('Limit Reached', `You can only add up to ${maxRecordings} voice memos per note.`);
      return;
    }
    console.log('🎤 Setting modal state to open');
    setShowRecordingModal(true);
    setIsRecordingStarted(false);
    setRecordingDuration(0);
    console.log('🎤 Modal should now be visible');
  };

  const startRecording = async () => {
    console.log('🎤 Start recording button pressed');
    
    const hasPermission = await requestPermissions();
    console.log('🎤 Permission granted:', hasPermission);
    if (!hasPermission) return;

    try {
      console.log('🎤 Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('🎤 Creating recording with options...');
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      console.log('🎤 Recording created successfully:', !!newRecording);
      
      setRecording(newRecording);
      setIsRecording(true);
      setIsRecordingStarted(true);
      setRecordingDuration(0);
      
      console.log('🎤 Starting timer...');
      // Clear any existing timer first
      if (recordingTimer.current) {
        console.log('🎤 Clearing existing timer before starting new one');
        clearInterval(recordingTimer.current);
      }
      
      // Start the recording timer
      recordingTimer.current = setInterval(() => {
        console.log('🎤 Timer tick - checking if still recording');
        console.log('🎤 Current recording state:', !!recording);
        console.log('🎤 Current isRecording state:', isRecording);
        
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          console.log('🎤 Duration updated from', prev, 'to', newDuration);
          return newDuration;
        });
      }, 1000);
      
      console.log('🎤 Timer started with ID:', recordingTimer.current);
      
      // Test the timer immediately
      setTimeout(() => {
        console.log('🎤 Timer test after 1 second - Timer ID:', recordingTimer.current);
        console.log('🎤 Timer test - Recording state:', !!recording, 'isRecording:', isRecording);
      }, 1100);

      console.log('🎤 Starting pulse animation...');
      // Start pulse animation
      startPulseAnimation();

      console.log('🎤 Recording started successfully');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('🎤 Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    console.log('🎤 Stop recording button pressed');
    if (!recording) {
      console.log('🎤 No recording object found');
      return;
    }

    try {
      console.log('🎤 Stopping recording...');
      setIsRecording(false);
      setShowRecordingModal(false);
      
      if (recordingTimer.current) {
        console.log('🎤 Clearing timer...');
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }

      console.log('🎤 Getting recording URI before stopping...');
      const uri = recording.getURI();
      console.log('🎤 Got URI:', uri);
      
      console.log('🎤 Stopping and unloading recording...');
      await recording.stopAndUnloadAsync();
      console.log('🎤 Recording stopped successfully');
      console.log('🎤 Recording duration:', recordingDuration);
      
      if (uri) {
        // Save even if duration is 0 - let's see what we get
        const newAttachment = {
          id: Date.now().toString(),
          type: 'audio',
          uri: uri,
          duration: recordingDuration,
          name: `Voice Memo ${new Date().toLocaleTimeString()}`,
          metadata: {
            recordedAt: new Date().toISOString(),
            fileType: 'm4a',
            size: 0 // We'll get this later if needed
          }
        };

        console.log('🎤 Created attachment:', JSON.stringify(newAttachment, null, 2));
        const updatedAttachments = [...attachments, newAttachment];
        console.log('🎤 Total attachments after adding:', updatedAttachments.length);
        console.log('🎤 All attachments:', JSON.stringify(updatedAttachments, null, 2));
        
        onAttachmentsChange(updatedAttachments);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        console.log('🎤 Recording saved successfully to attachments');
      } else {
        console.log('🎤 Recording not saved - no URI available');
        console.log('🎤 Recording object:', recording);
        console.log('🎤 Duration was:', recordingDuration);
      }

      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
    }
  };

  const cancelRecording = async () => {
    console.log('🎤 Cancel recording button pressed');
    if (recording) {
      try {
        console.log('🎤 Canceling active recording...');
        setIsRecording(false);
        
        if (recordingTimer.current) {
          console.log('🎤 Clearing timer during cancel...');
          clearInterval(recordingTimer.current);
          recordingTimer.current = null;
        }

        await recording.stopAndUnloadAsync();
        setRecording(null);
        console.log('🎤 Recording cancelled and unloaded');
      } catch (error) {
        console.error('🎤 Error canceling recording:', error);
      }
    }
    
    setShowRecordingModal(false);
    setIsRecordingStarted(false);
    setRecordingDuration(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('🎤 Recording modal closed');
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const playAudio = async (attachment) => {
    try {
      // Stop any currently playing audio
      if (playingAudio) {
        await playingAudio.unloadAsync();
        setPlayingAudio(null);
        setPlayingId(null);
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: attachment.uri },
        { shouldPlay: true }
      );

      setPlayingAudio(sound);
      setPlayingId(attachment.id);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingAudio(null);
          setPlayingId(null);
          sound.unloadAsync();
        }
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play recording. Please try again.');
    }
  };

  const stopAudio = async () => {
    if (playingAudio) {
      await playingAudio.unloadAsync();
      setPlayingAudio(null);
      setPlayingId(null);
    }
  };

  const removeAttachment = (attachmentId) => {
    Alert.alert(
      'Remove Voice Memo',
      'Are you sure you want to remove this voice memo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // Stop playing if this audio is currently playing
            if (playingId === attachmentId) {
              stopAudio();
            }
            
            const updatedAttachments = attachments.filter(att => att.id !== attachmentId);
            onAttachmentsChange(updatedAttachments);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      ]
    );
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderVoiceMemo = ({ item }) => {
    const isPlaying = playingId === item.id;
    
    return (
      <View style={[
        styles.voiceMemoItem,
        isDarkMode && {
          backgroundColor: darkModeStyles.input.backgroundColor,
          borderColor: darkModeStyles.card.borderColor
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.playButton,
            isPlaying && styles.playButtonActive,
            isDarkMode && isPlaying && { backgroundColor: darkModeStyles.primary.backgroundColor }
          ]}
          onPress={isPlaying ? stopAudio : () => playAudio(item)}
        >
          <Ionicons 
            name={isPlaying ? "pause" : "play"} 
            size={20} 
            color={isPlaying ? "#FFFFFF" : "#007AFF"} 
          />
        </TouchableOpacity>
        
        <View style={styles.voiceMemoInfo}>
          <Text style={[
            styles.voiceMemoLabel,
            isDarkMode && { color: darkModeStyles.text.color }
          ]}>
            Voice Memo
          </Text>
          <Text style={[
            styles.voiceMemoDuration,
            isDarkMode && { color: darkModeStyles.subText.color }
          ]}>
            {formatDuration(item.duration)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.removeVoiceMemoButton}
          onPress={() => removeAttachment(item.id)}
        >
          <Ionicons name="trash" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    );
  };

  const audioAttachments = attachments.filter(att => att.type === 'audio');

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={[
          styles.headerText,
          isDarkMode && { color: darkModeStyles.text.color }
        ]}>
          Voice Memos ({audioAttachments.length}/{maxRecordings})
        </Text>
        
        <TouchableOpacity
          style={[
            styles.recordButton,
            isDarkMode && { backgroundColor: darkModeStyles.primary.backgroundColor },
            (audioAttachments.length >= maxRecordings || isRecording) && styles.recordButtonDisabled
          ]}
                  onPress={openRecordingModal}
        disabled={audioAttachments.length >= maxRecordings || isRecording}
        >
          <Ionicons name="mic" size={16} color="#FFFFFF" />
          <Text style={styles.recordButtonText}>Record</Text>
        </TouchableOpacity>
      </View>

      {audioAttachments.length > 0 && (
        <FlatList
          data={audioAttachments}
          renderItem={renderVoiceMemo}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}

      {audioAttachments.length === 0 && (
        <TouchableOpacity
          style={[
            styles.emptyState,
            isDarkMode && {
              backgroundColor: darkModeStyles.input.backgroundColor,
              borderColor: darkModeStyles.card.borderColor
            }
          ]}
          onPress={openRecordingModal}
        >
          <Ionicons 
            name="mic-outline" 
            size={32} 
            color={isDarkMode ? darkModeStyles.subText.color : '#CCC'} 
          />
          <Text style={[
            styles.emptyStateText,
            isDarkMode && { color: darkModeStyles.subText.color }
          ]}>
            Tap to record a voice memo
          </Text>
        </TouchableOpacity>
      )}

      {/* Recording Modal */}
      <Modal
        visible={showRecordingModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.recordingModalOverlay}>
          <View style={[
            styles.recordingModalContent,
            isDarkMode && { backgroundColor: darkModeStyles.card.backgroundColor }
          ]}>
            {!isRecordingStarted ? (
              <>
                <View style={styles.recordingIndicator}>
                  <Ionicons name="mic-outline" size={40} color="#FF3B30" />
                </View>
                
                <Text style={[
                  styles.recordingTitle,
                  isDarkMode && { color: darkModeStyles.text.color }
                ]}>
                  Ready to Record
                </Text>
                
                <Text style={[
                  styles.recordingSubtitle,
                  isDarkMode && { color: darkModeStyles.subText.color }
                ]}>
                  Tap start to begin recording your voice memo
                </Text>
                
                <View style={styles.recordingActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={cancelRecording}
                  >
                    <Ionicons name="close" size={24} color="#FF3B30" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.startButton,
                      isDarkMode && { backgroundColor: darkModeStyles.primary.backgroundColor }
                    ]}
                    onPress={startRecording}
                  >
                    <Ionicons name="play" size={24} color="#FFFFFF" />
                    <Text style={styles.startButtonText}>Start</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Animated.View 
                  style={[
                    styles.recordingIndicator,
                    { transform: [{ scale: pulseAnim }] }
                  ]}
                >
                  <Ionicons name="mic" size={40} color="#FF3B30" />
                </Animated.View>
                
                <Text style={[
                  styles.recordingTitle,
                  isDarkMode && { color: darkModeStyles.text.color }
                ]}>
                  Recording...
                </Text>
                
                <Text style={[
                  styles.recordingDuration,
                  isDarkMode && { color: darkModeStyles.subText.color }
                ]}>
                  {formatDuration(recordingDuration)}
                </Text>
                
                <View style={styles.recordingActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={cancelRecording}
                  >
                    <Ionicons name="close" size={24} color="#FF3B30" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.stopButton,
                      isDarkMode && { backgroundColor: darkModeStyles.primary.backgroundColor }
                    ]}
                    onPress={stopRecording}
                  >
                    <Ionicons name="stop" size={24} color="#FFFFFF" />
                    <Text style={styles.stopButtonText}>Stop</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  recordButtonDisabled: {
    backgroundColor: '#CCC',
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  voiceMemoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  playButtonActive: {
    backgroundColor: '#007AFF',
  },
  voiceMemoInfo: {
    flex: 1,
  },
  voiceMemoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  voiceMemoDuration: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  removeVoiceMemoButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F8F8',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  recordingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
    minWidth: 250,
  },
  recordingIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  recordingSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  recordingDuration: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    fontVariant: ['tabular-nums'],
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 20,
  },
  cancelButton: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  startButton: {
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  stopButton: {
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default VoiceMemo;
