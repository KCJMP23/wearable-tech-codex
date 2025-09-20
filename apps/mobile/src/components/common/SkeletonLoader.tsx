import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../providers/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { colors } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.7, 0.3]);
    
    return {
      opacity,
    };
  });

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmer.value,
      [0, 1],
      [-screenWidth, screenWidth]
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.card,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.border },
          animatedStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            width: screenWidth / 2,
          },
          shimmerStyle,
        ]}
      />
    </View>
  );
};

// Predefined skeleton components
export const SkeletonLoader = {
  // Text skeletons
  Title: ({ style }: { style?: any }) => (
    <Skeleton width="70%" height={24} borderRadius={6} style={style} />
  ),
  
  Subtitle: ({ style }: { style?: any }) => (
    <Skeleton width="50%" height={16} borderRadius={4} style={style} />
  ),
  
  Text: ({ style }: { style?: any }) => (
    <Skeleton width="100%" height={14} borderRadius={4} style={style} />
  ),
  
  ShortText: ({ style }: { style?: any }) => (
    <Skeleton width="60%" height={14} borderRadius={4} style={style} />
  ),

  // UI element skeletons
  Avatar: ({ size = 40, style }: { size?: number; style?: any }) => (
    <Skeleton 
      width={size} 
      height={size} 
      borderRadius={size / 2} 
      style={style} 
    />
  ),
  
  Button: ({ style }: { style?: any }) => (
    <Skeleton width={120} height={40} borderRadius={8} style={style} />
  ),
  
  Card: ({ style }: { style?: any }) => (
    <Skeleton width="100%" height={80} borderRadius={12} style={style} />
  ),
  
  Image: ({ style }: { style?: any }) => (
    <Skeleton width="100%" height={200} borderRadius={8} style={style} />
  ),

  // Complex skeletons
  ProductCard: ({ style }: { style?: any }) => {
    const { colors } = useTheme();
    
    return (
      <View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <SkeletonLoader.Image style={{ width: 60, height: 60, marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <SkeletonLoader.Title style={{ marginBottom: 4 }} />
            <SkeletonLoader.Subtitle style={{ marginBottom: 8 }} />
            <SkeletonLoader.ShortText />
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonLoader.Text style={{ width: '30%' }} />
          <SkeletonLoader.Text style={{ width: '25%' }} />
          <SkeletonLoader.Text style={{ width: '20%' }} />
        </View>
      </View>
    );
  },

  SiteCard: ({ style }: { style?: any }) => {
    const { colors } = useTheme();
    
    return (
      <View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <SkeletonLoader.Title style={{ marginBottom: 4 }} />
            <SkeletonLoader.Subtitle />
          </View>
          <SkeletonLoader.Button style={{ width: 60, height: 24 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <SkeletonLoader.Text style={{ width: '22%' }} />
          <SkeletonLoader.Text style={{ width: '22%' }} />
          <SkeletonLoader.Text style={{ width: '22%' }} />
          <SkeletonLoader.Text style={{ width: '22%' }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonLoader.ShortText />
          <SkeletonLoader.ShortText />
        </View>
      </View>
    );
  },

  NotificationItem: ({ style }: { style?: any }) => {
    const { colors } = useTheme();
    
    return (
      <View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginHorizontal: 20,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <View style={{ flexDirection: 'row' }}>
          <SkeletonLoader.Avatar size={40} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <SkeletonLoader.Title style={{ width: '70%' }} />
              <SkeletonLoader.ShortText style={{ width: '20%' }} />
            </View>
            <SkeletonLoader.Text style={{ marginBottom: 8 }} />
            <SkeletonLoader.ShortText style={{ width: '40%' }} />
          </View>
        </View>
      </View>
    );
  },

  AnalyticsCard: ({ style }: { style?: any }) => {
    const { colors } = useTheme();
    
    return (
      <View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <SkeletonLoader.Avatar size={24} style={{ marginRight: 8 }} />
          <SkeletonLoader.Subtitle />
        </View>
        <SkeletonLoader.Title style={{ marginBottom: 4 }} />
        <SkeletonLoader.ShortText style={{ width: '60%' }} />
      </View>
    );
  },

  ChartSkeleton: ({ style }: { style?: any }) => {
    const { colors } = useTheme();
    
    return (
      <View
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <SkeletonLoader.Title style={{ marginBottom: 16, textAlign: 'center' }} />
        <Skeleton width="100%" height={200} borderRadius={8} />
      </View>
    );
  },

  // List skeletons
  ProductList: ({ count = 3 }: { count?: number }) => (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLoader.ProductCard key={index} />
      ))}
    </View>
  ),

  SiteList: ({ count = 3 }: { count?: number }) => (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLoader.SiteCard key={index} />
      ))}
    </View>
  ),

  NotificationList: ({ count = 5 }: { count?: number }) => (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLoader.NotificationItem key={index} />
      ))}
    </View>
  ),

  AnalyticsGrid: ({ count = 4 }: { count?: number }) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLoader.AnalyticsCard 
          key={index} 
          style={{ flex: 1, minWidth: '47%' }} 
        />
      ))}
    </View>
  ),
};

export default SkeletonLoader;