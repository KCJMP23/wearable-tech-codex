import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useTheme } from '../../src/providers/ThemeProvider';
import { useAuth } from '../../src/providers/AuthProvider';
import { notificationsApi } from '../../src/services/api';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { EmptyState } from '../../src/components/common/EmptyState';
import { SkeletonLoader } from '../../src/components/common/SkeletonLoader';
import { AnimatedListItem } from '../../src/components/common/AnimatedComponents';
import { Card, CardContent, Badge } from '../../src/components/ui';
import { haptics } from '../../src/utils/haptics';
import { Notification } from '../../src/types/notification';

type NotificationFilter = 'all' | 'unread';

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  colors: any;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
  colors,
}) => {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'revenue':
        return 'cash-outline';
      case 'conversion':
        return 'trending-up-outline';
      case 'alert':
        return 'warning-outline';
      case 'system':
        return 'settings-outline';
      case 'marketing':
        return 'megaphone-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'revenue':
        return colors.success;
      case 'conversion':
        return colors.primary;
      case 'alert':
        return colors.warning;
      case 'system':
        return colors.textSecondary;
      case 'marketing':
        return colors.accent;
      default:
        return colors.primary;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return { variant: 'error' as const, text: 'High' };
      case 'medium':
        return { variant: 'warning' as const, text: 'Medium' };
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = parseISO(timestamp);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'MMM d');
  };

  const handleLongPress = () => {
    haptics.medium();
    Alert.alert(
      notification.title,
      'Choose an action',
      [
        { text: 'View', onPress: () => { haptics.tap(); onPress(); } },
        ...(notification.read ? [] : [{ text: 'Mark as Read', onPress: () => { haptics.selection(); onMarkAsRead(); } }]),
        { text: 'Delete', onPress: () => { haptics.delete(); onDelete(); }, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const priorityBadge = getPriorityBadge(notification.priority);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={handleLongPress}
      style={[
        styles.notificationItem,
        {
          backgroundColor: notification.read ? colors.card : colors.primary + '08',
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.notificationLeft}>
        <View
          style={[
            styles.notificationIcon,
            {
              backgroundColor: getNotificationColor(notification.type) + '20',
            },
          ]}
        >
          <Ionicons
            name={getNotificationIcon(notification.type) as any}
            size={20}
            color={getNotificationColor(notification.type)}
          />
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text
              style={[
                styles.notificationTitle,
                {
                  color: colors.text,
                  fontWeight: notification.read ? '500' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
              {formatTime(notification.createdAt)}
            </Text>
          </View>
          <Text
            style={[styles.notificationMessage, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {notification.message}
          </Text>
          <View style={styles.notificationFooter}>
            {priorityBadge && (
              <Badge variant={priorityBadge.variant} size="sm">
                {priorityBadge.text}
              </Badge>
            )}
            {!notification.read && (
              <View style={[styles.unreadIndicator, { backgroundColor: colors.primary }]} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications', user?.id, filter],
    queryFn: () => notificationsApi.getNotifications(user?.id!, filter),
    enabled: !!user?.id,
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
  });

  const {
    data: unreadCount = 0,
    refetch: refetchUnreadCount,
  } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsApi.getUnreadCount().then(res => res.data),
    enabled: !!user?.id,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
    onError: (error: any) => {
      showMessage({
        message: error.message || 'Failed to mark notification as read',
        type: 'danger',
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: notificationsApi.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      showMessage({
        message: 'Notification deleted',
        type: 'success',
      });
    },
    onError: (error: any) => {
      showMessage({
        message: error.message || 'Failed to delete notification',
        type: 'danger',
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(user?.id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      showMessage({
        message: 'All notifications marked as read',
        type: 'success',
      });
    },
    onError: (error: any) => {
      showMessage({
        message: error.message || 'Failed to mark all as read',
        type: 'danger',
      });
    },
  });

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetch();
        refetchUnreadCount();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetch, refetchUnreadCount]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchUnreadCount()]);
    setRefreshing(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    haptics.tap();
    
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Handle different notification types
    switch (notification.type) {
      case 'revenue':
      case 'conversion':
        // Navigate to analytics
        break;
      case 'alert':
        // Show alert details
        haptics.warning();
        Alert.alert(notification.title, notification.message);
        break;
      default:
        // Show notification details
        Alert.alert(notification.title, notification.message);
    }
  };

  const handleMarkAsRead = (notification: Notification) => {
    markAsReadMutation.mutate(notification.id);
  };

  const handleDeleteNotification = (notification: Notification) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNotificationMutation.mutate(notification.id),
        },
      ]
    );
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) {
      showMessage({
        message: 'No unread notifications',
        type: 'info',
      });
      return;
    }

    Alert.alert(
      'Mark All as Read',
      `Mark all ${unreadCount} unread notifications as read?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark All', onPress: () => markAllAsReadMutation.mutate() },
      ]
    );
  };

  const renderNotificationItem = ({ item, index }: { item: Notification; index: number }) => (
    <AnimatedListItem
      index={index}
      onSwipeLeft={() => handleDeleteNotification(item)}
      onSwipeRight={() => !item.read && handleMarkAsRead(item)}
      swipeEnabled={true}
    >
      <NotificationItem
        notification={item}
        onPress={() => handleNotificationPress(item)}
        onMarkAsRead={() => handleMarkAsRead(item)}
        onDelete={() => handleDeleteNotification(item)}
        colors={colors}
      />
    </AnimatedListItem>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.autoRefreshToggle, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setAutoRefresh(!autoRefresh)}
          >
            <Ionicons
              name={autoRefresh ? 'refresh' : 'refresh-outline'}
              size={20}
              color={autoRefresh ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.markAllButton, { backgroundColor: colors.primary }]}
            onPress={handleMarkAllAsRead}
          >
            <Text style={styles.markAllText}>Mark All Read</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === 'all' ? colors.primary : 'transparent',
              borderColor: colors.primary,
            },
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'all' ? 'white' : colors.primary },
            ]}
          >
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === 'unread' ? colors.primary : 'transparent',
              borderColor: colors.primary,
            },
          ]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'unread' ? 'white' : colors.primary },
            ]}
          >
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.autoRefreshContainer}>
        <Text style={[styles.autoRefreshLabel, { color: colors.textSecondary }]}>
          Auto-refresh
        </Text>
        <Switch
          value={autoRefresh}
          onValueChange={setAutoRefresh}
          trackColor={{ false: colors.border, true: colors.primary + '40' }}
          thumbColor={autoRefresh ? colors.primary : colors.textSecondary}
        />
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    autoRefreshToggle: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
    },
    markAllButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    markAllText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    filterContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    filterButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
    },
    filterText: {
      fontSize: 14,
      fontWeight: '600',
    },
    autoRefreshContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    autoRefreshLabel: {
      fontSize: 16,
      fontWeight: '500',
    },
    content: {
      flex: 1,
    },
    notificationItem: {
      marginHorizontal: 20,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      overflow: 'hidden',
    },
    notificationLeft: {
      flexDirection: 'row',
      padding: 16,
    },
    notificationIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    notificationContent: {
      flex: 1,
    },
    notificationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    notificationTitle: {
      fontSize: 16,
      flex: 1,
      marginRight: 8,
    },
    notificationTime: {
      fontSize: 12,
    },
    notificationMessage: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 8,
    },
    notificationFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    unreadIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    errorText: {
      fontSize: 16,
      color: colors.error,
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.content}>
          <SkeletonLoader.NotificationList count={5} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load notifications. Please check your connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <View style={styles.content}>
        {notifications.length === 0 ? (
          <EmptyState
            icon="notifications-outline"
            title={filter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
            description={
              filter === 'unread'
                ? 'All caught up! No unread notifications at the moment.'
                : 'You have no notifications yet. We\'ll notify you about important updates to your affiliate business.'
            }
          />
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotificationItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}