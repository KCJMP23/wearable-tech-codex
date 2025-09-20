import { withSpring, withTiming, withSequence, runOnJS } from 'react-native-reanimated';
import { Easing } from 'react-native';
import { haptics } from './haptics';

/**
 * Animation configuration presets for consistent animations throughout the app
 */
export const animationConfig = {
  // Timing configurations
  timing: {
    fast: { duration: 200, easing: Easing.out(Easing.quad) },
    normal: { duration: 300, easing: Easing.out(Easing.quad) },
    slow: { duration: 500, easing: Easing.out(Easing.quad) },
    bouncy: { duration: 400, easing: Easing.bounce },
  },
  
  // Spring configurations
  spring: {
    gentle: { damping: 20, stiffness: 90 },
    bouncy: { damping: 10, stiffness: 100 },
    snappy: { damping: 30, stiffness: 150 },
    wobbly: { damping: 8, stiffness: 180 },
  },
  
  // Scale animations
  scale: {
    tap: { from: 1, to: 0.95, duration: 100 },
    press: { from: 1, to: 0.9, duration: 150 },
    bounce: { from: 1, to: 1.05, duration: 200 },
  },
  
  // Slide animations
  slide: {
    fromLeft: { from: -300, to: 0 },
    fromRight: { from: 300, to: 0 },
    fromTop: { from: -300, to: 0 },
    fromBottom: { from: 300, to: 0 },
  },
  
  // Fade animations
  fade: {
    in: { from: 0, to: 1 },
    out: { from: 1, to: 0 },
  },
};

/**
 * Common animation functions using Reanimated 2
 */
export const animations = {
  /**
   * Scale animation for button press feedback
   */
  scalePress: (scale: any, callback?: () => void) => {
    'worklet';
    const { from, to, duration } = animationConfig.scale.press;
    
    scale.value = withSequence(
      withTiming(to, { duration }),
      withTiming(from, { duration }, (finished) => {
        if (finished && callback) {
          runOnJS(callback)();
        }
      })
    );
  },

  /**
   * Scale tap animation for light interactions
   */
  scaleTap: (scale: any, callback?: () => void) => {
    'worklet';
    const { from, to, duration } = animationConfig.scale.tap;
    
    scale.value = withSequence(
      withTiming(to, { duration: duration / 2 }),
      withTiming(from, { duration: duration / 2 }, (finished) => {
        if (finished && callback) {
          runOnJS(callback)();
        }
      })
    );
  },

  /**
   * Bounce animation for success states
   */
  bounce: (scale: any, callback?: () => void) => {
    'worklet';
    const { from, to, duration } = animationConfig.scale.bounce;
    
    scale.value = withSequence(
      withSpring(to, animationConfig.spring.bouncy),
      withSpring(from, animationConfig.spring.gentle, (finished) => {
        if (finished && callback) {
          runOnJS(callback)();
        }
      })
    );
  },

  /**
   * Fade in animation
   */
  fadeIn: (opacity: any, duration = 300, callback?: () => void) => {
    'worklet';
    opacity.value = withTiming(1, { duration }, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  },

  /**
   * Fade out animation
   */
  fadeOut: (opacity: any, duration = 300, callback?: () => void) => {
    'worklet';
    opacity.value = withTiming(0, { duration }, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  },

  /**
   * Slide in from direction
   */
  slideIn: (translateX: any, direction: 'left' | 'right' = 'left', callback?: () => void) => {
    'worklet';
    const slideConfig = direction === 'left' 
      ? animationConfig.slide.fromLeft 
      : animationConfig.slide.fromRight;
    
    translateX.value = slideConfig.from;
    translateX.value = withSpring(slideConfig.to, animationConfig.spring.snappy, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  },

  /**
   * Slide out to direction
   */
  slideOut: (translateX: any, direction: 'left' | 'right' = 'right', callback?: () => void) => {
    'worklet';
    const slideConfig = direction === 'left' 
      ? animationConfig.slide.fromLeft 
      : animationConfig.slide.fromRight;
    
    translateX.value = withTiming(slideConfig.from, animationConfig.timing.fast, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  },

  /**
   * Shake animation for errors
   */
  shake: (translateX: any, callback?: () => void) => {
    'worklet';
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 }, (finished) => {
        if (finished) {
          runOnJS(haptics.error)();
          if (callback) {
            runOnJS(callback)();
          }
        }
      })
    );
  },

  /**
   * Pulse animation for attention
   */
  pulse: (scale: any, callback?: () => void) => {
    'worklet';
    scale.value = withSequence(
      withTiming(1.1, { duration: 300 }),
      withTiming(1, { duration: 300 }, (finished) => {
        if (finished && callback) {
          runOnJS(callback)();
        }
      })
    );
  },

  /**
   * Rotation animation
   */
  rotate: (rotation: any, from = 0, to = 360, duration = 1000, callback?: () => void) => {
    'worklet';
    rotation.value = from;
    rotation.value = withTiming(to, { duration }, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  },

  /**
   * Wiggle animation for fun interactions
   */
  wiggle: (rotation: any, callback?: () => void) => {
    'worklet';
    rotation.value = withSequence(
      withTiming(-5, { duration: 100 }),
      withTiming(5, { duration: 100 }),
      withTiming(-5, { duration: 100 }),
      withTiming(5, { duration: 100 }),
      withTiming(0, { duration: 100 }, (finished) => {
        if (finished && callback) {
          runOnJS(callback)();
        }
      })
    );
  },

  /**
   * Stagger animation for list items
   */
  stagger: (items: any[], delay = 100) => {
    'worklet';
    items.forEach((item, index) => {
      item.value = withTiming(1, {
        duration: 300,
        delay: index * delay,
      });
    });
  },
};

/**
 * Animation sequences for complex interactions
 */
export const animationSequences = {
  /**
   * Button press with haptic feedback
   */
  buttonPress: (scale: any, callback?: () => void) => {
    'worklet';
    runOnJS(haptics.buttonPress)();
    animations.scalePress(scale, callback);
  },

  /**
   * Success animation with haptic feedback
   */
  success: (scale: any, callback?: () => void) => {
    'worklet';
    runOnJS(haptics.success)();
    animations.bounce(scale, callback);
  },

  /**
   * Error animation with haptic feedback
   */
  error: (translateX: any, callback?: () => void) => {
    'worklet';
    animations.shake(translateX, callback);
  },

  /**
   * Delete animation with haptic feedback
   */
  delete: (scale: any, opacity: any, callback?: () => void) => {
    'worklet';
    runOnJS(haptics.delete)();
    scale.value = withTiming(0.8, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  },

  /**
   * Loading animation
   */
  loading: (rotation: any) => {
    'worklet';
    rotation.value = withTiming(360, { 
      duration: 1000,
      easing: Easing.linear,
    }, () => {
      rotation.value = 0;
    });
  },

  /**
   * Card flip animation
   */
  cardFlip: (rotateY: any, callback?: () => void) => {
    'worklet';
    runOnJS(haptics.cardFlip)();
    rotateY.value = withSequence(
      withTiming(90, { duration: 200 }),
      withTiming(0, { duration: 200 }, (finished) => {
        if (finished && callback) {
          runOnJS(callback)();
        }
      })
    );
  },

  /**
   * Modal entrance animation
   */
  modalEnter: (scale: any, opacity: any, callback?: () => void) => {
    'worklet';
    runOnJS(haptics.modalOpen)();
    scale.value = 0.8;
    opacity.value = 0;
    
    scale.value = withSpring(1, animationConfig.spring.bouncy);
    opacity.value = withTiming(1, { duration: 300 }, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  },

  /**
   * Modal exit animation
   */
  modalExit: (scale: any, opacity: any, callback?: () => void) => {
    'worklet';
    runOnJS(haptics.modalClose)();
    scale.value = withTiming(0.8, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished && callback) {
        runOnJS(callback)();
      }
    });
  },

  /**
   * Pull to refresh animation
   */
  pullToRefresh: (translateY: any, callback?: () => void) => {
    'worklet';
    runOnJS(haptics.pullToRefresh)();
    translateY.value = withSequence(
      withTiming(-50, { duration: 200 }),
      withSpring(0, animationConfig.spring.snappy, (finished) => {
        if (finished && callback) {
          runOnJS(callback)();
        }
      })
    );
  },
};

/**
 * Layout animation presets
 */
export const layoutAnimations = {
  // Standard layout transitions
  layout: {
    type: 'spring',
    damping: 20,
    stiffness: 90,
  },
  
  // Entering animations
  entering: {
    type: 'timing',
    duration: 300,
    easing: Easing.out(Easing.quad),
  },
  
  // Exiting animations
  exiting: {
    type: 'timing',
    duration: 200,
    easing: Easing.in(Easing.quad),
  },
};

/**
 * Custom easing functions
 */
export const customEasing = {
  // iOS-like easing
  ios: Easing.bezier(0.25, 0.1, 0.25, 1),
  
  // Material Design easing
  material: Easing.bezier(0.4, 0, 0.2, 1),
  
  // Bounce variants
  softBounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),
  hardBounce: Easing.bezier(0.175, 0.885, 0.32, 1.275),
  
  // Back easing
  backIn: Easing.bezier(0.6, -0.28, 0.735, 0.045),
  backOut: Easing.bezier(0.175, 0.885, 0.32, 1.275),
  
  // Elastic easing
  elastic: Easing.bezier(0.68, -0.55, 0.265, 1.55),
};

export default animations;