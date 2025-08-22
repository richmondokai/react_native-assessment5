import * as Haptics from 'expo-haptics';

export class HapticUtils {
  static async light() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error with light haptic:', error);
    }
  }

  static async medium() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error with medium haptic:', error);
    }
  }

  static async heavy() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.error('Error with heavy haptic:', error);
    }
  }

  static async selection() {
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.error('Error with selection haptic:', error);
    }
  }

  static async success() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error with success haptic:', error);
    }
  }

  static async warning() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.error('Error with warning haptic:', error);
    }
  }

  static async error() {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.error('Error with error haptic:', error);
    }
  }

  // Button press feedback
  static async buttonPress(type = 'light') {
    switch (type) {
      case 'light':
        return this.light();
      case 'medium':
        return this.medium();
      case 'heavy':
        return this.heavy();
      default:
        return this.light();
    }
  }

  // List item selection
  static async listSelection() {
    return this.selection();
  }

  // Toggle switch
  static async toggle() {
    return this.selection();
  }

  // Like button animation
  static async like() {
    return this.light();
  }

  // Photo capture
  static async photoCapture() {
    return this.medium();
  }

  // Form validation success
  static async validationSuccess() {
    return this.success();
  }

  // Form validation error
  static async validationError() {
    return this.error();
  }

  // Navigation feedback
  static async navigate() {
    return this.light();
  }

  // Delete action
  static async delete() {
    return this.warning();
  }

  // Save action
  static async save() {
    return this.success();
  }

  // Refresh action
  static async refresh() {
    return this.light();
  }

  // Location found
  static async locationFound() {
    return this.success();
  }

  // Permission granted
  static async permissionGranted() {
    return this.success();
  }

  // Permission denied
  static async permissionDenied() {
    return this.error();
  }

  // Network status change
  static async networkChange(isConnected) {
    if (isConnected) {
      return this.success();
    } else {
      return this.warning();
    }
  }

  // Long press feedback
  static async longPress() {
    return this.medium();
  }

  // Swipe action
  static async swipe() {
    return this.light();
  }

  // Modal open/close
  static async modalToggle() {
    return this.light();
  }

  // Tab switch
  static async tabSwitch() {
    return this.selection();
  }

  // Loading complete
  static async loadingComplete() {
    return this.light();
  }

  // New content available
  static async newContent() {
    return this.light();
  }

  // Keyboard show/hide
  static async keyboard() {
    return this.light();
  }

  // Pull to refresh
  static async pullToRefresh() {
    return this.light();
  }

  // End of list reached
  static async endOfList() {
    return this.light();
  }

  // Timer/countdown
  static async countdown() {
    return this.light();
  }

  // Achievement unlocked
  static async achievement() {
    return this.success();
  }

  // Settings change
  static async settingsChange() {
    return this.selection();
  }

  // Search result found
  static async searchResult() {
    return this.light();
  }

  // Voice recording start/stop
  static async voiceRecording(isRecording) {
    if (isRecording) {
      return this.medium();
    } else {
      return this.success();
    }
  }

  // Camera focus
  static async cameraFocus() {
    return this.light();
  }

  // Map zoom
  static async mapZoom() {
    return this.light();
  }

  // Filter applied
  static async filterApplied() {
    return this.selection();
  }

  // Sort changed
  static async sortChanged() {
    return this.selection();
  }

  // Batch operation complete
  static async batchComplete() {
    return this.success();
  }

  // Connection established
  static async connectionEstablished() {
    return this.success();
  }

  // Data sync complete
  static async syncComplete() {
    return this.light();
  }

  // Custom haptic with pattern
  static async customPattern(pattern) {
    try {
      for (const haptic of pattern) {
        switch (haptic.type) {
          case 'light':
            await this.light();
            break;
          case 'medium':
            await this.medium();
            break;
          case 'heavy':
            await this.heavy();
            break;
          case 'selection':
            await this.selection();
            break;
          case 'success':
            await this.success();
            break;
          case 'warning':
            await this.warning();
            break;
          case 'error':
            await this.error();
            break;
        }
        
        if (haptic.delay) {
          await new Promise(resolve => setTimeout(resolve, haptic.delay));
        }
      }
    } catch (error) {
      console.error('Error with custom haptic pattern:', error);
    }
  }

  // Check if haptics are supported
  static isSupported() {
    return Haptics.impactAsync !== undefined;
  }

  // Disable haptics for accessibility
  static disable() {
    // Store original functions
    this._originalFunctions = {
      light: this.light,
      medium: this.medium,
      heavy: this.heavy,
      selection: this.selection,
      success: this.success,
      warning: this.warning,
      error: this.error,
    };

    // Replace with no-op functions
    Object.keys(this._originalFunctions).forEach(key => {
      this[key] = () => Promise.resolve();
    });
  }

  // Re-enable haptics
  static enable() {
    if (this._originalFunctions) {
      Object.keys(this._originalFunctions).forEach(key => {
        this[key] = this._originalFunctions[key];
      });
      delete this._originalFunctions;
    }
  }
}

export default HapticUtils;
