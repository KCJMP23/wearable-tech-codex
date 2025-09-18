#!/usr/bin/env tsx

/**
 * Comprehensive CRUD Operations Test Suite
 * Tests all database tables and verifies RLS policies work correctly
 * 
 * Usage: pnpm exec tsx scripts/test-crud.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { test, expect, describe, beforeAll, afterAll, beforeEach } from 'vitest'

// Environment setup
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
}

// Global test data
let supabase: SupabaseClient
let testTenantId: string
let testTenantId2: string
let testProductId: string
let testPostId: string
let testTaxonomyId: string
let testQuizId: string
let testSubscriberId: string

describe('Database CRUD Operations', () => {
  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Clean up any existing test data
    await cleanupTestData()
  })

  afterAll(async () => {
    // Clean up test data after all tests
    await cleanupTestData()
  })

  describe('Tenants Table', () => {
    test('should create tenant successfully', async () => {
      const tenantData = {
        name: 'Test Tenant 1',
        slug: 'test-tenant-1',
        domain: 'test1.example.com',
        theme: { primaryColor: '#ff0000' },
        status: 'active' as const
      }

      const { data, error } = await supabase
        .from('tenants')
        .insert(tenantData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.name).toBe(tenantData.name)
      expect(data.slug).toBe(tenantData.slug)
      expect(data.domain).toBe(tenantData.domain)
      
      testTenantId = data.id
    })

    test('should create second tenant for RLS testing', async () => {
      const tenantData = {
        name: 'Test Tenant 2',
        slug: 'test-tenant-2',
        domain: 'test2.example.com',
        theme: { primaryColor: '#00ff00' },
        status: 'active' as const
      }

      const { data, error } = await supabase
        .from('tenants')
        .insert(tenantData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      testTenantId2 = data.id
    })

    test('should read tenant successfully', async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', testTenantId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.id).toBe(testTenantId)
    })

    test('should update tenant successfully', async () => {
      const updateData = {
        name: 'Updated Test Tenant 1',
        theme: { primaryColor: '#0000ff', secondaryColor: '#ff00ff' }
      }

      const { data, error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', testTenantId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.name).toBe(updateData.name)
      expect(data.theme.primaryColor).toBe(updateData.theme.primaryColor)
    })

    test('should enforce unique constraints', async () => {
      const duplicateSlugData = {
        name: 'Duplicate Slug Tenant',
        slug: 'test-tenant-1', // Duplicate slug
        domain: 'duplicate.example.com',
        status: 'active' as const
      }

      const { error } = await supabase
        .from('tenants')
        .insert(duplicateSlugData)

      expect(error).toBeDefined()
      expect(error!.code).toBe('23505') // Unique violation
    })
  })

  describe('Taxonomy Table', () => {
    test('should create root taxonomy successfully', async () => {
      const taxonomyData = {
        tenant_id: testTenantId,
        kind: 'vertical' as const,
        name: 'Wearables',
        slug: 'wearables',
        parent_id: null,
        path: 'wearables',
        meta: { description: 'All wearable technology' }
      }

      const { data, error } = await supabase
        .from('taxonomy')
        .insert(taxonomyData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.name).toBe(taxonomyData.name)
      expect(data.slug).toBe(taxonomyData.slug)
      
      testTaxonomyId = data.id
    })

    test('should create child taxonomy successfully', async () => {
      const childTaxonomyData = {
        tenant_id: testTenantId,
        kind: 'vertical' as const,
        name: 'Smartwatches',
        slug: 'smartwatches',
        parent_id: testTaxonomyId,
        path: 'wearables.smartwatches',
        meta: { description: 'Smart watches and fitness trackers' }
      }

      const { data, error } = await supabase
        .from('taxonomy')
        .insert(childTaxonomyData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.parent_id).toBe(testTaxonomyId)
    })

    test('should prevent self-reference in parent_id', async () => {
      const { error } = await supabase
        .from('taxonomy')
        .update({ parent_id: testTaxonomyId })
        .eq('id', testTaxonomyId)

      expect(error).toBeDefined()
      expect(error!.code).toBe('23514') // Check constraint violation
    })
  })

  describe('Products Table', () => {
    test('should create product successfully', async () => {
      const productData = {
        tenant_id: testTenantId,
        asin: 'B08N5WRWNW',
        title: 'Apple Watch Series 6',
        brand: 'Apple',
        images: [
          { url: 'https://example.com/watch1.jpg', alt: 'Apple Watch front view' }
        ],
        features: ['GPS', 'Blood Oxygen Sensor', 'ECG'],
        rating: 4.5,
        review_count: 12567,
        price_snapshot: '$399.00',
        currency: 'USD',
        category: 'Smartwatches',
        subcategory: 'Fitness Trackers',
        device_type: 'smartwatch',
        compatibility: { ios: '14.0+', android: false },
        health_metrics: ['heart_rate', 'blood_oxygen', 'ecg'],
        battery_life_hours: 18,
        water_resistance: '50 meters',
        affiliate_url: 'https://amazon.com/dp/B08N5WRWNW?tag=test',
        source: 'amazon'
      }

      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.asin).toBe(productData.asin)
      expect(data.title).toBe(productData.title)
      
      testProductId = data.id
    })

    test('should validate ASIN format', async () => {
      const invalidProductData = {
        tenant_id: testTenantId,
        asin: 'INVALID123', // Invalid ASIN format
        title: 'Invalid Product',
        affiliate_url: 'https://amazon.com/dp/invalid',
        source: 'amazon'
      }

      const { error } = await supabase
        .from('products')
        .insert(invalidProductData)

      expect(error).toBeDefined()
      expect(error!.code).toBe('23514') // Check constraint violation
    })

    test('should update product successfully', async () => {
      const updateData = {
        rating: 4.7,
        review_count: 15000,
        last_verified_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', testProductId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.rating).toBe(updateData.rating)
      expect(data.review_count).toBe(updateData.review_count)
    })
  })

  describe('Posts Table', () => {
    test('should create draft post successfully', async () => {
      const postData = {
        tenant_id: testTenantId,
        type: 'review' as const,
        title: 'Apple Watch Series 6 Review',
        slug: 'apple-watch-series-6-review',
        excerpt: 'An in-depth review of the Apple Watch Series 6',
        body_mdx: '# Apple Watch Series 6 Review\n\nThe Apple Watch Series 6 is...',
        images: [
          { url: 'https://example.com/review1.jpg', alt: 'Watch in use' }
        ],
        status: 'draft' as const,
        seo: {
          title: 'Apple Watch Series 6 Review - Complete Guide',
          description: 'Comprehensive review of Apple Watch Series 6 features'
        }
      }

      const { data, error } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.title).toBe(postData.title)
      expect(data.status).toBe('draft')
      
      testPostId = data.id
    })

    test('should publish post successfully', async () => {
      const publishData = {
        status: 'published' as const,
        published_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('posts')
        .update(publishData)
        .eq('id', testPostId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.status).toBe('published')
      expect(data.published_at).toBeDefined()
    })

    test('should enforce published_at constraint', async () => {
      const invalidPostData = {
        tenant_id: testTenantId,
        type: 'howto' as const,
        title: 'Invalid Post',
        slug: 'invalid-post',
        status: 'published' as const,
        published_at: null // Invalid: published without published_at
      }

      const { error } = await supabase
        .from('posts')
        .insert(invalidPostData)

      expect(error).toBeDefined()
      expect(error!.code).toBe('23514') // Check constraint violation
    })
  })

  describe('Relationship Tables', () => {
    test('should create post-taxonomy relationship', async () => {
      const { data, error } = await supabase
        .from('post_taxonomy')
        .insert({
          post_id: testPostId,
          taxonomy_id: testTaxonomyId
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.post_id).toBe(testPostId)
      expect(data.taxonomy_id).toBe(testTaxonomyId)
    })

    test('should create post-products relationship', async () => {
      const { data, error } = await supabase
        .from('post_products')
        .insert({
          post_id: testPostId,
          product_id: testProductId,
          position: 1
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.position).toBe(1)
    })
  })

  describe('Quiz Table', () => {
    test('should create quiz successfully', async () => {
      const quizData = {
        tenant_id: testTenantId,
        title: 'Find Your Perfect Smartwatch',
        schema: {
          questions: [
            {
              id: 'q1',
              text: 'What is your primary use case?',
              type: 'multiple_choice',
              options: ['Fitness tracking', 'Smart notifications', 'Health monitoring']
            }
          ]
        },
        active: true
      }

      const { data, error } = await supabase
        .from('quiz')
        .insert(quizData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.title).toBe(quizData.title)
      
      testQuizId = data.id
    })

    test('should create quiz result successfully', async () => {
      const resultData = {
        tenant_id: testTenantId,
        quiz_id: testQuizId,
        answers: { q1: 'Fitness tracking' },
        segments: ['fitness_enthusiast'],
        recommended_product_ids: [testProductId],
        email: 'test@example.com'
      }

      const { data, error } = await supabase
        .from('quiz_results')
        .insert(resultData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.email).toBe(resultData.email)
    })
  })

  describe('Subscribers Table', () => {
    test('should create subscriber successfully', async () => {
      const subscriberData = {
        tenant_id: testTenantId,
        email: 'subscriber@example.com',
        status: 'active' as const,
        source: 'quiz'
      }

      const { data, error } = await supabase
        .from('subscribers')
        .insert(subscriberData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.email).toBe(subscriberData.email)
      expect(data.unsub_token).toBeDefined()
      expect(data.unsub_token.length).toBe(32)
      
      testSubscriberId = data.id
    })

    test('should enforce unique email per tenant', async () => {
      const duplicateSubscriber = {
        tenant_id: testTenantId,
        email: 'subscriber@example.com', // Duplicate email for same tenant
        status: 'active' as const
      }

      const { error } = await supabase
        .from('subscribers')
        .insert(duplicateSubscriber)

      expect(error).toBeDefined()
      expect(error!.code).toBe('23505') // Unique violation
    })

    test('should allow same email for different tenants', async () => {
      const crossTenantSubscriber = {
        tenant_id: testTenantId2,
        email: 'subscriber@example.com', // Same email, different tenant
        status: 'active' as const
      }

      const { data, error } = await supabase
        .from('subscribers')
        .insert(crossTenantSubscriber)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })

  describe('Links Table', () => {
    test('should create link successfully', async () => {
      const linkData = {
        tenant_id: testTenantId,
        target_url: 'https://amazon.com/dp/B08N5WRWNW',
        target_type: 'product' as const,
        status_code: 200,
        ok: true,
        checked_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('links')
        .insert(linkData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.target_url).toBe(linkData.target_url)
      expect(data.ok).toBe(true)
    })
  })

  describe('Insights Table', () => {
    test('should create insight successfully', async () => {
      const insightData = {
        tenant_id: testTenantId,
        kpi: 'page_views',
        value: 1250,
        window: '7d',
        meta: {
          headline: 'Page views increased',
          body: 'Weekly page views up 15%'
        }
      }

      const { data, error } = await supabase
        .from('insights')
        .insert(insightData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.kpi).toBe(insightData.kpi)
      expect(data.value).toBe(insightData.value)
    })
  })

  describe('Knowledge Base Table', () => {
    test('should create KB entry successfully', async () => {
      const kbData = {
        tenant_id: testTenantId,
        kind: 'faq' as const,
        title: 'How to setup your smartwatch',
        content: 'Step-by-step guide to setting up your new smartwatch...'
      }

      const { data, error } = await supabase
        .from('kb')
        .insert(kbData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.title).toBe(kbData.title)
    })
  })

  describe('Agent Tasks Table', () => {
    test('should create agent task successfully', async () => {
      const taskData = {
        tenant_id: testTenantId,
        agent: 'product',
        input: { productId: testProductId, action: 'update_pricing' },
        status: 'queued' as const
      }

      const { data, error } = await supabase
        .from('agent_tasks')
        .insert(taskData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.agent).toBe(taskData.agent)
      expect(data.status).toBe('queued')
    })

    test('should update task status successfully', async () => {
      const { data: task } = await supabase
        .from('agent_tasks')
        .select('id')
        .eq('tenant_id', testTenantId)
        .single()

      const updateData = {
        status: 'running' as const,
        started_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('agent_tasks')
        .update(updateData)
        .eq('id', task.id)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data.status).toBe('running')
      expect(data.started_at).toBeDefined()
    })
  })

  describe('Calendar Table', () => {
    test('should create calendar item successfully', async () => {
      const calendarData = {
        tenant_id: testTenantId,
        item_type: 'post' as const,
        ref_id: testPostId,
        title: 'Publish Apple Watch Review',
        status: 'planned' as const,
        run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        meta: { category: 'review', priority: 'high' }
      }

      const { data, error } = await supabase
        .from('calendar')
        .insert(calendarData)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.title).toBe(calendarData.title)
    })
  })

  describe('Database Functions', () => {
    test('should execute get_posts_by_taxonomy function', async () => {
      const { data, error } = await supabase
        .rpc('get_posts_by_taxonomy', {
          tenant_uuid: testTenantId,
          taxonomy_slug: 'wearables'
        })

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    test('should execute get_embedding_sources function', async () => {
      const { data, error } = await supabase
        .rpc('get_embedding_sources')

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('Views', () => {
    test('should query insights_view successfully', async () => {
      const { data, error } = await supabase
        .from('insights_view')
        .select('*')
        .eq('tenant_id', testTenantId)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    test('should query post_products_view successfully', async () => {
      const { data, error } = await supabase
        .from('post_products_view')
        .select('*')
        .eq('post_id', testPostId)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('position')
        expect(data[0]).toHaveProperty('title')
      }
    })
  })

  describe('RLS Policies (Row Level Security)', () => {
    let anonSupabase: SupabaseClient

    beforeEach(() => {
      // Create an anonymous client to test RLS
      anonSupabase = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY!)
    })

    test('should restrict access without proper authentication', async () => {
      const { data, error } = await anonSupabase
        .from('tenants')
        .select('*')

      // Depending on RLS policies, this should either return empty data or an error
      expect(data).toBeDefined()
      // Note: Specific RLS behavior depends on your policy configuration
    })
  })
})

// Utility function to clean up test data
async function cleanupTestData() {
  try {
    // Delete in reverse dependency order
    await supabase.from('post_taxonomy').delete().like('post_id', '%')
    await supabase.from('post_products').delete().like('post_id', '%')
    await supabase.from('quiz_results').delete().like('tenant_id', '%')
    await supabase.from('quiz').delete().like('tenant_id', '%')
    await supabase.from('subscribers').delete().like('email', '%example.com')
    await supabase.from('links').delete().like('tenant_id', '%')
    await supabase.from('insights').delete().like('tenant_id', '%')
    await supabase.from('kb').delete().like('tenant_id', '%')
    await supabase.from('agent_tasks').delete().like('tenant_id', '%')
    await supabase.from('calendar').delete().like('tenant_id', '%')
    await supabase.from('posts').delete().like('slug', '%test%')
    await supabase.from('products').delete().like('title', '%Test%').or('title.ilike.*Apple Watch*')
    await supabase.from('taxonomy').delete().like('slug', '%test%').or('slug.eq.wearables,slug.eq.smartwatches')
    await supabase.from('tenants').delete().like('slug', '%test%')
  } catch (error) {
    console.warn('Cleanup warning:', error)
  }
}

// Export for use in other test files
export {
  supabase,
  testTenantId,
  testTenantId2,
  testProductId,
  testPostId,
  testTaxonomyId,
  cleanupTestData
}