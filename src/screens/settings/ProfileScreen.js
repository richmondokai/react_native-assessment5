import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useNotes } from '../../context/NotesContext';
import { NOTES_KEY, USER_KEY, BASE_URL } from '../../constants';
import { getLocalNotes } from '../../services/notes_local_services';

const ProfileScreen = ({ navigation }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // User profile data
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john.doe@example.com');
  const [bio, setBio] = useState('I love taking notes and staying organized!');
  const [profilePicture, setProfilePicture] = useState(null);
  
  // Stats data
  const [stats, setStats] = useState({
    totalNotes: 0,
    favoriteNotes: 0,
    categories: 0
  });
  
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const { logout, user } = useAuth();
  const { notes } = useNotes();
  
  // Track last refresh time to prevent excessive refreshing
  const lastRefreshTimeRef = useRef(0);
  const DEBOUNCE_TIME = 2000; // 2 seconds
  
  // Safety timeout to prevent stuck loading state
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (isSaving) {
        console.log('Safety timeout triggered - forcing saving state off');
        setIsSaving(false);
      }
    }, 10000); // 10 second safety timeout
    
    return () => clearTimeout(safetyTimeout);
  }, [isSaving]);
  
  // Set navigation options
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true
    });
  }, [navigation]);
  
  // Load profile data and stats on component mount
  useEffect(() => {
    loadProfileData();
    loadStatsData();
    
    // Set up a listener for when we return to this screen to refresh stats
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('=== PROFILE SCREEN FOCUS LISTENER ===');
      console.log('ProfileScreen focused - checking if stats need refresh');
      
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
      
      // Only refresh if we haven't refreshed recently to avoid interfering with real-time updates
      if (timeSinceLastRefresh > DEBOUNCE_TIME) {
        lastRefreshTimeRef.current = now;
        console.log('Refreshing stats on focus');
        loadStatsData(); // Refresh stats when returning to screen
      } else {
        console.log(`Skipping stats refresh - last refresh was ${timeSinceLastRefresh}ms ago`);
        // Even if we skip the refresh, ensure stats are up to date from notes context
        if (user && Array.isArray(notes)) {
          console.log('Updating stats from notes context on focus (skipped refresh)');
          // The real-time effect will handle the update
        }
      }
      console.log('=== END PROFILE SCREEN FOCUS LISTENER ===');
    });

    return unsubscribe;
  }, [navigation]);

  // Real-time stats update when notes change
  useEffect(() => {
    console.log('=== PROFILE SCREEN STATS UPDATE EFFECT ===');
    console.log('ProfileScreen: Notes or user changed, updating stats');
    console.log('Notes count:', notes?.length || 0);
    console.log('User:', user?.email || user?.id);
    
    // Directly update stats when notes change
    if (user && Array.isArray(notes)) {
      if (notes.length > 0) {
        console.log('Updating stats from notes context:', notes.length);
        
        const totalNotes = notes.length;
        const favoriteNotes = notes.filter(note => note && note.isFavorite).length;
        
        // Get unique categories
        const categoriesSet = new Set();
        notes.forEach(note => {
          if (note && note.category) {
            categoriesSet.add(note.category);
          }
        });
        const categories = categoriesSet.size;
        
        const newStats = {
          totalNotes,
          favoriteNotes,
          categories
        };
        
        // Only update if the stats actually changed
        const currentStatsString = JSON.stringify(stats);
        const newStatsString = JSON.stringify(newStats);
        
        if (currentStatsString !== newStatsString) {
          console.log('Stats changed - updating state');
          console.log('Old stats:', stats);
          console.log('New stats:', newStats);
          setStats(newStats);
        } else {
          console.log('Stats unchanged - skipping update');
        }
      } else {
        // No notes, set empty stats
        const emptyStats = { totalNotes: 0, favoriteNotes: 0, categories: 0 };
        const currentStatsString = JSON.stringify(stats);
        const newStatsString = JSON.stringify(emptyStats);
        
        if (currentStatsString !== newStatsString) {
          console.log('Stats changed to empty - updating state');
          setStats(emptyStats);
        }
      }
    }
    console.log('=== END PROFILE SCREEN STATS UPDATE EFFECT ===');
  }, [notes, user, stats]); // Depend on notes, user, and stats for change detection

  // Additional effect to track when stats change
  useEffect(() => {
    console.log('=== PROFILE SCREEN STATS CHANGE EFFECT ===');
    console.log('Stats state changed:', stats);
    console.log('Current stats:', {
      totalNotes: stats.totalNotes,
      favoriteNotes: stats.favoriteNotes,
      categories: stats.categories
    });
    console.log('=== END PROFILE SCREEN STATS CHANGE EFFECT ===');
  }, [stats]);
  
  const loadProfileData = async () => {
    try {
      console.log('=== PROFILE SCREEN DEBUG ===');
      console.log('Loading profile from USER_KEY:', USER_KEY);
      
      // Try to load from AsyncStorage first (use same key as AuthContext)
      const storedProfile = await AsyncStorage.getItem(USER_KEY);
      if (storedProfile) {
        const profileData = JSON.parse(storedProfile);
        console.log('Found stored profile:', profileData);
        console.log('Profile bio:', profileData.bio);
        console.log('Profile picture:', profileData.profilePicture);
        console.log('Profile picture type:', typeof profileData.profilePicture);
        console.log('Profile picture length:', profileData.profilePicture?.length);
        if (profileData.profilePicture) {
          console.log('Profile picture starts with:', profileData.profilePicture.substring(0, 50));
        }
        setName(profileData.name || 'John Doe');
        setEmail(profileData.email || 'john.doe@example.com');
        setBio(profileData.bio || 'I love taking notes and staying organized!');
        setProfilePicture(profileData.profilePicture || null);
      } else if (user) {
        // Use auth context user data if available
        console.log('Using auth context user data:', user);
        console.log('Auth profile picture:', user.profilePicture);
        console.log('Auth picture type:', typeof user.profilePicture);
        console.log('Auth picture length:', user.profilePicture?.length);
        if (user.profilePicture) {
          console.log('Auth picture starts with:', user.profilePicture.substring(0, 50));
        }
        setName(user.name || user.username || 'John Doe');
        setEmail(user.email || 'john.doe@example.com');
        setBio(user.bio || 'I love taking notes and staying organized!');
        setProfilePicture(user.profilePicture || null);
      }
      console.log('=== END PROFILE LOAD DEBUG ===');
    } catch (error) {
      console.log('Error loading profile:', error);
    }
  };
  
  // Function to get initials from name
  const getInitials = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return 'JD';
    
    const nameParts = fullName.trim().split(' ').filter(part => part.length > 0);
    if (nameParts.length === 0) return 'JD';
    
    if (nameParts.length === 1) {
      // Single name - take first two characters
      return nameParts[0].substring(0, 2).toUpperCase();
    }
    
    // Multiple names - take first letter of first and last name
    const firstInitial = nameParts[0].charAt(0);
    const lastInitial = nameParts[nameParts.length - 1].charAt(0);
    return (firstInitial + lastInitial).toUpperCase();
  };

  // Function to get complete image URL
  const getCompleteImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath; // Already complete URL
    return `${BASE_URL}${imagePath}`; // Add base URL to relative path
  };
  
  const loadStatsData = async () => {
    try {
      console.log('=== LOAD STATS FUNCTION CALLED ===');
      console.log('loadStatsData called');
      console.log('=== LOADING PROFILE STATS ===');
      const userId = user?.email || user?.id;
      
      if (!userId) {
        console.log('No user ID available for stats');
        setStats({ totalNotes: 0, favoriteNotes: 0, categories: 0 });
        return;
      }
      
      console.log('Loading stats for user:', userId);
      const notesArray = await getLocalNotes(userId);
      
      if (notesArray && notesArray.length > 0) {
        console.log('Found notes for stats:', notesArray.length);
        
        const totalNotes = notesArray.length;
        const favoriteNotes = notesArray.filter(note => note.isFavorite).length;
        
        // Get unique categories
        const categoriesSet = new Set();
        notesArray.forEach(note => {
          if (note.category) {
            categoriesSet.add(note.category);
          }
        });
        const categories = categoriesSet.size;
        
        const statsData = {
          totalNotes,
          favoriteNotes,
          categories
        };
        
        console.log('Calculated stats:', statsData);
        setStats(statsData);
      } else {
        console.log('No notes found for stats');
      }
      console.log('=== END PROFILE STATS DEBUG ===');
    } catch (error) {
      console.log('Error loading stats:', error);
    }
  };
  
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Error', 'Email cannot be empty');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // In a real app, this would be sent to an API
      // For this demo, we'll just simulate saving
      const userProfile = {
        name,
        email,
        bio
      };
      
      console.log('=== SAVING PROFILE ===');
      console.log('Profile data to save:', userProfile);
      await AsyncStorage.setItem('USER_PROFILE', JSON.stringify(userProfile));
      console.log('Profile saved successfully');
      console.log('=== END SAVE PROFILE ===');
      
      // Simulate API delay
      setTimeout(() => {
        setIsSaving(false);
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      }, 1000);
    } catch (error) {
      console.log('Error saving profile:', error);
      setIsSaving(false);
      Alert.alert('Error', 'Failed to update profile');
    }
  };
  
  const handleChangePassword = () => {
    // Navigate to ChangePassword screen in the Settings stack
    navigation.navigate('Settings', { 
      screen: 'ChangePassword' 
    });
  };
  
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await logout();
              // The AuthContext will update isAuthenticated and AppNavigator will show auth screens
              Alert.alert('Success', 'You have been logged out');
            } catch (error) {
              console.log('Error logging out:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, darkModeStyles.container]}>
      <View style={[styles.header, isDarkMode && { 
        backgroundColor: darkModeStyles.card.backgroundColor,
        borderBottomColor: darkModeStyles.separator.backgroundColor 
      }]}>
        <View style={styles.profileImageContainer}>
          <View style={styles.profileImage}>
            {profilePicture ? (
              <Image 
                source={{ uri: getCompleteImageUrl(profilePicture) }} 
                style={styles.profileImagePicture}
                onError={(error) => {
                  console.log('=== PROFILE PICTURE ERROR ===');
                  console.log('Profile picture failed to load:', profilePicture);
                  console.log('Error details:', error.nativeEvent);
                  console.log('=== END PROFILE PICTURE ERROR ===');
                  setProfilePicture(null);
                }}
                onLoad={() => {
                  console.log('Profile picture loaded successfully:', profilePicture);
                }}
                onLoadStart={() => {
                  console.log('Profile picture load started:', profilePicture);
                }}
              />
            ) : (
              <Text style={styles.profileInitials}>{getInitials(name)}</Text>
            )}
          </View>
          {isEditing && (
            <TouchableOpacity style={styles.changePhotoButton}>
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        
        {!isEditing ? (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setIsEditing(false)}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <View style={[styles.profileInfo, isDarkMode && { 
        backgroundColor: darkModeStyles.card.backgroundColor,
        borderColor: darkModeStyles.card.borderColor
      }]}>
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, isDarkMode && { color: darkModeStyles.subText.color }]}>Name</Text>
          {isEditing ? (
            <TextInput
              style={[styles.infoInput, isDarkMode && { 
                borderColor: darkModeStyles.separator.backgroundColor,
                backgroundColor: '#2c2c2c',
                color: darkModeStyles.text.color
              }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
            />
          ) : (
            <Text style={[styles.infoValue, isDarkMode && { color: darkModeStyles.text.color }]}>{name}</Text>
          )}
        </View>
        
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, isDarkMode && { color: darkModeStyles.subText.color }]}>Email</Text>
          {isEditing ? (
            <TextInput
              style={[styles.infoInput, isDarkMode && { 
                borderColor: darkModeStyles.separator.backgroundColor,
                backgroundColor: '#2c2c2c',
                color: darkModeStyles.text.color
              }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : (
            <Text style={[styles.infoValue, isDarkMode && { color: darkModeStyles.text.color }]}>{email}</Text>
          )}
        </View>
        
        <View style={styles.infoItem}>
          <Text style={[styles.infoLabel, isDarkMode && { color: darkModeStyles.subText.color }]}>Bio</Text>
          {isEditing ? (
            <TextInput
              style={[styles.infoInput, styles.bioInput, isDarkMode && { 
                borderColor: darkModeStyles.separator.backgroundColor,
                backgroundColor: '#2c2c2c',
                color: darkModeStyles.text.color
              }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ) : (
            <Text style={[styles.infoValue, isDarkMode && { color: darkModeStyles.text.color }]}>{bio}</Text>
          )}
        </View>
      </View>
      
      <View style={[styles.accountActions, isDarkMode && { 
        backgroundColor: darkModeStyles.card.backgroundColor,
        borderColor: darkModeStyles.card.borderColor
      }]}>
        <TouchableOpacity 
          style={[styles.accountActionButton, isDarkMode && { 
            borderBottomColor: darkModeStyles.separator.backgroundColor 
          }]}
          onPress={handleChangePassword}
        >
          <Ionicons name="key-outline" size={22} color={isDarkMode ? "#4a9eff" : "#007AFF"} style={styles.actionIcon} />
          <Text style={[styles.actionText, isDarkMode && { color: darkModeStyles.text.color }]}>Change Password</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.accountActionButton, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="#FF3B30" style={styles.actionIcon} />
          <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.statsContainer, isDarkMode && { 
        backgroundColor: darkModeStyles.card.backgroundColor,
        borderColor: darkModeStyles.card.borderColor
      }]}>
        <Text style={[styles.statsTitle, isDarkMode && { color: darkModeStyles.text.color }]}>Your Stats</Text>
        
        {(() => {
          console.log('=== PROFILE SCREEN STATS RENDER ===');
          console.log('Rendering stats section');
          console.log('Current stats:', stats);
          console.log('Notes from context:', notes?.length || 0);
          console.log('Notes with favorites:', notes?.filter(n => n?.isFavorite)?.length || 0);
          console.log('Notes with categories:', notes?.map(n => n?.category).filter(Boolean) || []);
          console.log('=== END STATS RENDER DEBUG ===');
          
          return (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, isDarkMode && { color: "#4a9eff" }]}>{stats.totalNotes}</Text>
                <Text style={[styles.statLabel, isDarkMode && { color: darkModeStyles.subText.color }]}>Notes</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, isDarkMode && { color: "#4a9eff" }]}>{stats.favoriteNotes}</Text>
                <Text style={[styles.statLabel, isDarkMode && { color: darkModeStyles.subText.color }]}>Favorites</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, isDarkMode && { color: "#4a9eff" }]}>{stats.categories}</Text>
                <Text style={[styles.statLabel, isDarkMode && { color: darkModeStyles.subText.color }]}>Categories</Text>
              </View>
            </View>
          );
        })()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImagePicture: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profileInitials: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#555',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  editActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#555',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#a0c8ff',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  profileInfo: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  infoInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  accountActions: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  accountActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutButton: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
  },
  logoutText: {
    color: '#FF3B30',
  },
  statsContainer: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 30,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    padding: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
});

export default ProfileScreen;
