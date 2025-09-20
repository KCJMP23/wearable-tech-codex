import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback utility service for enhanced user experience
 */
export class HapticsService {
  private static isHapticsEnabled = true;

  /**
   * Enable or disable haptic feedback
   */
  static setEnabled(enabled: boolean): void {
    HapticsService.isHapticsEnabled = enabled;
  }

  /**
   * Check if haptics are enabled
   */
  static isEnabled(): boolean {
    return HapticsService.isHapticsEnabled && Platform.OS !== 'web';
  }

  /**
   * Light impact feedback - for small interactions like button presses
   */
  static light(): void {
    if (!HapticsService.isEnabled()) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn('Haptics light feedback failed:', error);
    }
  }

  /**
   * Medium impact feedback - for medium interactions like tab switches
   */
  static medium(): void {
    if (!HapticsService.isEnabled()) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Haptics medium feedback failed:', error);
    }
  }

  /**
   * Heavy impact feedback - for major interactions like confirmations
   */
  static heavy(): void {
    if (!HapticsService.isEnabled()) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('Haptics heavy feedback failed:', error);
    }
  }

  /**
   * Selection feedback - for picker/selector changes
   */
  static selection(): void {
    if (!HapticsService.isEnabled()) return;
    
    try {
      Haptics.selectionAsync();
    } catch (error) {
      console.warn('Haptics selection feedback failed:', error);
    }
  }

  /**
   * Success notification feedback
   */
  static success(): void {
    if (!HapticsService.isEnabled()) return;
    
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Haptics success feedback failed:', error);
    }
  }

  /**
   * Warning notification feedback
   */
  static warning(): void {
    if (!HapticsService.isEnabled()) return;
    
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.warn('Haptics warning feedback failed:', error);
    }
  }

  /**
   * Error notification feedback
   */
  static error(): void {
    if (!HapticsService.isEnabled()) return;
    
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn('Haptics error feedback failed:', error);
    }
  }

  /**
   * Custom vibration pattern (Android only)
   */
  static vibrate(pattern?: number[]): void {
    if (!HapticsService.isEnabled() || Platform.OS !== 'android') return;
    
    try {
      // Note: This would need react-native Vibration API for custom patterns
      // For now, use heavy impact as fallback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn('Haptics vibrate failed:', error);
    }
  }
}

/**
 * Convenient haptic feedback functions
 */
export const haptics = {
  // Basic interactions
  tap: () => HapticsService.light(),
  press: () => HapticsService.medium(),
  longPress: () => HapticsService.heavy(),
  
  // UI interactions
  buttonPress: () => HapticsService.light(),
  tabSwitch: () => HapticsService.medium(),
  modalOpen: () => HapticsService.medium(),
  modalClose: () => HapticsService.light(),
  swipeAction: () => HapticsService.medium(),
  
  // Selection and navigation
  select: () => HapticsService.selection(),
  navigate: () => HapticsService.light(),
  backButton: () => HapticsService.light(),
  
  // Data actions
  refresh: () => HapticsService.medium(),
  delete: () => HapticsService.heavy(),
  create: () => HapticsService.success(),
  update: () => HapticsService.light(),
  
  // Notifications and states
  success: () => HapticsService.success(),
  warning: () => HapticsService.warning(),
  error: () => HapticsService.error(),
  
  // Special interactions
  pullToRefresh: () => HapticsService.light(),
  infiniteScroll: () => HapticsService.light(),
  cardFlip: () => HapticsService.medium(),
  toggle: () => HapticsService.selection(),
  
  // Revenue and analytics
  newRevenue: () => HapticsService.success(),
  goalAchieved: () => HapticsService.heavy(),
  newConversion: () => HapticsService.success(),
  
  // Settings and configuration
  settingChanged: () => HapticsService.selection(),
  biometricAuth: () => HapticsService.medium(),
  logout: () => HapticsService.heavy(),
};

/**
 * Hook for accessing haptic feedback in components
 */
export const useHaptics = () => {
  return {
    haptics,
    HapticsService,
    isEnabled: HapticsService.isEnabled(),
    setEnabled: HapticsService.setEnabled,
  };
};

export default haptics;