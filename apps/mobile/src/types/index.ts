export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface Product {
  id: string;
  asin: string;
  title: string;
  description?: string;
  image?: string;
  images?: string[];
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  category: string;
  subcategory?: string;
  brand?: string;
  isActive: boolean;
  affiliateUrl: string;
  totalRevenue: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  siteId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Content {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  type: 'post' | 'page' | 'review';
  siteId: string;
  authorId: string;
  featuredImage?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  categories?: string[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}