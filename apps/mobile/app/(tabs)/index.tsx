import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../src/providers/ThemeProvider';
import { useAuth } from '../../src/providers/AuthProvider';
import { sitesApi, analyticsApi } from '../../src/services/api';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: sites = [],
    isLoading: sitesLoading,
    refetch: refetchSites,
  } = useQuery({
    queryKey: ['sites', user?.id],
    queryFn: () => sitesApi.getUserSites(user?.id!),
    enabled: !!user?.id,
  });

  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['analytics', user?.id, '30d'],
    queryFn: () => analyticsApi.getAnalytics(user?.id!, '30d'),
    enabled: !!user?.id,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSites(), refetchAnalytics()]);
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(10, 126, 164, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  const revenueData = {
    labels: analytics?.revenueChart?.labels || [],
    datasets: [
      {
        data: analytics?.revenueChart?.data || [0],
        color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    scrollContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 24,
      gap: 16,
    },
    metricCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricIcon: {
      marginBottom: 8,
    },
    metricValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    metricLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    chartCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    quickActions: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    actionCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionIcon: {
      marginBottom: 8,
    },
    actionText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    recentActivity: {
      marginBottom: 24,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    activityIcon: {
      marginRight: 12,
    },
    activityContent: {
      flex: 1,
    },
    activityTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    activityTime: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    createSiteButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 16,
    },
    createSiteText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    rankBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    rankText: {
      fontSize: 14,
      fontWeight: '600',
    },
    conversionRate: {
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (sites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome to AffiliateOS</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="globe-outline" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            You don't have any sites yet.{'\n'}Create your first affiliate site to get started!
          </Text>
          <TouchableOpacity
            style={styles.createSiteButton}
            onPress={() => router.push('/sites')}
          >
            <Text style={styles.createSiteText}>Create Your First Site</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          {sites.length > 0 ? `Managing ${sites.length} site${sites.length > 1 ? 's' : ''}` : 'Getting started'}
        </Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {(sitesLoading || analyticsLoading) ? (
          <LoadingSpinner text="Loading dashboard..." />
        ) : (
          <>
            {analytics && (
              <>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCard}>
                    <Ionicons name="cash-outline" size={24} color={colors.success} style={styles.metricIcon} />
                    <Text style={styles.metricValue}>
                      {analytics.totalRevenue}
                    </Text>
                    <Text style={styles.metricLabel}>Total Revenue</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Ionicons name="trending-up-outline" size={24} color={colors.primary} style={styles.metricIcon} />
                    <Text style={styles.metricValue}>{analytics.totalVisits}</Text>
                    <Text style={styles.metricLabel}>Total Visits</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Ionicons name="stats-chart-outline" size={24} color={colors.accent} style={styles.metricIcon} />
                    <Text style={styles.metricValue}>
                      {analytics.conversionRate}
                    </Text>
                    <Text style={styles.metricLabel}>Conversion Rate</Text>
                  </View>

                  <View style={styles.metricCard}>
                    <Ionicons name="wallet-outline" size={24} color={colors.warning} style={styles.metricIcon} />
                    <Text style={styles.metricValue}>
                      {analytics.avgOrderValue}
                    </Text>
                    <Text style={styles.metricLabel}>Avg Order Value</Text>
                  </View>
                </View>

                {revenueData.labels.length > 0 && (
                  <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Revenue Trend (7 days)</Text>
                    <LineChart
                      data={revenueData}
                      width={screenWidth - 72}
                      height={220}
                      chartConfig={chartConfig}
                      bezier
                      style={{
                        borderRadius: 8,
                      }}
                    />
                  </View>
                )}
              </>
            )}

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/site/create')}
            >
              <Ionicons name="add-circle-outline" size={32} color={colors.primary} style={styles.actionIcon} />
              <Text style={styles.actionText}>Create New Site</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/products')}
            >
              <Ionicons name="cube-outline" size={32} color={colors.success} style={styles.actionIcon} />
              <Text style={styles.actionText}>Manage Products</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/content/create')}
            >
              <Ionicons name="document-text-outline" size={32} color={colors.warning} style={styles.actionIcon} />
              <Text style={styles.actionText}>Create Content</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/analytics')}
            >
              <Ionicons name="analytics-outline" size={32} color={colors.accent} style={styles.actionIcon} />
              <Text style={styles.actionText}>View Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

            {/* Top Sites Section */}
            {analytics?.topSites && analytics.topSites.length > 0 && (
              <View style={styles.recentActivity}>
                <Text style={styles.sectionTitle}>Top Performing Sites</Text>
                {analytics.topSites.slice(0, 3).map((site, index) => (
                  <View key={site.id} style={styles.activityItem}>
                    <View style={[styles.rankBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.rankText, { color: colors.primary }]}>#{index + 1}</Text>
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{site.name}</Text>
                      <Text style={styles.activityTime}>
                        {site.revenue} revenue • {site.visits} visits
                      </Text>
                    </View>
                    <Text style={[styles.conversionRate, { color: colors.success }]}>
                      {site.conversionRate}%
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}