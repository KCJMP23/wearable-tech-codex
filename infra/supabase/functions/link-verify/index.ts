import { 
  validateRequest, 
  getTenant, 
  successResponse,
  errorResponse,
  logOperation,
  getSupabaseClient,
  verifyUrl,
  LinkVerifyPayload,
  LinkVerificationResult 
} from '../_shared/mod.ts';

Deno.serve(async (request) => {
  try {
    const validation = await validateRequest(
      request, 
      ['POST'], 
      false // No HMAC validation for internal verification
    );
    
    if (validation instanceof Response) return validation;
    
    const { payload, env } = validation;
    const verifyPayload = payload as LinkVerifyPayload;

    const supabase = getSupabaseClient(env);
    let tenant = null;

    // Get tenant if specified
    if (verifyPayload.tenantSlug) {
      tenant = await getTenant(supabase, verifyPayload.tenantSlug);
    }

    let linksToVerify: string[] = [];
    
    // Collect links from various sources
    if (verifyPayload.links && Array.isArray(verifyPayload.links)) {
      linksToVerify.push(...verifyPayload.links);
    }

    if (verifyPayload.postIds && Array.isArray(verifyPayload.postIds)) {
      const postLinks = await extractLinksFromPosts(supabase, verifyPayload.postIds, tenant?.id);
      linksToVerify.push(...postLinks);
    }

    if (verifyPayload.productIds && Array.isArray(verifyPayload.productIds)) {
      const productLinks = await extractLinksFromProducts(supabase, verifyPayload.productIds, tenant?.id);
      linksToVerify.push(...productLinks);
    }

    // If no specific links provided, verify all links for the tenant
    if (linksToVerify.length === 0 && tenant) {
      const allLinks = await extractAllLinksForTenant(supabase, tenant.id);
      linksToVerify.push(...allLinks);
    }

    // Remove duplicates
    linksToVerify = [...new Set(linksToVerify)];

    if (linksToVerify.length === 0) {
      return successResponse(
        { verifiedLinks: [], summary: { total: 0, valid: 0, invalid: 0, errors: 0 } },
        'No links found to verify'
      );
    }

    // Verify links in batches
    const results = await verifyLinksInBatches(linksToVerify, 10);
    
    // Store verification results
    if (tenant) {
      await storeVerificationResults(supabase, tenant.id, results);
    }

    // Generate summary
    const summary = {
      total: results.length,
      valid: results.filter(r => r.status === 'valid').length,
      invalid: results.filter(r => r.status === 'invalid').length,
      errors: results.filter(r => r.status === 'error').length
    };

    logOperation('Link Verification Completed', {
      tenantSlug: verifyPayload.tenantSlug,
      ...summary
    });

    return successResponse(
      { 
        verifiedLinks: results,
        summary 
      },
      `Verified ${results.length} links`
    );

  } catch (error) {
    console.error('Unexpected error in link-verify:', error);
    return errorResponse(`Internal server error: ${error.message}`);
  }
});

async function extractLinksFromPosts(supabase: any, postIds: string[], tenantId?: string) {
  const links: string[] = [];
  
  try {
    let query = supabase
      .from('posts')
      .select('body_mdx, jsonld')
      .in('id', postIds);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return links;
    }

    for (const post of posts || []) {
      // Extract links from body_mdx
      if (post.body_mdx) {
        const bodyLinks = extractLinksFromText(post.body_mdx);
        links.push(...bodyLinks);
      }

      // Extract links from jsonld
      if (post.jsonld) {
        const jsonldLinks = extractLinksFromObject(post.jsonld);
        links.push(...jsonldLinks);
      }
    }
  } catch (error) {
    console.error('Error extracting links from posts:', error);
  }

  return links;
}

async function extractLinksFromProducts(supabase: any, productIds: string[], tenantId?: string) {
  const links: string[] = [];
  
  try {
    let query = supabase
      .from('products')
      .select('affiliate_url, description')
      .in('id', productIds);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return links;
    }

    for (const product of products || []) {
      if (product.affiliate_url) {
        links.push(product.affiliate_url);
      }

      if (product.description) {
        const descriptionLinks = extractLinksFromText(product.description);
        links.push(...descriptionLinks);
      }
    }
  } catch (error) {
    console.error('Error extracting links from products:', error);
  }

  return links;
}

async function extractAllLinksForTenant(supabase: any, tenantId: string) {
  const links: string[] = [];
  
  try {
    // Get links from posts
    const { data: posts } = await supabase
      .from('posts')
      .select('body_mdx, jsonld')
      .eq('tenant_id', tenantId);

    for (const post of posts || []) {
      if (post.body_mdx) {
        links.push(...extractLinksFromText(post.body_mdx));
      }
      if (post.jsonld) {
        links.push(...extractLinksFromObject(post.jsonld));
      }
    }

    // Get links from products
    const { data: products } = await supabase
      .from('products')
      .select('affiliate_url, description')
      .eq('tenant_id', tenantId);

    for (const product of products || []) {
      if (product.affiliate_url) {
        links.push(product.affiliate_url);
      }
      if (product.description) {
        links.push(...extractLinksFromText(product.description));
      }
    }

  } catch (error) {
    console.error('Error extracting all links for tenant:', error);
  }

  return links;
}

function extractLinksFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s\)]+/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

function extractLinksFromObject(obj: any): string[] {
  const links: string[] = [];
  
  function traverse(item: any) {
    if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
      links.push(item);
    } else if (Array.isArray(item)) {
      item.forEach(traverse);
    } else if (typeof item === 'object' && item !== null) {
      Object.values(item).forEach(traverse);
    }
  }
  
  traverse(obj);
  return links;
}

async function verifyLinksInBatches(links: string[], batchSize: number = 10): Promise<LinkVerificationResult[]> {
  const results: LinkVerificationResult[] = [];
  
  for (let i = 0; i < links.length; i += batchSize) {
    const batch = links.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (url) => {
      const verification = await verifyUrl(url);
      return {
        url,
        ...verification,
        checkedAt: new Date().toISOString()
      } as LinkVerificationResult;
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Handle failed verification attempt
        const failedUrl = batch[batchResults.indexOf(result)];
        results.push({
          url: failedUrl,
          status: 'error',
          errorMessage: result.reason?.message || 'Verification failed',
          checkedAt: new Date().toISOString()
        });
      }
    }

    // Add small delay between batches to avoid overwhelming servers
    if (i + batchSize < links.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

async function storeVerificationResults(supabase: any, tenantId: string, results: LinkVerificationResult[]) {
  try {
    const verificationRecords = results.map(result => ({
      tenant_id: tenantId,
      url: result.url,
      status: result.status,
      status_code: result.statusCode,
      redirect_url: result.redirectUrl,
      error_message: result.errorMessage,
      checked_at: result.checkedAt,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('link_verifications')
      .upsert(verificationRecords, { 
        onConflict: 'tenant_id,url',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('Error storing verification results:', error);
    }
  } catch (error) {
    console.error('Error in storeVerificationResults:', error);
  }
}

// Helper function to categorize links
function categorizeLink(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('amazon.')) return 'amazon';
    if (hostname.includes('affiliate') || url.includes('tag=') || url.includes('ref=')) return 'affiliate';
    if (hostname.includes('social') || hostname.includes('facebook') || hostname.includes('twitter') || hostname.includes('instagram')) return 'social';
    return 'external';
  } catch {
    return 'unknown';
  }
}