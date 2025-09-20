import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Share,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { showMessage } from 'react-native-flash-message';
import { useTheme } from '../src/providers/ThemeProvider';
import { useAuth } from '../src/providers/AuthProvider';
import { productsApi } from '../src/services/api';
import { LoadingSpinner } from '../src/components/common/LoadingSpinner';
import { EmptyState } from '../src/components/common/EmptyState';
import { Card, CardContent, Button, Badge } from '../src/components/ui';
import { Product } from '../src/types';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  colors: any;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onEdit,
  onDelete,
  onShare,
  colors
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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

  const getPerformanceBadge = () => {
    if (product.conversionRate >= 5) {
      return { variant: 'success' as const, text: 'High Performer' };
    }
    if (product.conversionRate >= 2) {
      return { variant: 'info' as const, text: 'Good' };
    }
    if (product.conversionRate >= 1) {
      return { variant: 'warning' as const, text: 'Average' };
    }
    return { variant: 'error' as const, text: 'Low' };
  };

  const handleMoreActions = () => {
    Alert.alert(
      product.title,
      'Choose an action',
      [
        { text: 'View Details', onPress: onPress },
        { text: 'Edit Product', onPress: onEdit },
        { text: 'Share', onPress: onShare },
        { text: 'Delete', onPress: onDelete, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const performanceBadge = getPerformanceBadge();

  return (
    <Card style={styles.productCard}>
      <CardContent>
        <View style={styles.productHeader}>
          <TouchableOpacity style={styles.productInfo} onPress={onPress}>
            {product.image && (
              <Image 
                source={{ uri: product.image }} 
                style={styles.productImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.productDetails}>
              <Text style={[styles.productTitle, { color: colors.text }]} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={[styles.productBrand, { color: colors.textSecondary }]}>
                {product.brand || 'Unknown Brand'}
              </Text>
              <View style={styles.productPricing}>
                <Text style={[styles.productPrice, { color: colors.success }]}>
                  {formatCurrency(product.price)}
                </Text>
                {product.originalPrice && product.originalPrice > product.price && (
                  <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                    {formatCurrency(product.originalPrice)}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.productActions}>
            <Badge variant={performanceBadge.variant} size="sm">
              {performanceBadge.text}
            </Badge>
            <TouchableOpacity onPress={handleMoreActions} style={styles.moreButton}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.productStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(product.totalRevenue)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Revenue</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {formatNumber(product.totalClicks)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Clicks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {product.totalConversions}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sales</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>
              {product.conversionRate.toFixed(1)}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>CVR</Text>
          </View>
        </View>

        <View style={styles.productFooter}>
          <View style={styles.categoryInfo}>
            <Ionicons name="pricetag-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
              {product.category}
            </Text>
          </View>
          <View style={styles.ratingInfo}>
            {product.rating && (
              <>
                <Ionicons name="star" size={16} color="#fbbf24" />
                <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                  {product.rating.toFixed(1)} ({formatNumber(product.reviewCount || 0)})
                </Text>
              </>
            )}
          </View>
        </View>
      </CardContent>
    </Card>
  );
};

export default function ProductsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const siteId = params.siteId as string;

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const {
    data: productsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', page, searchQuery, siteId],
    queryFn: () => productsApi.getProducts(page, 20, searchQuery),
    keepPreviousData: true,
  });

  const deleteProductMutation = useMutation({
    mutationFn: productsApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showMessage({
        message: 'Product deleted successfully',
        type: 'success',
      });
    },
    onError: (error: any) => {
      showMessage({
        message: error.message || 'Failed to delete product',
        type: 'danger',
      });
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await refetch();
    setRefreshing(false);
  };

  const handleLoadMore = useCallback(() => {
    if (productsData?.pagination?.hasNext && !loadingMore) {
      setLoadingMore(true);
      setPage(prev => prev + 1);
      setTimeout(() => setLoadingMore(false), 1000);
    }
  }, [productsData?.pagination?.hasNext, loadingMore]);

  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    setPage(1);
  }, []);

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: '/product/[id]',
      params: { id: product.id },
    });
  };

  const handleEditProduct = (product: Product) => {
    router.push({
      pathname: '/product/edit/[id]',
      params: { id: product.id },
    });
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProductMutation.mutate(product.id),
        },
      ]
    );
  };

  const handleShareProduct = async (product: Product) => {
    try {
      await Share.share({
        message: `Check out this product: ${product.title} - ${product.affiliateUrl}`,
        url: product.affiliateUrl,
        title: product.title,
      });
    } catch (error) {
      console.error('Error sharing product:', error);
    }
  };

  const handleImportProducts = () => {
    router.push('/products/import');
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item)}
      onEdit={() => handleEditProduct(item)}
      onDelete={() => handleDeleteProduct(item)}
      onShare={() => handleShareProduct(item)}
      colors={colors}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <LoadingSpinner size="small" />
      </View>
    );
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
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
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
    importButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 12,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    productCard: {
      marginBottom: 16,
    },
    productHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    productInfo: {
      flex: 1,
      flexDirection: 'row',
      marginRight: 12,
    },
    productImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 12,
    },
    productDetails: {
      flex: 1,
    },
    productTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    productBrand: {
      fontSize: 14,
      marginBottom: 8,
    },
    productPricing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    productPrice: {
      fontSize: 16,
      fontWeight: '600',
    },
    originalPrice: {
      fontSize: 14,
      textDecorationLine: 'line-through',
    },
    productActions: {
      alignItems: 'flex-end',
      gap: 8,
    },
    moreButton: {
      padding: 4,
    },
    productStats: {
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
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
    },
    productFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    categoryText: {
      fontSize: 14,
    },
    ratingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ratingText: {
      fontSize: 14,
    },
    loadingMore: {
      paddingVertical: 16,
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

  const products = productsData?.data || [];
  const totalProducts = productsData?.pagination?.total || 0;

  if (isLoading && !products.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Products</Text>
              <Text style={styles.subtitle}>Loading...</Text>
            </View>
          </View>
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Products</Text>
              <Text style={styles.subtitle}>Error loading products</Text>
            </View>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to load products. Please check your connection and try again.
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
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Products</Text>
            <Text style={styles.subtitle}>
              {totalProducts > 0 ? `${totalProducts} product${totalProducts > 1 ? 's' : ''}` : 'No products yet'}
            </Text>
          </View>
          <TouchableOpacity style={styles.importButton} onPress={handleImportProducts}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      <View style={styles.content}>
        {products.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title="No Products Yet"
            description="Import Amazon products to start earning affiliate commissions. Add products to your sites and track their performance."
            actionText="Import Products"
            onAction={handleImportProducts}
          />
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={renderProductItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.1}
            ListFooterComponent={renderFooter}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}