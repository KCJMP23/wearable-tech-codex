import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../providers/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  style?: any;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  text,
  style,
}) => {
  const { colors } = useTheme();
  const spinnerColor = color || colors.primary;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    spinner: {
      marginBottom: text ? 16 : 0,
    },
    text: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator 
        size={size} 
        color={spinnerColor} 
        style={styles.spinner}
      />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { colors } = useTheme();
  const animatedValue = new Animated.Value(0);

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.textSecondary + '40'],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

interface SkeletonCardProps {
  showAvatar?: boolean;
  lines?: number;
  style?: any;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showAvatar = false,
  lines = 3,
  style,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatar: {
      marginRight: 12,
    },
    title: {
      flex: 1,
    },
    content: {
      gap: 8,
    },
  });

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        {showAvatar && (
          <Skeleton
            width={40}
            height={40}
            borderRadius={20}
            style={styles.avatar}
          />
        )}
        <Skeleton width="60%" height={20} style={styles.title} />
      </View>
      <View style={styles.content}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            width={index === lines - 1 ? '80%' : '100%'}
            height={16}
          />
        ))}
      </View>
    </View>
  );
};

interface SkeletonListProps {
  count?: number;
  showAvatar?: boolean;
  style?: any;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  showAvatar = false,
  style,
}) => {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} showAvatar={showAvatar} />
      ))}
    </View>
  );
};

interface PulseLoaderProps {
  size?: number;
  color?: string;
  dots?: number;
}

export const PulseLoader: React.FC<PulseLoaderProps> = ({
  size = 8,
  color,
  dots = 3,
}) => {
  const { colors } = useTheme();
  const dotColor = color || colors.primary;
  const animatedValues = Array.from({ length: dots }, () => new Animated.Value(0));

  React.useEffect(() => {
    const animations = animatedValues.map((animatedValue, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      )
    );

    Animated.parallel(animations).start();

    return () => {
      animations.forEach(animation => animation.stop());
    };
  }, []);

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: dotColor,
      marginHorizontal: 2,
    },
  });

  return (
    <View style={styles.container}>
      {animatedValues.map((animatedValue, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              opacity: animatedValue,
              transform: [
                {
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  transparent?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  text = 'Loading...',
  transparent = false,
}) => {
  const { colors } = useTheme();
  const opacity = new Animated.Value(0);

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible) return null;

  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: transparent ? 'transparent' : 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    content: {
      backgroundColor: colors.card,
      padding: 24,
      borderRadius: 12,
      alignItems: 'center',
      minWidth: 120,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    text: {
      marginTop: 12,
      fontSize: 16,
      color: colors.text,
      textAlign: 'center',
    },
  });

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      {!transparent && (
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.text}>{text}</Text>
        </View>
      )}
      {transparent && (
        <ActivityIndicator size="large" color={colors.primary} />
      )}
    </Animated.View>
  );
};

interface InlineLoaderProps {
  text?: string;
  size?: 'small' | 'large';
  style?: any;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  text = 'Loading...',
  size = 'small',
  style,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    text: {
      marginLeft: 8,
      fontSize: 14,
      color: colors.textSecondary,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={colors.primary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

interface EmptyStateLoaderProps {
  icon?: string;
  title?: string;
  description?: string;
  showSpinner?: boolean;
}

export const EmptyStateLoader: React.FC<EmptyStateLoaderProps> = ({
  icon = 'cloud-download-outline',
  title = 'Loading data...',
  description = 'Please wait while we fetch your information',
  showSpinner = true,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    icon: {
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    description: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: showSpinner ? 24 : 0,
    },
  });

  return (
    <View style={styles.container}>
      <Ionicons 
        name={icon as any} 
        size={64} 
        color={colors.textSecondary} 
        style={styles.icon}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {showSpinner && <PulseLoader />}
    </View>
  );
};

interface ProgressLoaderProps {
  progress: number; // 0-100
  text?: string;
  showPercentage?: boolean;
}

export const ProgressLoader: React.FC<ProgressLoaderProps> = ({
  progress,
  text = 'Loading...',
  showPercentage = true,
}) => {
  const { colors } = useTheme();
  const animatedWidth = new Animated.Value(0);

  React.useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const styles = StyleSheet.create({
    container: {
      padding: 20,
      alignItems: 'center',
    },
    text: {
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    progressContainer: {
      width: '100%',
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    percentage: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '600',
    },
  });

  const width = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
      <View style={styles.progressContainer}>
        <Animated.View style={[styles.progressBar, { width }]} />
      </View>
      {showPercentage && (
        <Text style={styles.percentage}>{Math.round(progress)}%</Text>
      )}
    </View>
  );
};