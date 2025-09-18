#!/usr/bin/env tsx

/**
 * Comprehensive Edge Functions Test Suite
 * Tests all Supabase Edge Functions with mock payloads and real responses
 * 
 * Usage: pnpm exec tsx scripts/test-edge-functions.ts
 */

import { test, expect, describe, beforeAll, afterAll } from 'vitest'
import type { 
  IngestPostPayload, 
  IngestProductPayload, 
  RunAgentPayload, 
  LinkVerifyPayload,
  EmbeddingsIndexPayload,
  ScheduleTickPayload
} from '../infra/supabase/functions/_shared/types'

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
}

// Common headers for all requests
const commonHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'x-test-mode': 'true' // Signal to functions that this is a test
}

describe('Edge Functions Tests', () => {
  let testTenantSlug: string
  let createdPostId: string
  let createdProductId: string

  beforeAll(async () => {
    testTenantSlug = 'nectar-heat-test'
    
    // Ensure we have a test tenant for our functions
    await setupTestTenant()
  })

  afterAll(async () => {
    // Clean up any test data created
    await cleanupTestData()
  })

  describe('ingest-post Function', () => {
    test('should ingest a new post successfully', async () => {
      const payload: IngestPostPayload = {
        tenantSlug: testTenantSlug,
        sourceId: 'test-source-123',
        type: 'review',
        title: 'Ultimate Guide to Smart Rings in 2024',
        slug: 'ultimate-guide-smart-rings-2024',
        excerpt: 'Discover the best smart rings for health tracking, sleep monitoring, and fitness.',
        bodyMdx: `# Ultimate Guide to Smart Rings in 2024

## Introduction

Smart rings have revolutionized personal health tracking by offering discrete, continuous monitoring in a form factor that's both stylish and functional.

## Top Features to Look For

### 1. Health Monitoring
- Heart rate variability
- Blood oxygen levels
- Sleep tracking
- Temperature monitoring

### 2. Battery Life
Most quality smart rings offer 3-7 days of battery life.

### 3. Durability
Look for water resistance and scratch-resistant materials.

## Best Smart Rings

### Oura Ring Generation 3
The gold standard in smart rings with comprehensive health insights.

### RingConn Smart Ring
Affordable alternative with solid tracking capabilities.

## Conclusion

Smart rings offer an excellent balance of functionality and discretion for health-conscious individuals.`,
        images: [
          { url: 'https://example.com/smart-ring-hero.jpg', alt: 'Collection of smart rings' },
          { url: 'https://example.com/oura-ring.jpg', alt: 'Oura Ring on finger' }
        ],
        internalLinks: ['/categories/wearables', '/products/oura-ring-gen-3'],
        externalLinks: ['https://ouraring.com', 'https://ringconn.com'],
        products: ['B08N5WRWNW', 'B09JQKQXYZ'],
        seo: {
          title: 'Best Smart Rings 2024: Complete Buyer\'s Guide & Reviews',
          description: 'Comprehensive guide to the best smart rings of 2024. Compare features, prices, and find the perfect ring for your health tracking needs.'
        },
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          'headline': 'Ultimate Guide to Smart Rings in 2024',
          'author': {
            '@type': 'Organization',
            'name': 'Nectar & Heat'
          }
        },
        publish: false
      }

      const response = await fetch(`${FUNCTIONS_URL}/ingest-post`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.id).toBeDefined()
      
      createdPostId = result.data.id
    })

    test('should validate required fields', async () => {
      const invalidPayload = {
        tenantSlug: testTenantSlug,
        // Missing required fields
        type: 'review'
      }

      const response = await fetch(`${FUNCTIONS_URL}/ingest-post`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(invalidPayload)
      })

      expect(response.status).toBe(400)
      
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required field')
    })

    test('should handle duplicate slug gracefully', async () => {
      const duplicatePayload: IngestPostPayload = {
        tenantSlug: testTenantSlug,
        type: 'howto',
        title: 'Duplicate Slug Post',
        slug: 'ultimate-guide-smart-rings-2024', // Same slug as before
        excerpt: 'This should conflict',
        bodyMdx: '# Duplicate content',
        publish: false
      }

      const response = await fetch(`${FUNCTIONS_URL}/ingest-post`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(duplicatePayload)
      })

      // Should either update existing or return conflict
      expect([200, 409]).toContain(response.status)
    })
  })

  describe('ingest-product Function', () => {
    test('should ingest a new product successfully', async () => {
      const payload: IngestProductPayload = {
        tenantSlug: testTenantSlug,
        asin: 'B08N5WRWNW',
        title: 'Oura Ring Generation 3',
        brand: 'Oura',
        price: 299,
        rating: 4.1,
        reviewCount: 2847,
        imageUrl: 'https://example.com/oura-ring-gen3.jpg',
        features: [
          'Advanced sleep tracking',
          'Heart rate variability',
          'Blood oxygen sensing',
          '7-day battery life',
          'Waterproof design'
        ],
        description: 'The most advanced smart ring with comprehensive health and fitness tracking.',
        categoryPath: 'Wearables > Smart Rings > Health Trackers',
        affiliateUrl: 'https://amazon.com/dp/B08N5WRWNW?tag=nectarheat-20',
        isActive: true
      }

      const response = await fetch(`${FUNCTIONS_URL}/ingest-product`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.asin).toBe(payload.asin)
      
      createdProductId = result.data.id
    })

    test('should validate ASIN format', async () => {
      const invalidPayload: IngestProductPayload = {
        tenantSlug: testTenantSlug,
        asin: 'INVALID123', // Invalid ASIN format
        title: 'Invalid Product',
        affiliateUrl: 'https://amazon.com/dp/invalid'
      }

      const response = await fetch(`${FUNCTIONS_URL}/ingest-product`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(invalidPayload)
      })

      expect(response.status).toBe(400)
      
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('ASIN')
    })

    test('should update existing product', async () => {
      const updatePayload: IngestProductPayload = {
        tenantSlug: testTenantSlug,
        asin: 'B08N5WRWNW', // Same ASIN as before
        title: 'Oura Ring Generation 3 - Updated',
        price: 279, // Updated price
        rating: 4.2, // Updated rating
        reviewCount: 3200 // Updated review count
      }

      const response = await fetch(`${FUNCTIONS_URL}/ingest-product`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(updatePayload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.price).toBe(updatePayload.price)
    })
  })

  describe('run-agent Function', () => {
    test('should execute product agent successfully', async () => {
      const payload: RunAgentPayload = {
        agentType: 'product',
        tenantSlug: testTenantSlug,
        parameters: {
          action: 'update_pricing',
          productIds: [createdProductId]
        },
        priority: 'medium'
      }

      const response = await fetch(`${FUNCTIONS_URL}/run-agent`, {
        method: 'POST',
        headers: {
          ...commonHeaders,
          'x-execution-mode': 'direct' // Direct execution for testing
        },
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.agentType).toBe('product')
      expect(result.data.actions).toBeDefined()
    })

    test('should create agent task for background processing', async () => {
      const payload: RunAgentPayload = {
        agentType: 'editorial',
        tenantSlug: testTenantSlug,
        parameters: {
          action: 'generate_content',
          postType: 'roundup',
          category: 'smart-rings'
        },
        priority: 'high'
      }

      const response = await fetch(`${FUNCTIONS_URL}/run-agent`, {
        method: 'POST',
        headers: commonHeaders, // No direct execution header
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.taskId).toBeDefined()
    })

    test('should execute orchestrator agent', async () => {
      const payload: RunAgentPayload = {
        agentType: 'orchestrator',
        tenantSlug: testTenantSlug,
        parameters: {
          plan: 'content_refresh',
          scope: 'smart_rings_category'
        },
        priority: 'medium'
      }

      const response = await fetch(`${FUNCTIONS_URL}/run-agent`, {
        method: 'POST',
        headers: {
          ...commonHeaders,
          'x-execution-mode': 'direct'
        },
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.orchestrationPlan).toBe('content_refresh')
    })

    test('should validate agent type', async () => {
      const invalidPayload = {
        agentType: 'invalid_agent',
        tenantSlug: testTenantSlug
      }

      const response = await fetch(`${FUNCTIONS_URL}/run-agent`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(invalidPayload)
      })

      expect(response.status).toBe(400)
      
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid agent type')
    })
  })

  describe('link-verify Function', () => {
    test('should verify single link', async () => {
      const payload: LinkVerifyPayload = {
        tenantSlug: testTenantSlug,
        links: ['https://amazon.com/dp/B08N5WRWNW']
      }

      const response = await fetch(`${FUNCTIONS_URL}/link-verify`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
      expect(result.data.length).toBeGreaterThan(0)
      expect(result.data[0]).toHaveProperty('url')
      expect(result.data[0]).toHaveProperty('status')
    })

    test('should verify links in posts', async () => {
      const payload: LinkVerifyPayload = {
        tenantSlug: testTenantSlug,
        postIds: [createdPostId]
      }

      const response = await fetch(`${FUNCTIONS_URL}/link-verify`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(Array.isArray(result.data)).toBe(true)
    })

    test('should verify links in products', async () => {
      const payload: LinkVerifyPayload = {
        tenantSlug: testTenantSlug,
        productIds: [createdProductId]
      }

      const response = await fetch(`${FUNCTIONS_URL}/link-verify`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
    })

    test('should handle invalid URLs gracefully', async () => {
      const payload: LinkVerifyPayload = {
        tenantSlug: testTenantSlug,
        links: ['not-a-valid-url', 'https://definitely-not-a-real-domain-12345.com']
      }

      const response = await fetch(`${FUNCTIONS_URL}/link-verify`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      // Should include error status for invalid URLs
      const hasErrors = result.data.some((link: any) => link.status === 'error')
      expect(hasErrors).toBe(true)
    })
  })

  describe('embeddings-index Function', () => {
    test('should index post embeddings', async () => {
      const payload: EmbeddingsIndexPayload = {
        tenantSlug: testTenantSlug,
        contentType: 'post',
        contentIds: [createdPostId]
      }

      const response = await fetch(`${FUNCTIONS_URL}/embeddings-index`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.indexed).toBeDefined()
      expect(result.data.indexed).toBeGreaterThan(0)
    })

    test('should index product embeddings', async () => {
      const payload: EmbeddingsIndexPayload = {
        tenantSlug: testTenantSlug,
        contentType: 'product',
        contentIds: [createdProductId]
      }

      const response = await fetch(`${FUNCTIONS_URL}/embeddings-index`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
    })

    test('should reindex all content for tenant', async () => {
      const payload: EmbeddingsIndexPayload = {
        tenantSlug: testTenantSlug,
        contentType: 'post',
        reindexAll: true
      }

      const response = await fetch(`${FUNCTIONS_URL}/embeddings-index`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })

  describe('schedule-tick Function', () => {
    test('should create scheduled event', async () => {
      const payload: ScheduleTickPayload = {
        eventType: 'publish_post',
        tenantSlug: testTenantSlug,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        parameters: {
          postId: createdPostId,
          publishTo: ['website', 'newsletter']
        }
      }

      const response = await fetch(`${FUNCTIONS_URL}/schedule-tick`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.data.eventId).toBeDefined()
    })

    test('should process immediate events', async () => {
      const payload: ScheduleTickPayload = {
        eventType: 'send_newsletter',
        tenantSlug: testTenantSlug,
        scheduledFor: new Date().toISOString(), // Now
        parameters: {
          template: 'weekly_roundup',
          segment: 'all_subscribers'
        }
      }

      const response = await fetch(`${FUNCTIONS_URL}/schedule-tick`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.success).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle missing tenant gracefully', async () => {
      const payload: IngestPostPayload = {
        tenantSlug: 'non-existent-tenant',
        type: 'howto',
        title: 'Test Post',
        slug: 'test-post',
        excerpt: 'Test excerpt',
        bodyMdx: '# Test',
        publish: false
      }

      const response = await fetch(`${FUNCTIONS_URL}/ingest-post`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(payload)
      })

      expect(response.status).toBe(404)
      
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Tenant not found')
    })

    test('should handle malformed JSON', async () => {
      const response = await fetch(`${FUNCTIONS_URL}/run-agent`, {
        method: 'POST',
        headers: commonHeaders,
        body: 'invalid json{'
      })

      expect(response.status).toBe(400)
      
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid JSON')
    })

    test('should handle unauthorized requests', async () => {
      const response = await fetch(`${FUNCTIONS_URL}/run-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // No Authorization header
        },
        body: JSON.stringify({ agentType: 'product' })
      })

      expect(response.status).toBe(401)
    })

    test('should handle unsupported HTTP methods', async () => {
      const response = await fetch(`${FUNCTIONS_URL}/ingest-post`, {
        method: 'GET',
        headers: commonHeaders
      })

      expect(response.status).toBe(405)
      
      const result = await response.json()
      expect(result.success).toBe(false)
      expect(result.error).toContain('Method not allowed')
    })
  })

  describe('Function Integration', () => {
    test('should chain functions: ingest product -> run agent -> index embeddings', async () => {
      // 1. Ingest a new product
      const productPayload: IngestProductPayload = {
        tenantSlug: testTenantSlug,
        asin: 'B09JQKQXYZ',
        title: 'RingConn Smart Ring',
        brand: 'RingConn',
        price: 199,
        rating: 4.3,
        reviewCount: 1245,
        affiliateUrl: 'https://amazon.com/dp/B09JQKQXYZ?tag=nectarheat-20'
      }

      const productResponse = await fetch(`${FUNCTIONS_URL}/ingest-product`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(productPayload)
      })

      expect(productResponse.status).toBe(200)
      const productResult = await productResponse.json()
      const newProductId = productResult.data.id

      // 2. Run product agent to enrich data
      const agentPayload: RunAgentPayload = {
        agentType: 'product',
        tenantSlug: testTenantSlug,
        parameters: {
          action: 'enrich_data',
          productIds: [newProductId]
        }
      }

      const agentResponse = await fetch(`${FUNCTIONS_URL}/run-agent`, {
        method: 'POST',
        headers: {
          ...commonHeaders,
          'x-execution-mode': 'direct'
        },
        body: JSON.stringify(agentPayload)
      })

      expect(agentResponse.status).toBe(200)

      // 3. Index embeddings for the new product
      const embeddingPayload: EmbeddingsIndexPayload = {
        tenantSlug: testTenantSlug,
        contentType: 'product',
        contentIds: [newProductId]
      }

      const embeddingResponse = await fetch(`${FUNCTIONS_URL}/embeddings-index`, {
        method: 'POST',
        headers: commonHeaders,
        body: JSON.stringify(embeddingPayload)
      })

      expect(embeddingResponse.status).toBe(200)
      const embeddingResult = await embeddingResponse.json()
      expect(embeddingResult.success).toBe(true)
    })
  })
})

// Helper functions
async function setupTestTenant() {
  // This would typically create a test tenant via API or direct database insert
  console.log(`Setting up test tenant: ${testTenantSlug}`)
}

async function cleanupTestData() {
  // Clean up any test data created during function tests
  console.log('Cleaning up test data from edge function tests')
}

// Export test utilities for use in other test files
export {
  FUNCTIONS_URL,
  commonHeaders,
  testTenantSlug
}