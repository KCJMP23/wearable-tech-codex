import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md', 
  style, 
  textStyle 
}: BadgeProps) {
  const { colors } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: colors.success + '20',
          borderColor: colors.success,
          color: colors.success,
        };
      case 'warning':
        return {
          backgroundColor: colors.warning + '20',
          borderColor: colors.warning,
          color: colors.warning,
        };
      case 'error':
        return {
          backgroundColor: colors.error + '20',
          borderColor: colors.error,
          color: colors.error,
        };
      case 'info':
        return {
          backgroundColor: colors.primary + '20',
          borderColor: colors.primary,
          color: colors.primary,
        };
      default:
        return {
          backgroundColor: colors.textSecondary + '20',
          borderColor: colors.textSecondary,
          color: colors.textSecondary,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: 6,
          paddingVertical: 2,
          fontSize: 12,
        };
      case 'lg':
        return {
          paddingHorizontal: 12,
          paddingVertical: 6,
          fontSize: 16,
        };
      default:
        return {
          paddingHorizontal: 8,
          paddingVertical: 4,
          fontSize: 14,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const styles = StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: variantStyles.backgroundColor,
      borderColor: variantStyles.borderColor,
      paddingHorizontal: sizeStyles.paddingHorizontal,
      paddingVertical: sizeStyles.paddingVertical,
    },
    text: {
      fontSize: sizeStyles.fontSize,
      fontWeight: '600',
      color: variantStyles.color,
      textAlign: 'center',
    },
  });

  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.text, textStyle]}>{children}</Text>
    </View>
  );
}