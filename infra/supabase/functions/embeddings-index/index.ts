import { 
  validateRequest, 
  getTenant, 
  successResponse,
  errorResponse,
  logOperation,
  getSupabaseClient,
  generateEmbedding,
  EmbeddingsIndexPayload,
  EmbeddingRecord 
} from '../_shared/mod.ts';

Deno.serve(async (request) => {
  try {
    const validation = await validateRequest(
      request, 
      ['POST'], 
      false // No HMAC validation for internal embedding updates
    );
    
    if (validation instanceof Response) return validation;
    
    const { payload, env } = validation;
    const embeddingPayload = payload as EmbeddingsIndexPayload;

    // Validate required fields
    if (!embeddingPayload.contentType) {
      return errorResponse('Missing required field: contentType', 400);
    }

    if (!['post', 'product', 'category'].includes(embeddingPayload.contentType)) {
      return errorResponse('Invalid contentType. Must be one of: post, product, category', 400);
    }

    const supabase = getSupabaseClient(env);
    let tenant = null;

    // Get tenant if specified
    if (embeddingPayload.tenantSlug) {
      tenant = await getTenant(supabase, embeddingPayload.tenantSlug);
    }

    let processedCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    if (embeddingPayload.reindexAll) {
      // Reindex all content for the tenant or globally
      const result = await reindexAllContent(supabase, embeddingPayload.contentType, tenant?.id, env);
      processedCount = result.processedCount;
      errorCount = result.errorCount;
      errors.push(...result.errors);
    } else if (embeddingPayload.contentIds && embeddingPayload.contentIds.length > 0) {
      // Index specific content items
      const result = await indexSpecificContent(
        supabase, 
        embeddingPayload.contentType, 
        embeddingPayload.contentIds, 
        tenant?.id, 
        env
      );
      processedCount = result.processedCount;
      errorCount = result.errorCount;
      errors.push(...result.errors);
    } else {
      // Index recent content (default behavior)
      const result = await indexRecentContent(supabase, embeddingPayload.contentType, tenant?.id, env);
      processedCount = result.processedCount;
      errorCount = result.errorCount;
      errors.push(...result.errors);
    }

    logOperation('Embeddings Indexed', {
      contentType: embeddingPayload.contentType,
      tenantSlug: embeddingPayload.tenantSlug,
      processedCount,
      errorCount,
      reindexAll: embeddingPayload.reindexAll
    });

    return successResponse(
      {
        contentType: embeddingPayload.contentType,
        processedCount,
        errorCount,
        errors: errors.slice(0, 10), // Limit error details in response
        summary: {
          total: processedCount + errorCount,
          successful: processedCount,
          failed: errorCount
        }
      },
      `Processed ${processedCount} ${embeddingPayload.contentType} embeddings`
    );

  } catch (error) {
    console.error('Unexpected error in embeddings-index:', error);
    return errorResponse(`Internal server error: ${error.message}`);
  }
});

async function reindexAllContent(supabase: any, contentType: string, tenantId?: string, env?: any) {
  const result = { processedCount: 0, errorCount: 0, errors: [] };
  
  try {
    // Clear existing embeddings for this content type and tenant
    let deleteQuery = supabase.from('embeddings').delete().eq('content_type', contentType);
    
    if (tenantId) {
      deleteQuery = deleteQuery.eq('tenant_id', tenantId);
    }
    
    await deleteQuery;

    // Get all content to reindex
    const content = await fetchContentForIndexing(supabase, contentType, tenantId);
    
    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < content.length; i += batchSize) {
      const batch = content.slice(i, i + batchSize);
      const batchResult = await processBatch(supabase, batch, contentType, env);
      
      result.processedCount += batchResult.processedCount;
      result.errorCount += batchResult.errorCount;
      result.errors.push(...batchResult.errors);
    }

  } catch (error) {
    console.error('Error in reindexAllContent:', error);
    result.errorCount++;
    result.errors.push({ error: error.message });
  }

  return result;
}

async function indexSpecificContent(supabase: any, contentType: string, contentIds: string[], tenantId?: string, env?: any) {
  const result = { processedCount: 0, errorCount: 0, errors: [] };
  
  try {
    const content = await fetchContentByIds(supabase, contentType, contentIds, tenantId);
    const batchResult = await processBatch(supabase, content, contentType, env);
    
    result.processedCount = batchResult.processedCount;
    result.errorCount = batchResult.errorCount;
    result.errors = batchResult.errors;

  } catch (error) {
    console.error('Error in indexSpecificContent:', error);
    result.errorCount++;
    result.errors.push({ error: error.message });
  }

  return result;
}

async function indexRecentContent(supabase: any, contentType: string, tenantId?: string, env?: any) {
  const result = { processedCount: 0, errorCount: 0, errors: [] };
  
  try {
    // Get content modified in the last 7 days that doesn't have embeddings
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    const content = await fetchRecentContent(supabase, contentType, tenantId, cutoffDate.toISOString());
    const batchResult = await processBatch(supabase, content, contentType, env);
    
    result.processedCount = batchResult.processedCount;
    result.errorCount = batchResult.errorCount;
    result.errors = batchResult.errors;

  } catch (error) {
    console.error('Error in indexRecentContent:', error);
    result.errorCount++;
    result.errors.push({ error: error.message });
  }

  return result;
}

async function fetchContentForIndexing(supabase: any, contentType: string, tenantId?: string) {
  let query;
  
  switch (contentType) {
    case 'post':
      query = supabase
        .from('posts')
        .select('id, tenant_id, title, excerpt, body_mdx, status, updated_at')
        .eq('status', 'published');
      break;
    case 'product':
      query = supabase
        .from('products')
        .select('id, tenant_id, title, description, features, brand, updated_at')
        .eq('is_active', true);
      break;
    case 'category':
      query = supabase
        .from('categories')
        .select('id, tenant_id, name, description, updated_at')
        .eq('is_active', true);
      break;
    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch ${contentType} content: ${error.message}`);
  }

  return data || [];
}

async function fetchContentByIds(supabase: any, contentType: string, contentIds: string[], tenantId?: string) {
  let query;
  
  switch (contentType) {
    case 'post':
      query = supabase
        .from('posts')
        .select('id, tenant_id, title, excerpt, body_mdx, status, updated_at')
        .in('id', contentIds);
      break;
    case 'product':
      query = supabase
        .from('products')
        .select('id, tenant_id, title, description, features, brand, updated_at')
        .in('id', contentIds);
      break;
    case 'category':
      query = supabase
        .from('categories')
        .select('id, tenant_id, name, description, updated_at')
        .in('id', contentIds);
      break;
    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to fetch ${contentType} content by IDs: ${error.message}`);
  }

  return data || [];
}

async function fetchRecentContent(supabase: any, contentType: string, tenantId?: string, since?: string) {
  let query;
  
  switch (contentType) {
    case 'post':
      query = supabase
        .from('posts')
        .select('id, tenant_id, title, excerpt, body_mdx, status, updated_at')
        .eq('status', 'published');
      break;
    case 'product':
      query = supabase
        .from('products')
        .select('id, tenant_id, title, description, features, brand, updated_at')
        .eq('is_active', true);
      break;
    case 'category':
      query = supabase
        .from('categories')
        .select('id, tenant_id, name, description, updated_at')
        .eq('is_active', true);
      break;
    default:
      throw new Error(`Unsupported content type: ${contentType}`);
  }

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  if (since) {
    query = query.gte('updated_at', since);
  }

  // Only get content that doesn't have recent embeddings
  const { data, error } = await query.limit(100); // Limit for recent content
  
  if (error) {
    throw new Error(`Failed to fetch recent ${contentType} content: ${error.message}`);
  }

  return data || [];
}

async function processBatch(supabase: any, content: any[], contentType: string, env: any) {
  const result = { processedCount: 0, errorCount: 0, errors: [] };
  
  for (const item of content) {
    try {
      await processContentItem(supabase, item, contentType, env);
      result.processedCount++;
    } catch (error) {
      console.error(`Error processing ${contentType} ${item.id}:`, error);
      result.errorCount++;
      result.errors.push({
        contentType,
        contentId: item.id,
        error: error.message
      });
    }
  }

  return result;
}

async function processContentItem(supabase: any, item: any, contentType: string, env: any) {
  // Extract text content for embedding
  const textContent = extractTextContent(item, contentType);
  
  if (!textContent.trim()) {
    throw new Error('No text content to embed');
  }

  // Generate embedding (this would use OpenAI in production)
  const embedding = await generateEmbedding(textContent);
  
  // Prepare embedding record
  const embeddingRecord: Partial<EmbeddingRecord> = {
    content_type: contentType as 'post' | 'product' | 'category',
    content_id: item.id,
    tenant_id: item.tenant_id,
    title: extractTitle(item, contentType),
    content: textContent.substring(0, 8000), // Limit content length
    embedding: embedding,
    metadata: extractMetadata(item, contentType),
    updated_at: new Date().toISOString()
  };

  // Upsert embedding record
  const { error } = await supabase
    .from('embeddings')
    .upsert(embeddingRecord, { 
      onConflict: 'content_type,content_id,tenant_id' 
    });

  if (error) {
    throw new Error(`Failed to store embedding: ${error.message}`);
  }
}

function extractTextContent(item: any, contentType: string): string {
  switch (contentType) {
    case 'post':
      return [
        item.title || '',
        item.excerpt || '',
        item.body_mdx || ''
      ].filter(Boolean).join('\n\n');
      
    case 'product':
      return [
        item.title || '',
        item.brand || '',
        item.description || '',
        Array.isArray(item.features) ? item.features.join('\n') : ''
      ].filter(Boolean).join('\n\n');
      
    case 'category':
      return [
        item.name || '',
        item.description || ''
      ].filter(Boolean).join('\n\n');
      
    default:
      return '';
  }
}

function extractTitle(item: any, contentType: string): string {
  switch (contentType) {
    case 'post':
      return item.title || `Post ${item.id}`;
    case 'product':
      return item.title || `Product ${item.id}`;
    case 'category':
      return item.name || `Category ${item.id}`;
    default:
      return `${contentType} ${item.id}`;
  }
}

function extractMetadata(item: any, contentType: string): Record<string, any> {
  const metadata: Record<string, any> = {
    contentType,
    updatedAt: item.updated_at
  };

  switch (contentType) {
    case 'post':
      metadata.status = item.status;
      metadata.hasExcerpt = Boolean(item.excerpt);
      metadata.contentLength = (item.body_mdx || '').length;
      break;
      
    case 'product':
      metadata.brand = item.brand;
      metadata.hasDescription = Boolean(item.description);
      metadata.featureCount = Array.isArray(item.features) ? item.features.length : 0;
      break;
      
    case 'category':
      metadata.hasDescription = Boolean(item.description);
      break;
  }

  return metadata;
}