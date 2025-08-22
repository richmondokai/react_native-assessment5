import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDarkMode } from '../../hooks/useDarkMode';
import * as Haptics from 'expo-haptics';

const CATEGORIES_STORAGE_KEY = 'USER_CATEGORIES';

const defaultCategories = [
  { name: 'Personal', icon: 'person-outline', color: '#2196F3', isDefault: true },
  { name: 'Work', icon: 'briefcase-outline', color: '#4CAF50', isDefault: true },
  { name: 'Ideas', icon: 'bulb-outline', color: '#FF9800', isDefault: true },
  { name: 'To-Do', icon: 'checkbox-outline', color: '#9C27B0', isDefault: true },
];

const availableIcons = [
  'person-outline', 'briefcase-outline', 'bulb-outline', 'checkbox-outline',
  'heart-outline', 'star-outline', 'home-outline', 'car-outline',
  'airplane-outline', 'camera-outline', 'musical-notes-outline', 'book-outline',
  'restaurant-outline', 'fitness-outline', 'medical-outline', 'school-outline',
  'wallet-outline', 'gift-outline', 'trophy-outline', 'game-controller-outline'
];

const availableColors = [
  '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#795548',
  '#607D8B', '#E91E63', '#3F51B5', '#00BCD4', '#8BC34A', '#FFEB3B',
  '#FF5722', '#9E9E9E', '#673AB7', '#009688', '#FFC107', '#CDDC39'
];

const CategoryManager = ({ 
  selectedCategory, 
  onCategoryChange, 
  style,
  showManagement = true 
}) => {
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const [categories, setCategories] = useState(defaultCategories);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder-outline');
  const [selectedColor, setSelectedColor] = useState('#2196F3');
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const stored = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (stored) {
        const parsedCategories = JSON.parse(stored);
        setCategories(parsedCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const saveCategories = async (newCategories) => {
    try {
      await AsyncStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories));
      setCategories(newCategories);
    } catch (error) {
      console.error('Error saving categories:', error);
      Alert.alert('Error', 'Failed to save category changes');
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a category name');
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === newCategoryName.toLowerCase())) {
      Alert.alert('Duplicate Category', 'A category with this name already exists');
      return;
    }

    const newCategory = {
      name: newCategoryName.trim(),
      icon: selectedIcon,
      color: selectedColor,
      isDefault: false,
      id: Date.now().toString()
    };

    const updatedCategories = [...categories, newCategory];
    await saveCategories(updatedCategories);
    
    setNewCategoryName('');
    setSelectedIcon('folder-outline');
    setSelectedColor('#2196F3');
    setShowAddModal(false);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Category added successfully');
  };

  const handleEditCategory = (category) => {
    if (category.isDefault) {
      Alert.alert('Cannot Edit', 'Default categories cannot be modified');
      return;
    }
    
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setSelectedIcon(category.icon);
    setSelectedColor(category.color);
    setShowAddModal(true);
  };

  const handleUpdateCategory = async () => {
    if (!newCategoryName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a category name');
      return;
    }

    if (categories.some(cat => 
      cat.name.toLowerCase() === newCategoryName.toLowerCase() && 
      cat.id !== editingCategory.id
    )) {
      Alert.alert('Duplicate Category', 'A category with this name already exists');
      return;
    }

    const updatedCategories = categories.map(cat => 
      cat.id === editingCategory.id 
        ? { ...cat, name: newCategoryName.trim(), icon: selectedIcon, color: selectedColor }
        : cat
    );

    await saveCategories(updatedCategories);
    
    setEditingCategory(null);
    setNewCategoryName('');
    setSelectedIcon('folder-outline');
    setSelectedColor('#2196F3');
    setShowAddModal(false);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Category updated successfully');
  };

  const handleDeleteCategory = async (category) => {
    if (category.isDefault) {
      Alert.alert('Cannot Delete', 'Default categories cannot be deleted');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedCategories = categories.filter(cat => cat.id !== category.id);
            await saveCategories(updatedCategories);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
      ]
    );
  };

  const handleCategorySelect = (category) => {
    onCategoryChange(category.name);
    setShowModal(false);
    Haptics.selectionAsync();
  };

  const selectedCategoryData = categories.find(cat => cat.name === selectedCategory) || categories[0];

  return (
    <View style={style}>
      {/* Category Selector */}
      <TouchableOpacity
        style={[
          styles.categorySelector,
          isDarkMode && {
            backgroundColor: darkModeStyles.input.backgroundColor,
            borderColor: darkModeStyles.input.borderColor
          }
        ]}
        onPress={() => setShowModal(true)}
      >
        <Ionicons 
          name={selectedCategoryData.icon} 
          size={20} 
          color={selectedCategoryData.color} 
        />
        <Text style={[
          styles.categoryText,
          isDarkMode && { color: darkModeStyles.text.color }
        ]}>
          {selectedCategoryData.name}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color={isDarkMode ? darkModeStyles.subText.color : '#666'} 
        />
      </TouchableOpacity>

      {/* Category Selection Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            isDarkMode && { backgroundColor: darkModeStyles.card.backgroundColor }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[
                styles.modalTitle,
                isDarkMode && { color: darkModeStyles.text.color }
              ]}>
                Select Category
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={isDarkMode ? darkModeStyles.text.color : '#000'} 
                />
              </TouchableOpacity>
            </View>

            <FlatList
              data={categories}
              keyExtractor={(item) => item.id || item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    selectedCategory === item.name && styles.selectedCategoryOption,
                    isDarkMode && { backgroundColor: darkModeStyles.input.backgroundColor },
                    selectedCategory === item.name && isDarkMode && { backgroundColor: darkModeStyles.primary.backgroundColor }
                  ]}
                  onPress={() => handleCategorySelect(item)}
                >
                  <View style={styles.categoryOptionLeft}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                    <Text style={[
                      styles.categoryOptionText,
                      selectedCategory === item.name && styles.selectedCategoryOptionText,
                      isDarkMode && { color: darkModeStyles.text.color },
                      selectedCategory === item.name && isDarkMode && { color: '#FFFFFF' }
                    ]}>
                      {item.name}
                    </Text>
                  </View>
                  
                  {showManagement && !item.isDefault && (
                    <View style={styles.categoryActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setShowModal(false);
                          setTimeout(() => handleEditCategory(item), 300);
                        }}
                      >
                        <Ionicons name="pencil" size={16} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setShowModal(false);
                          setTimeout(() => handleDeleteCategory(item), 300);
                        }}
                      >
                        <Ionicons name="trash" size={16} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />

            {showManagement && (
              <TouchableOpacity
                style={[
                  styles.addCategoryButton,
                  isDarkMode && { backgroundColor: darkModeStyles.primary.backgroundColor }
                ]}
                onPress={() => {
                  setShowModal(false);
                  setTimeout(() => setShowAddModal(true), 300);
                }}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addCategoryText}>Add New Category</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Add/Edit Category Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[
            styles.modalContent,
            isDarkMode && { backgroundColor: darkModeStyles.card.backgroundColor }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[
                styles.modalTitle,
                isDarkMode && { color: darkModeStyles.text.color }
              ]}>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowAddModal(false);
                setEditingCategory(null);
                setNewCategoryName('');
              }}>
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={isDarkMode ? darkModeStyles.text.color : '#000'} 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <Text style={[
                styles.fieldLabel,
                isDarkMode && { color: darkModeStyles.text.color }
              ]}>
                Category Name
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  isDarkMode && {
                    backgroundColor: darkModeStyles.input.backgroundColor,
                    borderColor: darkModeStyles.input.borderColor,
                    color: darkModeStyles.text.color
                  }
                ]}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Enter category name"
                placeholderTextColor={isDarkMode ? '#8E8E93' : '#999'}
                autoFocus
              />

              <Text style={[
                styles.fieldLabel,
                isDarkMode && { color: darkModeStyles.text.color }
              ]}>
                Icon
              </Text>
              <FlatList
                data={availableIcons}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.iconOption,
                      selectedIcon === item && styles.selectedIconOption,
                      isDarkMode && { backgroundColor: darkModeStyles.input.backgroundColor },
                      selectedIcon === item && isDarkMode && { backgroundColor: darkModeStyles.primary.backgroundColor }
                    ]}
                    onPress={() => setSelectedIcon(item)}
                  >
                    <Ionicons 
                      name={item} 
                      size={24} 
                      color={selectedIcon === item ? '#FFFFFF' : (isDarkMode ? darkModeStyles.text.color : '#666')} 
                    />
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.iconsContainer}
              />

              <Text style={[
                styles.fieldLabel,
                isDarkMode && { color: darkModeStyles.text.color }
              ]}>
                Color
              </Text>
              <FlatList
                data={availableColors}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                numColumns={3}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.colorOption,
                      { backgroundColor: item },
                      selectedColor === item && styles.selectedColorOption
                    ]}
                    onPress={() => setSelectedColor(item)}
                  >
                    {selectedColor === item && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.colorsContainer}
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  isDarkMode && { backgroundColor: darkModeStyles.primary.backgroundColor }
                ]}
                onPress={editingCategory ? handleUpdateCategory : handleAddCategory}
              >
                <Text style={styles.saveButtonText}>
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedCategoryOption: {
    backgroundColor: '#007AFF',
  },
  categoryOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#000',
  },
  selectedCategoryOptionText: {
    color: '#FFFFFF',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  addCategoryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    padding: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  iconsContainer: {
    paddingVertical: 8,
    gap: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    marginRight: 8,
  },
  selectedIconOption: {
    backgroundColor: '#007AFF',
  },
  colorsContainer: {
    paddingVertical: 8,
    gap: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#000',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CategoryManager;
