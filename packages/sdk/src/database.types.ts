/**
 * Database type definitions for Supabase
 * Generated and manually maintained for type safety
 * 
 * This file contains comprehensive type definitions for all database tables
 * and is compatible with Supabase's TypeScript integration.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      // =======================================================================
      // Core Platform Tables
      // =======================================================================
      
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          domain: string | null;
          config: Json;
          amazon_tag: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          domain?: string | null;
          config?: Json;
          amazon_tag?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          domain?: string | null;
          config?: Json;
          amazon_tag?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      products: {
        Row: {
          id: string;
          tenant_id: string;
          asin: string;
          title: string;
          description: string | null;
          price: number | null;
          original_price: number | null;
          currency: string;
          rating: number | null;
          review_count: number | null;
          category: string | null;
          subcategory: string | null;
          brand: string | null;
          images: Json;
          features: string[];
          affiliate_url: string | null;
          in_stock: boolean;
          is_prime: boolean;
          last_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          asin: string;
          title: string;
          description?: string | null;
          price?: number | null;
          original_price?: number | null;
          currency?: string;
          rating?: number | null;
          review_count?: number | null;
          category?: string | null;
          subcategory?: string | null;
          brand?: string | null;
          images?: Json;
          features?: string[];
          affiliate_url?: string | null;
          in_stock?: boolean;
          is_prime?: boolean;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          asin?: string;
          title?: string;
          description?: string | null;
          price?: number | null;
          original_price?: number | null;
          currency?: string;
          rating?: number | null;
          review_count?: number | null;
          category?: string | null;
          subcategory?: string | null;
          brand?: string | null;
          images?: Json;
          features?: string[];
          affiliate_url?: string | null;
          in_stock?: boolean;
          is_prime?: boolean;
          last_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      posts: {
        Row: {
          id: string;
          tenant_id: string;
          type: string;
          title: string;
          slug: string;
          excerpt: string | null;
          body_mdx: string | null;
          images: Json;
          status: string;
          published_at: string | null;
          seo: Json;
          jsonld: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type?: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          body_mdx?: string | null;
          images?: Json;
          status?: string;
          published_at?: string | null;
          seo?: Json;
          jsonld?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          type?: string;
          title?: string;
          slug?: string;
          excerpt?: string | null;
          body_mdx?: string | null;
          images?: Json;
          status?: string;
          published_at?: string | null;
          seo?: Json;
          jsonld?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "posts_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      insights: {
        Row: {
          id: string;
          tenant_id: string;
          type: string | null;
          source: string | null;
          headline: string | null;
          body: string | null;
          kpi: string | null;
          value: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type?: string | null;
          source?: string | null;
          headline?: string | null;
          body?: string | null;
          kpi?: string | null;
          value?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          type?: string | null;
          source?: string | null;
          headline?: string | null;
          body?: string | null;
          kpi?: string | null;
          value?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "insights_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      agent_tasks: {
        Row: {
          id: string;
          tenant_id: string;
          type: string;
          status: string;
          input: Json;
          output: Json | null;
          error: string | null;
          attempts: number;
          scheduled_for: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type: string;
          status?: string;
          input?: Json;
          output?: Json | null;
          error?: string | null;
          attempts?: number;
          scheduled_for?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          type?: string;
          status?: string;
          input?: Json;
          output?: Json | null;
          error?: string | null;
          attempts?: number;
          scheduled_for?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_tasks_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      webhook_logs: {
        Row: {
          id: string;
          tenant_id: string | null;
          webhook_type: string | null;
          payload: Json | null;
          response: Json | null;
          error: string | null;
          status: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          webhook_type?: string | null;
          payload?: Json | null;
          response?: Json | null;
          error?: string | null;
          status?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          webhook_type?: string | null;
          payload?: Json | null;
          response?: Json | null;
          error?: string | null;
          status?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      // =======================================================================
      // Phase 2: Proprietary Affiliate Network Tables
      // =======================================================================

      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          website_url: string | null;
          commission_rate: number | null;
          exclusive_rate: number | null;
          contact_email: string | null;
          api_endpoint: string | null;
          api_key_encrypted: string | null;
          status: string;
          tier: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          website_url?: string | null;
          commission_rate?: number | null;
          exclusive_rate?: number | null;
          contact_email?: string | null;
          api_endpoint?: string | null;
          api_key_encrypted?: string | null;
          status?: string;
          tier?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          website_url?: string | null;
          commission_rate?: number | null;
          exclusive_rate?: number | null;
          contact_email?: string | null;
          api_endpoint?: string | null;
          api_key_encrypted?: string | null;
          status?: string;
          tier?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      brand_partnerships: {
        Row: {
          id: string;
          tenant_id: string;
          brand_id: string;
          commission_rate: number | null;
          status: string;
          contract_start_date: string | null;
          contract_end_date: string | null;
          exclusive: boolean;
          performance_bonus: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          brand_id: string;
          commission_rate?: number | null;
          status?: string;
          contract_start_date?: string | null;
          contract_end_date?: string | null;
          exclusive?: boolean;
          performance_bonus?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          brand_id?: string;
          commission_rate?: number | null;
          status?: string;
          contract_start_date?: string | null;
          contract_end_date?: string | null;
          exclusive?: boolean;
          performance_bonus?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "brand_partnerships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "brand_partnerships_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };

      private_marketplace: {
        Row: {
          id: string;
          brand_id: string;
          product_id: string;
          title: string;
          description: string | null;
          price: number;
          original_price: number | null;
          currency: string;
          images: Json;
          features: string[];
          category: string | null;
          commission_rate: number | null;
          exclusive: boolean;
          stock_quantity: number | null;
          availability_start: string | null;
          availability_end: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand_id: string;
          product_id: string;
          title: string;
          description?: string | null;
          price: number;
          original_price?: number | null;
          currency?: string;
          images?: Json;
          features?: string[];
          category?: string | null;
          commission_rate?: number | null;
          exclusive?: boolean;
          stock_quantity?: number | null;
          availability_start?: string | null;
          availability_end?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand_id?: string;
          product_id?: string;
          title?: string;
          description?: string | null;
          price?: number;
          original_price?: number | null;
          currency?: string;
          images?: Json;
          features?: string[];
          category?: string | null;
          commission_rate?: number | null;
          exclusive?: boolean;
          stock_quantity?: number | null;
          availability_start?: string | null;
          availability_end?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "private_marketplace_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };

      blockchain_transactions: {
        Row: {
          id: string;
          tenant_id: string;
          transaction_hash: string | null;
          transaction_type: string;
          user_wallet: string | null;
          amount_wei: string | null; // bigint as string
          token_address: string | null;
          product_id: string | null;
          click_id: string | null;
          conversion_id: string | null;
          metadata: Json;
          block_number: string | null; // bigint as string
          gas_used: number | null;
          gas_price: string | null; // bigint as string
          status: string;
          created_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          transaction_hash?: string | null;
          transaction_type: string;
          user_wallet?: string | null;
          amount_wei?: string | null;
          token_address?: string | null;
          product_id?: string | null;
          click_id?: string | null;
          conversion_id?: string | null;
          metadata?: Json;
          block_number?: string | null;
          gas_used?: number | null;
          gas_price?: string | null;
          status?: string;
          created_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          transaction_hash?: string | null;
          transaction_type?: string;
          user_wallet?: string | null;
          amount_wei?: string | null;
          token_address?: string | null;
          product_id?: string | null;
          click_id?: string | null;
          conversion_id?: string | null;
          metadata?: Json;
          block_number?: string | null;
          gas_used?: number | null;
          gas_price?: string | null;
          status?: string;
          created_at?: string;
          confirmed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "blockchain_transactions_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      user_rewards: {
        Row: {
          id: string;
          tenant_id: string;
          user_identifier: string;
          reward_type: string;
          amount: number;
          source: string | null;
          reference_id: string | null;
          status: string;
          expires_at: string | null;
          distributed_at: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_identifier: string;
          reward_type: string;
          amount: number;
          source?: string | null;
          reference_id?: string | null;
          status?: string;
          expires_at?: string | null;
          distributed_at?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_identifier?: string;
          reward_type?: string;
          amount?: number;
          source?: string | null;
          reference_id?: string | null;
          status?: string;
          expires_at?: string | null;
          distributed_at?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_rewards_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      tenant_settings: {
        Row: {
          id: string;
          tenant_id: string;
          setting_key: string;
          setting_value: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          setting_key: string;
          setting_value?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          setting_key?: string;
          setting_value?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      // =======================================================================
      // Phase 2: Mobile Ecosystem Tables
      // =======================================================================

      mobile_devices: {
        Row: {
          id: string;
          tenant_id: string;
          user_identifier: string;
          device_type: string;
          device_token: string;
          app_version: string | null;
          os_version: string | null;
          timezone: string | null;
          language: string | null;
          active: boolean;
          last_seen_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_identifier: string;
          device_type: string;
          device_token: string;
          app_version?: string | null;
          os_version?: string | null;
          timezone?: string | null;
          language?: string | null;
          active?: boolean;
          last_seen_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_identifier?: string;
          device_type?: string;
          device_token?: string;
          app_version?: string | null;
          os_version?: string | null;
          timezone?: string | null;
          language?: string | null;
          active?: boolean;
          last_seen_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mobile_devices_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      notification_campaigns: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          type: string;
          title: string;
          body: string;
          image_url: string | null;
          deep_link: string | null;
          target_audience: Json;
          scheduled_at: string | null;
          sent_at: string | null;
          status: string;
          delivery_stats: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          type: string;
          title: string;
          body: string;
          image_url?: string | null;
          deep_link?: string | null;
          target_audience?: Json;
          scheduled_at?: string | null;
          sent_at?: string | null;
          status?: string;
          delivery_stats?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          type?: string;
          title?: string;
          body?: string;
          image_url?: string | null;
          deep_link?: string | null;
          target_audience?: Json;
          scheduled_at?: string | null;
          sent_at?: string | null;
          status?: string;
          delivery_stats?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_campaigns_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      notification_logs: {
        Row: {
          id: string;
          campaign_id: string | null;
          tenant_id: string;
          device_id: string | null;
          user_identifier: string;
          type: string;
          status: string;
          title: string;
          body: string;
          delivered_at: string | null;
          opened_at: string | null;
          clicked_at: string | null;
          error_message: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id?: string | null;
          tenant_id: string;
          device_id?: string | null;
          user_identifier: string;
          type: string;
          status: string;
          title: string;
          body: string;
          delivered_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string | null;
          tenant_id?: string;
          device_id?: string | null;
          user_identifier?: string;
          type?: string;
          status?: string;
          title?: string;
          body?: string;
          delivered_at?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_logs_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "notification_campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_logs_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "mobile_devices";
            referencedColumns: ["id"];
          }
        ];
      };

      mobile_analytics: {
        Row: {
          id: string;
          tenant_id: string;
          device_id: string | null;
          user_identifier: string | null;
          event_type: string;
          event_data: Json;
          session_id: string | null;
          app_version: string | null;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          device_id?: string | null;
          user_identifier?: string | null;
          event_type: string;
          event_data?: Json;
          session_id?: string | null;
          app_version?: string | null;
          timestamp: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          device_id?: string | null;
          user_identifier?: string | null;
          event_type?: string;
          event_data?: Json;
          session_id?: string | null;
          app_version?: string | null;
          timestamp?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mobile_analytics_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mobile_analytics_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "mobile_devices";
            referencedColumns: ["id"];
          }
        ];
      };

      // =======================================================================
      // Phase 2: API Economy Tables
      // =======================================================================

      developer_profiles: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          company: string | null;
          email: string;
          website: string | null;
          bio: string | null;
          avatar_url: string | null;
          verified: boolean;
          tier: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          company?: string | null;
          email: string;
          website?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          verified?: boolean;
          tier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          company?: string | null;
          email?: string;
          website?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          verified?: boolean;
          tier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      developer_apps: {
        Row: {
          id: string;
          developer_id: string;
          name: string;
          description: string | null;
          category: string;
          api_key: string;
          secret_key_hash: string;
          webhook_url: string | null;
          webhook_secret: string | null;
          permissions: string[];
          pricing_model: string;
          pricing_details: Json;
          status: string;
          installs_count: number;
          rating: number | null;
          rating_count: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          developer_id: string;
          name: string;
          description?: string | null;
          category: string;
          api_key: string;
          secret_key_hash: string;
          webhook_url?: string | null;
          webhook_secret?: string | null;
          permissions?: string[];
          pricing_model?: string;
          pricing_details?: Json;
          status?: string;
          installs_count?: number;
          rating?: number | null;
          rating_count?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          developer_id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          api_key?: string;
          secret_key_hash?: string;
          webhook_url?: string | null;
          webhook_secret?: string | null;
          permissions?: string[];
          pricing_model?: string;
          pricing_details?: Json;
          status?: string;
          installs_count?: number;
          rating?: number | null;
          rating_count?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "developer_apps_developer_id_fkey";
            columns: ["developer_id"];
            isOneToOne: false;
            referencedRelation: "developer_profiles";
            referencedColumns: ["id"];
          }
        ];
      };

      app_installations: {
        Row: {
          id: string;
          tenant_id: string;
          app_id: string;
          status: string;
          config: Json;
          installed_by: string | null;
          installed_at: string;
          last_used_at: string | null;
          usage_stats: Json;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          app_id: string;
          status?: string;
          config?: Json;
          installed_by?: string | null;
          installed_at?: string;
          last_used_at?: string | null;
          usage_stats?: Json;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          app_id?: string;
          status?: string;
          config?: Json;
          installed_by?: string | null;
          installed_at?: string;
          last_used_at?: string | null;
          usage_stats?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "app_installations_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "app_installations_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "developer_apps";
            referencedColumns: ["id"];
          }
        ];
      };

      api_usage_logs: {
        Row: {
          id: string;
          app_id: string;
          tenant_id: string | null;
          endpoint: string;
          method: string;
          status_code: number;
          response_time_ms: number | null;
          request_size_bytes: number | null;
          response_size_bytes: number | null;
          user_agent: string | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          app_id: string;
          tenant_id?: string | null;
          endpoint: string;
          method: string;
          status_code: number;
          response_time_ms?: number | null;
          request_size_bytes?: number | null;
          response_size_bytes?: number | null;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          app_id?: string;
          tenant_id?: string | null;
          endpoint?: string;
          method?: string;
          status_code?: number;
          response_time_ms?: number | null;
          request_size_bytes?: number | null;
          response_size_bytes?: number | null;
          user_agent?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_usage_logs_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "developer_apps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "api_usage_logs_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      webhooks: {
        Row: {
          id: string;
          tenant_id: string;
          app_id: string | null;
          name: string;
          url: string;
          secret: string | null;
          events: string[];
          active: boolean;
          retry_count: number;
          timeout_seconds: number;
          headers: Json;
          last_triggered_at: string | null;
          last_status: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          app_id?: string | null;
          name: string;
          url: string;
          secret?: string | null;
          events: string[];
          active?: boolean;
          retry_count?: number;
          timeout_seconds?: number;
          headers?: Json;
          last_triggered_at?: string | null;
          last_status?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          app_id?: string | null;
          name?: string;
          url?: string;
          secret?: string | null;
          events?: string[];
          active?: boolean;
          retry_count?: number;
          timeout_seconds?: number;
          headers?: Json;
          last_triggered_at?: string | null;
          last_status?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhooks_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "webhooks_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "developer_apps";
            referencedColumns: ["id"];
          }
        ];
      };

      // =======================================================================
      // Additional Phase 2 Tables from Migration
      // =======================================================================

      webhook_deliveries: {
        Row: {
          id: string;
          webhook_id: string;
          event_type: string;
          payload: Json;
          attempt: number;
          status_code: number | null;
          response_body: string | null;
          response_headers: Json | null;
          delivered_at: string | null;
          error_message: string | null;
          next_retry_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          webhook_id: string;
          event_type: string;
          payload: Json;
          attempt?: number;
          status_code?: number | null;
          response_body?: string | null;
          response_headers?: Json | null;
          delivered_at?: string | null;
          error_message?: string | null;
          next_retry_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          webhook_id?: string;
          event_type?: string;
          payload?: Json;
          attempt?: number;
          status_code?: number | null;
          response_body?: string | null;
          response_headers?: Json | null;
          delivered_at?: string | null;
          error_message?: string | null;
          next_retry_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey";
            columns: ["webhook_id"];
            isOneToOne: false;
            referencedRelation: "webhooks";
            referencedColumns: ["id"];
          }
        ];
      };

      api_rate_limits: {
        Row: {
          id: string;
          app_id: string;
          endpoint_pattern: string;
          requests_per_minute: number;
          requests_per_hour: number;
          requests_per_day: number;
          burst_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          app_id: string;
          endpoint_pattern: string;
          requests_per_minute?: number;
          requests_per_hour?: number;
          requests_per_day?: number;
          burst_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          app_id?: string;
          endpoint_pattern?: string;
          requests_per_minute?: number;
          requests_per_hour?: number;
          requests_per_day?: number;
          burst_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "developer_apps";
            referencedColumns: ["id"];
          }
        ];
      };

      api_keys: {
        Row: {
          id: string;
          app_id: string;
          key_name: string;
          key_hash: string;
          key_prefix: string;
          permissions: Json;
          environment: string;
          expires_at: string | null;
          last_used_at: string | null;
          created_by: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          app_id: string;
          key_name: string;
          key_hash: string;
          key_prefix: string;
          permissions?: Json;
          environment?: string;
          expires_at?: string | null;
          last_used_at?: string | null;
          created_by?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          app_id?: string;
          key_name?: string;
          key_hash?: string;
          key_prefix?: string;
          permissions?: Json;
          environment?: string;
          expires_at?: string | null;
          last_used_at?: string | null;
          created_by?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_keys_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "developer_apps";
            referencedColumns: ["id"];
          }
        ];
      };

      app_reviews: {
        Row: {
          id: string;
          app_id: string;
          tenant_id: string;
          rating: number;
          title: string | null;
          comment: string | null;
          helpful_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          app_id: string;
          tenant_id: string;
          rating: number;
          title?: string | null;
          comment?: string | null;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          app_id?: string;
          tenant_id?: string;
          rating?: number;
          title?: string | null;
          comment?: string | null;
          helpful_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "app_reviews_app_id_fkey";
            columns: ["app_id"];
            isOneToOne: false;
            referencedRelation: "developer_apps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "app_reviews_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      app_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon_url: string | null;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          icon_url?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          icon_url?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      conversion_events: {
        Row: {
          id: string;
          tenant_id: string;
          user_identifier: string | null;
          session_id: string | null;
          event_type: string;
          product_id: string | null;
          brand_id: string | null;
          affiliate_url: string | null;
          referrer: string | null;
          user_agent: string | null;
          ip_address: string | null;
          country: string | null;
          device_type: string | null;
          conversion_value: number | null;
          currency: string;
          commission_earned: number | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_identifier?: string | null;
          session_id?: string | null;
          event_type: string;
          product_id?: string | null;
          brand_id?: string | null;
          affiliate_url?: string | null;
          referrer?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          country?: string | null;
          device_type?: string | null;
          conversion_value?: number | null;
          currency?: string;
          commission_earned?: number | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_identifier?: string | null;
          session_id?: string | null;
          event_type?: string;
          product_id?: string | null;
          brand_id?: string | null;
          affiliate_url?: string | null;
          referrer?: string | null;
          user_agent?: string | null;
          ip_address?: string | null;
          country?: string | null;
          device_type?: string | null;
          conversion_value?: number | null;
          currency?: string;
          commission_earned?: number | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversion_events_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversion_events_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversion_events_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          }
        ];
      };

      ab_test_experiments: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string | null;
          experiment_type: string;
          status: string;
          traffic_allocation: number;
          start_date: string | null;
          end_date: string | null;
          variants: Json;
          success_metrics: Json;
          results: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string | null;
          experiment_type: string;
          status?: string;
          traffic_allocation?: number;
          start_date?: string | null;
          end_date?: string | null;
          variants: Json;
          success_metrics?: Json;
          results?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          description?: string | null;
          experiment_type?: string;
          status?: string;
          traffic_allocation?: number;
          start_date?: string | null;
          end_date?: string | null;
          variants?: Json;
          success_metrics?: Json;
          results?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ab_test_experiments_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };

      ab_test_participations: {
        Row: {
          id: string;
          experiment_id: string;
          user_identifier: string;
          variant_id: string;
          assigned_at: string;
          converted: boolean;
          conversion_value: number | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          experiment_id: string;
          user_identifier: string;
          variant_id: string;
          assigned_at?: string;
          converted?: boolean;
          conversion_value?: number | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          experiment_id?: string;
          user_identifier?: string;
          variant_id?: string;
          assigned_at?: string;
          converted?: boolean;
          conversion_value?: number | null;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "ab_test_participations_experiment_id_fkey";
            columns: ["experiment_id"];
            isOneToOne: false;
            referencedRelation: "ab_test_experiments";
            referencedColumns: ["id"];
          }
        ];
      };

      affiliate_networks: {
        Row: {
          id: string;
          name: string;
          slug: string;
          api_endpoint: string | null;
          auth_type: string | null;
          auth_config: Json;
          commission_structure: Json;
          tracking_domain: string | null;
          deep_linking_supported: boolean;
          real_time_reporting: boolean;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          api_endpoint?: string | null;
          auth_type?: string | null;
          auth_config?: Json;
          commission_structure?: Json;
          tracking_domain?: string | null;
          deep_linking_supported?: boolean;
          real_time_reporting?: boolean;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          api_endpoint?: string | null;
          auth_type?: string | null;
          auth_config?: Json;
          commission_structure?: Json;
          tracking_domain?: string | null;
          deep_linking_supported?: boolean;
          real_time_reporting?: boolean;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      tenant_network_connections: {
        Row: {
          id: string;
          tenant_id: string;
          network_id: string;
          account_id: string | null;
          tracking_id: string | null;
          api_credentials: Json;
          commission_override: Json;
          active: boolean;
          last_sync_at: string | null;
          sync_status: string;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          network_id: string;
          account_id?: string | null;
          tracking_id?: string | null;
          api_credentials?: Json;
          commission_override?: Json;
          active?: boolean;
          last_sync_at?: string | null;
          sync_status?: string;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          network_id?: string;
          account_id?: string | null;
          tracking_id?: string | null;
          api_credentials?: Json;
          commission_override?: Json;
          active?: boolean;
          last_sync_at?: string | null;
          sync_status?: string;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_network_connections_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_network_connections_network_id_fkey";
            columns: ["network_id"];
            isOneToOne: false;
            referencedRelation: "affiliate_networks";
            referencedColumns: ["id"];
          }
        ];
      };

      product_variants: {
        Row: {
          id: string;
          product_id: string;
          network_id: string | null;
          network_product_id: string | null;
          variant_type: string | null;
          variant_value: string | null;
          price_override: number | null;
          commission_rate: number | null;
          affiliate_url: string | null;
          in_stock: boolean;
          last_updated: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          network_id?: string | null;
          network_product_id?: string | null;
          variant_type?: string | null;
          variant_value?: string | null;
          price_override?: number | null;
          commission_rate?: number | null;
          affiliate_url?: string | null;
          in_stock?: boolean;
          last_updated?: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          network_id?: string | null;
          network_product_id?: string | null;
          variant_type?: string | null;
          variant_value?: string | null;
          price_override?: number | null;
          commission_rate?: number | null;
          affiliate_url?: string | null;
          in_stock?: boolean;
          last_updated?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variants_network_id_fkey";
            columns: ["network_id"];
            isOneToOne: false;
            referencedRelation: "affiliate_networks";
            referencedColumns: ["id"];
          }
        ];
      };

      product_price_history: {
        Row: {
          id: string;
          product_id: string;
          network_id: string | null;
          price: number;
          original_price: number | null;
          currency: string;
          in_stock: boolean | null;
          discount_percentage: number | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          network_id?: string | null;
          price: number;
          original_price?: number | null;
          currency?: string;
          in_stock?: boolean | null;
          discount_percentage?: number | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          network_id?: string | null;
          price?: number;
          original_price?: number | null;
          currency?: string;
          in_stock?: boolean | null;
          discount_percentage?: number | null;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_price_history_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_price_history_network_id_fkey";
            columns: ["network_id"];
            isOneToOne: false;
            referencedRelation: "affiliate_networks";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper types for working with Supabase
export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never;

// Convenience types for common operations
export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? NonNullable<U> : never;
export type DbResultErr = PostgrestError;

import type { PostgrestError } from '@supabase/supabase-js';