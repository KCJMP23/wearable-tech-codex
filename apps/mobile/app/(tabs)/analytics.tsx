import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useQuery } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';
import { useTheme } from '../../src/providers/ThemeProvider';
import { useAuth } from '../../src/providers/AuthProvider';
import { analyticsApi } from '../../src/services/api';
import { LoadingSpinner } from '../../src/components/common/LoadingSpinner';
import { SkeletonLoader } from '../../src/components/common/SkeletonLoader';
import { AnimatedCard, AnimatedCounter } from '../../src/components/common/AnimatedComponents';
import { Card, CardContent, Badge } from '../../src/components/ui';
import { haptics } from '../../src/utils/haptics';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;

type TimeRange = '7d' | '30d' | '90d' | '1y';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: string;
  colors: any;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType,
  icon,
  colors,
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return colors.success;
      case 'negative':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return 'trending-up';
      case 'negative':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  return (
    <AnimatedCard style={styles.metricCard} hapticFeedback={false}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon as any} size={24} color={colors.primary} />
        <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <AnimatedCounter 
        value={parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0}
        style={[styles.metricValue, { color: colors.text }]}
        prefix={value.includes('$') ? '$' : ''}
        suffix={value.includes('%') ? '%' : ''}
      />
      <View style={styles.metricChange}>
        <Ionicons name={getChangeIcon() as any} size={16} color={getChangeColor()} />
        <Text style={[styles.changeText, { color: getChangeColor() }]}>{change}</Text>
      </View>
    </AnimatedCard>
  );
};

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: analytics,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['analytics', user?.id, timeRange],
    queryFn: () => analyticsApi.getAnalytics(user?.id!, timeRange),
    enabled: !!user?.id,
  });

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    style: {
      borderRadius: 12,
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: '600',
    },
  };

  const revenueChartData = useMemo(() => {
    if (!analytics?.revenueChart?.data?.length) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }
    
    return {
      labels: analytics.revenueChart.labels,
      datasets: [
        {
          data: analytics.revenueChart.data,
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  }, [analytics?.revenueChart]);

  const trafficChartData = useMemo(() => {
    if (!analytics?.trafficChart?.data?.length) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }
    
    return {
      labels: analytics.trafficChart.labels,
      datasets: [
        {
          data: analytics.trafficChart.data,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        },
      ],
    };
  }, [analytics?.trafficChart]);

  const categoryChartData = useMemo(() => {
    if (!analytics?.revenueByCategory?.length) {
      return [];
    }
    
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', 
      '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
    ];
    
    return analytics.revenueByCategory.map((item, index) => ({
      name: item.category,
      revenue: item.revenue,
      color: colors[index % colors.length],
      legendFontColor: colors.text,
      legendFontSize: 12,
    }));
  }, [analytics?.revenueByCategory, colors.text]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const getTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case '90d':
        return 'Last 90 Days';
      case '1y':
        return 'Last Year';
      default:
        return 'Last 30 Days';
    }
  };

  const getChangeType = (change: string): 'positive' | 'negative' | 'neutral' => {
    if (change.includes('+')) return 'positive';
    if (change.includes('-')) return 'negative';
    return 'neutral';
  };

  const handleTimeRangeChange = () => {
    haptics.selection();
    Alert.alert(
      'Select Time Range',
      'Choose the time period for analytics',
      [
        { text: 'Last 7 Days', onPress: () => { haptics.tap(); setTimeRange('7d'); } },
        { text: 'Last 30 Days', onPress: () => { haptics.tap(); setTimeRange('30d'); } },
        { text: 'Last 90 Days', onPress: () => { haptics.tap(); setTimeRange('90d'); } },
        { text: 'Last Year', onPress: () => { haptics.tap(); setTimeRange('1y'); } },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleExportData = () => {
    showMessage({
      message: 'Export feature coming soon!',
      description: 'You will be able to export your analytics data to PDF or CSV.',
      type: 'info',
    });
  };

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
    headerLeft: {
      flex: 1,
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
    headerActions: {
      flexDirection: 'row',
      gap: 12,
    },
    timeRangeButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    timeRangeText: {
      color: 'white',
      fontSize: 14,
      fontWeight: '600',
    },
    exportButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
      borderRadius: 8,
    },
    scrollContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 24,
      gap: 12,
    },
    metricCard: {
      flex: 1,
      minWidth: '47%',
    },
    metricContent: {
      padding: 16,
    },
    metricHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    metricTitle: {
      fontSize: 14,
      fontWeight: '500',
    },
    metricValue: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    metricChange: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    changeText: {
      fontSize: 14,
      fontWeight: '600',
    },
    chartSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    chartCard: {
      marginBottom: 16,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    topPerformers: {
      marginBottom: 24,
    },
    performerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.card,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    performerLeft: {
      flex: 1,
    },
    performerName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    performerMetric: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    performerValue: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.success,
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
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>Loading data...</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <SkeletonLoader.AnalyticsGrid count={4} />
          <SkeletonLoader.ChartSkeleton />
          <SkeletonLoader.ChartSkeleton />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Analytics</Text>
            <Text style={styles.subtitle}>Error loading data</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load analytics data. Please check your connection and try again.
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
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>{getTimeRangeLabel(timeRange)}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.timeRangeButton} onPress={handleTimeRangeChange}>
            <Text style={styles.timeRangeText}>{timeRange.toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportButton} onPress={handleExportData}>
            <Ionicons name="download-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
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
        showsVerticalScrollIndicator={false}
      >
        {analytics && (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsGrid}>
              <MetricCard
                title="Revenue"
                value={analytics.totalRevenue}
                change={analytics.revenueChange}
                changeType={getChangeType(analytics.revenueChange)}
                icon="cash-outline"
                colors={colors}
              />
              <MetricCard
                title="Visits"
                value={analytics.totalVisits}
                change={analytics.visitsChange}
                changeType={getChangeType(analytics.visitsChange)}
                icon="trending-up-outline"
                colors={colors}
              />
              <MetricCard
                title="Conversion Rate"
                value={analytics.conversionRate}
                change={analytics.conversionChange}
                changeType={getChangeType(analytics.conversionChange)}
                icon="stats-chart-outline"
                colors={colors}
              />
              <MetricCard
                title="Avg Order Value"
                value={analytics.avgOrderValue}
                change={analytics.aovChange}
                changeType={getChangeType(analytics.aovChange)}
                icon="wallet-outline"
                colors={colors}
              />
            </View>

            {/* Revenue Chart */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>Revenue Trend</Text>
              <Card style={styles.chartCard}>
                <CardContent>
                  <Text style={styles.chartTitle}>Revenue Over Time</Text>
                  <LineChart
                    data={revenueChartData}
                    width={chartWidth - 32}
                    height={220}
                    chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                    }}
                    bezier
                    style={{ borderRadius: 8 }}
                  />
                </CardContent>
              </Card>
            </View>

            {/* Traffic Chart */}
            <View style={styles.chartSection}>
              <Text style={styles.sectionTitle}>Traffic Analysis</Text>
              <Card style={styles.chartCard}>
                <CardContent>
                  <Text style={styles.chartTitle}>Visitors Over Time</Text>
                  <BarChart
                    data={trafficChartData}
                    width={chartWidth - 32}
                    height={220}
                    chartConfig={chartConfig}
                    style={{ borderRadius: 8 }}
                    yAxisLabel=""
                    yAxisSuffix=""
                  />
                </CardContent>
              </Card>
            </View>

            {/* Revenue by Category */}
            {categoryChartData.length > 0 && (
              <View style={styles.chartSection}>
                <Text style={styles.sectionTitle}>Revenue by Category</Text>
                <Card style={styles.chartCard}>
                  <CardContent>
                    <Text style={styles.chartTitle}>Category Performance</Text>
                    <PieChart
                      data={categoryChartData}
                      width={chartWidth - 32}
                      height={220}
                      chartConfig={chartConfig}
                      accessor="revenue"
                      backgroundColor="transparent"
                      paddingLeft="15"
                      style={{ borderRadius: 8 }}
                    />
                  </CardContent>
                </Card>
              </View>
            )}

            {/* Top Sites */}
            {analytics.topSites && analytics.topSites.length > 0 && (
              <View style={styles.topPerformers}>
                <Text style={styles.sectionTitle}>Top Performing Sites</Text>
                {analytics.topSites.slice(0, 5).map((site, index) => (
                  <View key={site.id} style={styles.performerItem}>
                    <View style={styles.performerLeft}>
                      <Text style={styles.performerName}>
                        #{index + 1} {site.name}
                      </Text>
                      <Text style={styles.performerMetric}>
                        {site.visits} visits • {site.conversionRate}% CVR
                      </Text>
                    </View>
                    <Text style={styles.performerValue}>{site.revenue}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Top Products */}
            {analytics.topProducts && analytics.topProducts.length > 0 && (
              <View style={styles.topPerformers}>
                <Text style={styles.sectionTitle}>Top Performing Products</Text>
                {analytics.topProducts.slice(0, 5).map((product, index) => (
                  <View key={product.id} style={styles.performerItem}>
                    <View style={styles.performerLeft}>
                      <Text style={styles.performerName}>
                        #{index + 1} {product.title}
                      </Text>
                      <Text style={styles.performerMetric}>
                        {product.clicks} clicks • {product.conversions} sales
                      </Text>
                    </View>
                    <Text style={styles.performerValue}>{product.revenue}</Text>
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