import React, { useEffect } from 'react';
import { Pressable, View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  Layout,
  ZoomIn,
} from 'react-native-reanimated';
import { PanGestureHandler, TapGestureHandler } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeProvider';
import { animations, animationConfig } from '../../utils/animations';
import { haptics } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  hapticFeedback = true,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePress = () => {
    if (disabled || loading) return;
    
    if (hapticFeedback) {
      haptics.buttonPress();
    }
    
    animations.scaleTap(scale, onPress);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getButtonStyle = () => {
    const baseStyle = {
      borderRadius: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
    };

    const sizeStyles = {
      sm: { paddingHorizontal: 12, paddingVertical: 8 },
      md: { paddingHorizontal: 16, paddingVertical: 12 },
      lg: { paddingHorizontal: 20, paddingVertical: 16 },
    };

    const variantStyles = {
      primary: { backgroundColor: colors.primary },
      secondary: { backgroundColor: colors.secondary },
      outline: { 
        backgroundColor: 'transparent', 
        borderWidth: 1, 
        borderColor: colors.primary 
      },
      ghost: { backgroundColor: 'transparent' },
    };

    return [baseStyle, sizeStyles[size], variantStyles[variant]];
  };

  const getTextStyle = () => {
    const baseStyle = {
      fontWeight: '600' as const,
      textAlign: 'center' as const,
    };

    const sizeStyles = {
      sm: { fontSize: 14 },
      md: { fontSize: 16 },
      lg: { fontSize: 18 },
    };

    const variantStyles = {
      primary: { color: 'white' },
      secondary: { color: 'white' },
      outline: { color: colors.primary },
      ghost: { color: colors.primary },
    };

    return [baseStyle, sizeStyles[size], variantStyles[variant]];
  };

  useEffect(() => {
    opacity.value = withTiming(disabled ? 0.5 : 1, { duration: 200 });
  }, [disabled]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[getButtonStyle(), animatedStyle, style]}
      disabled={disabled || loading}
    >
      {loading && (
        <Animated.View 
          style={{ marginRight: 8 }}
          entering={FadeIn}
          exiting={FadeOut}
        >
          <AnimatedSpinner size={16} color="white" />
        </Animated.View>
      )}
      
      {leftIcon && !loading && (
        <Ionicons 
          name={leftIcon as any} 
          size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} 
          color={getTextStyle().find(s => s.color)?.color || colors.text}
          style={{ marginRight: 8 }}
        />
      )}
      
      <Text style={[getTextStyle(), textStyle]}>
        {title}
      </Text>
      
      {rightIcon && (
        <Ionicons 
          name={rightIcon as any} 
          size={size === 'sm' ? 16 : size === 'lg' ? 20 : 18} 
          color={getTextStyle().find(s => s.color)?.color || colors.text}
          style={{ marginLeft: 8 }}
        />
      )}
    </AnimatedPressable>
  );
};

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  delayIndex?: number;
  hapticFeedback?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  onPress,
  style,
  delayIndex = 0,
  hapticFeedback = true,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const handlePress = () => {
    if (!onPress) return;
    
    if (hapticFeedback) {
      haptics.tap();
    }
    
    animations.scaleTap(scale, onPress);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardStyle = {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  };

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        style={[cardStyle, animatedStyle, style]}
        entering={FadeIn.delay(delayIndex * 100)}
        layout={Layout.springify()}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View
      style={[cardStyle, style]}
      entering={FadeIn.delay(delayIndex * 100)}
      layout={Layout.springify()}
    >
      {children}
    </Animated.View>
  );
};

interface AnimatedListItemProps {
  children: React.ReactNode;
  onPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  style?: ViewStyle;
  index?: number;
  swipeEnabled?: boolean;
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  children,
  onPress,
  onSwipeLeft,
  onSwipeRight,
  style,
  index = 0,
  swipeEnabled = true,
}) => {
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(haptics.selection)();
    },
    onActive: (event) => {
      translateX.value = event.translationX;
      
      // Scale down slightly when swiping
      const progress = Math.abs(event.translationX) / 200;
      scale.value = interpolate(progress, [0, 1], [1, 0.95], Extrapolate.CLAMP);
    },
    onEnd: (event) => {
      const shouldSwipe = Math.abs(event.translationX) > 100;
      
      if (shouldSwipe) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        
        // Animate out
        translateX.value = withTiming(
          direction === 'right' ? 300 : -300,
          { duration: 200 }
        );
        opacity.value = withTiming(0, { duration: 200 }, () => {
          // Call appropriate callback
          if (direction === 'right' && onSwipeRight) {
            runOnJS(onSwipeRight)();
          } else if (direction === 'left' && onSwipeLeft) {
            runOnJS(onSwipeLeft)();
          }
        });
      } else {
        // Snap back
        translateX.value = withSpring(0);
        scale.value = withSpring(1);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  const handleTap = () => {
    if (onPress) {
      haptics.tap();
      onPress();
    }
  };

  if (swipeEnabled && (onSwipeLeft || onSwipeRight)) {
    return (
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={animatedStyle}>
          <TapGestureHandler onActivated={handleTap}>
            <Animated.View
              style={style}
              entering={SlideInRight.delay(index * 50)}
              exiting={SlideOutRight}
              layout={Layout.springify()}
            >
              {children}
            </Animated.View>
          </TapGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    );
  }

  return (
    <TapGestureHandler onActivated={handleTap}>
      <Animated.View
        style={[animatedStyle, style]}
        entering={SlideInRight.delay(index * 50)}
        exiting={SlideOutRight}
        layout={Layout.springify()}
      >
        {children}
      </Animated.View>
    </TapGestureHandler>
  );
};

interface AnimatedSpinnerProps {
  size?: number;
  color?: string;
  speed?: number;
}

export const AnimatedSpinner: React.FC<AnimatedSpinnerProps> = ({
  size = 24,
  color = '#007AFF',
  speed = 1000,
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      rotation.value = withTiming(360, { duration: speed }, () => {
        rotation.value = 0;
        animate();
      });
    };
    animate();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
      <Ionicons name="reload" size={size} color={color} />
    </Animated.View>
  );
};

interface FloatingActionButtonProps {
  icon: string;
  onPress: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onPress,
  position = 'bottom-right',
  size = 56,
  color = 'white',
  backgroundColor = '#007AFF',
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const handlePress = () => {
    haptics.buttonPress();
    animations.scaleTap(scale, onPress);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getPositionStyle = () => {
    const offset = 20;
    switch (position) {
      case 'bottom-right':
        return { bottom: offset, right: offset };
      case 'bottom-left':
        return { bottom: offset, left: offset };
      case 'top-right':
        return { top: offset, right: offset };
      case 'top-left':
        return { top: offset, left: offset };
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor || colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        },
        getPositionStyle(),
        animatedStyle,
      ]}
      entering={ZoomIn.delay(300)}
    >
      <Ionicons name={icon as any} size={size * 0.4} color={color} />
    </AnimatedPressable>
  );
};

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  style?: TextStyle;
  prefix?: string;
  suffix?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  style,
  prefix = '',
  suffix = '',
}) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration });
  }, [value]);

  const animatedText = useAnimatedStyle(() => {
    return {
      text: `${prefix}${Math.round(animatedValue.value)}${suffix}`,
    };
  });

  return (
    <Animated.Text style={[style, animatedText]} />
  );
};

interface PullToRefreshProps {
  onRefresh: () => void;
  refreshing: boolean;
  children: React.ReactNode;
  threshold?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  refreshing,
  children,
  threshold = 80,
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const { colors } = useTheme();

  const gestureHandler = useAnimatedGestureHandler({
    onActive: (event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        opacity.value = interpolate(
          event.translationY,
          [0, threshold],
          [0, 1],
          Extrapolate.CLAMP
        );
      }
    },
    onEnd: (event) => {
      if (event.translationY > threshold && !refreshing) {
        runOnJS(haptics.pullToRefresh)();
        runOnJS(onRefresh)();
      }
      
      translateY.value = withSpring(0);
      opacity.value = withTiming(0);
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={{ flex: 1 }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -threshold,
              left: 0,
              right: 0,
              height: threshold,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
            },
            headerStyle,
          ]}
        >
          {refreshing ? (
            <AnimatedSpinner color={colors.primary} />
          ) : (
            <Ionicons name="arrow-down" size={24} color={colors.primary} />
          )}
        </Animated.View>
        
        <Animated.View style={[{ flex: 1 }, contentStyle]}>
          {children}
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
};

export default {
  AnimatedButton,
  AnimatedCard,
  AnimatedListItem,
  AnimatedSpinner,
  FloatingActionButton,
  AnimatedCounter,
  PullToRefresh,
};