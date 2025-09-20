import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';
import { useTheme } from '../../src/providers/ThemeProvider';
import { useAuth } from '../../src/providers/AuthProvider';
import { sitesApi } from '../../src/services/api';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { EmptyState } from '../../src/components/common/EmptyState';
import { SkeletonLoader } from '../../src/components/common/SkeletonLoader';
import { AnimatedCard, FloatingActionButton } from '../../src/components/common/AnimatedComponents';
import { Card, CardContent } from '../../src/components/ui';
import { haptics } from '../../src/utils/haptics';
import { Site } from '../../src/types/site';

interface SiteCardProps {
  site: Site;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  colors: any;
}

const SiteCard: React.FC<SiteCardProps> = ({ 
  site, 
  onPress, 
  onEdit, 
  onDelete, 
  onShare, 
  colors 
}) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.warning;
      case 'suspended':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const handleMoreActions = () => {
    haptics.medium();
    Alert.alert(
      site.name,
      'Choose an action',
      [
        { text: 'View Details', onPress: () => { haptics.tap(); onPress(); } },
        { text: 'Edit Site', onPress: () => { haptics.tap(); onEdit(); } },
        { text: 'Share', onPress: () => { haptics.tap(); onShare(); } },
        { text: 'Delete', onPress: () => { haptics.delete(); onDelete(); }, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <AnimatedCard 
      style={styles.siteCard} 
      onPress={() => { haptics.tap(); onPress(); }}
    >
        <View style={styles.siteHeader}>
          <TouchableOpacity style={styles.siteInfo} onPress={onPress}>
            <Text style={[styles.siteName, { color: colors.text }]} numberOfLines={1}>
              {site.name}
            </Text>
            <Text style={[styles.siteDomain, { color: colors.textSecondary }]} numberOfLines={1}>
              {site.domain}
            </Text>
          </TouchableOpacity>
          <View style={styles.siteActions}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(site.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(site.status) }]}>
                {site.status.charAt(0).toUpperCase() + site.status.slice(1)}
              </Text>
            </View>
            <TouchableOpacity onPress={handleMoreActions} style={styles.moreButton}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.siteStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(site.monthlyRevenue || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>This Month</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {formatNumber(site.monthlyVisitors || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Visitors</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {site.totalProducts || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Products</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {site.totalPosts || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Posts</Text>
          </View>
        </View>

        <View style={styles.siteFooter}>
          <View style={styles.themeInfo}>
            <Ionicons name="color-palette-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.themeText, { color: colors.textSecondary }]}>
              {site.theme || 'Default'}
            </Text>
          </View>
          <View style={styles.performanceInfo}>
            <Ionicons 
              name={site.conversionRate && site.conversionRate > 2 ? "trending-up" : "trending-down"} 
              size={16} 
              color={site.conversionRate && site.conversionRate > 2 ? colors.success : colors.warning} 
            />
            <Text style={[styles.conversionText, { color: colors.textSecondary }]}>
              {site.conversionRate ? `${site.conversionRate.toFixed(1)}%` : '0%'} CVR
            </Text>
          </View>
        </View>
    </AnimatedCard>
  );
};

export default function SitesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: sites = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sites', user?.id],
    queryFn: () => sitesApi.getUserSites(user?.id!),
    enabled: !!user?.id,
  });

  const deleteSiteMutation = useMutation({
    mutationFn: sitesApi.deleteSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites', user?.id] });
      showMessage({
        message: 'Site deleted successfully',
        type: 'success',
      });
    },
    onError: (error: any) => {
      showMessage({
        message: error.message || 'Failed to delete site',
        type: 'danger',
      });
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSitePress = (site: Site) => {
    router.push({
      pathname: '/site/[id]',
      params: { id: site.id },
    });
  };

  const handleEditSite = (site: Site) => {
    router.push({
      pathname: '/site/edit/[id]',
      params: { id: site.id },
    });
  };

  const handleDeleteSite = (site: Site) => {
    Alert.alert(
      'Delete Site',
      `Are you sure you want to delete "${site.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSiteMutation.mutate(site.id),
        },
      ]
    );
  };

  const handleShareSite = async (site: Site) => {
    try {
      await Share.share({
        message: `Check out my affiliate site: ${site.name} - ${site.domain}`,
        url: `https://${site.domain}`,
        title: site.name,
      });
    } catch (error) {
      console.error('Error sharing site:', error);
    }
  };

  const handleCreateSite = () => {
    haptics.buttonPress();
    router.push('/site/create');
  };

  const renderSiteItem = ({ item, index }: { item: Site; index: number }) => (
    <SiteCard
      site={item}
      onPress={() => handleSitePress(item)}
      onEdit={() => handleEditSite(item)}
      onDelete={() => handleDeleteSite(item)}
      onShare={() => handleShareSite(item)}
      colors={colors}
    />
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 4,
    },
    createButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    siteCard: {
      marginBottom: 16,
    },
    siteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    siteInfo: {
      flex: 1,
      marginRight: 12,
    },
    siteActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    siteName: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 4,
    },
    siteDomain: {
      fontSize: 14,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    moreButton: {
      padding: 4,
    },
    siteStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 8,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
    },
    siteFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    themeInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    themeText: {
      fontSize: 14,
    },
    performanceInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    conversionText: {
      fontSize: 14,
      fontWeight: '600',
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
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Your Sites</Text>
            <Text style={styles.subtitle}>Loading...</Text>
          </View>
        </View>
        <View style={styles.content}>
          <SkeletonLoader.SiteList count={3} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Your Sites</Text>
            <Text style={styles.subtitle}>Error loading sites</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load your sites. Please check your connection and try again.
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
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your Sites</Text>
          <Text style={styles.subtitle}>
            {sites.length > 0 ? `${sites.length} site${sites.length > 1 ? 's' : ''}` : 'No sites yet'}
          </Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateSite}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {sites.length === 0 ? (
          <EmptyState
            icon="globe-outline"
            title="No Sites Yet"
            description="Create your first affiliate site to get started with AffiliateOS. Build high-converting affiliate websites in minutes."
            actionText="Create Your First Site"
            onAction={handleCreateSite}
          />
        ) : (
          <FlatList
            data={sites}
            keyExtractor={(item) => item.id}
            renderItem={renderSiteItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        )}
        
        <FloatingActionButton
          icon="add"
          onPress={handleCreateSite}
          position="bottom-right"
          backgroundColor={colors.primary}
        />
      </View>
    </SafeAreaView>
  );
}