import { 
  validateRequest, 
  getTenant, 
  processAmazonLinks,
  successResponse,
  errorResponse,
  logOperation,
  getSupabaseClient,
  IngestPostPayload 
} from '../_shared/mod.ts';

Deno.serve(async (request) => {
  try {
    const validation = await validateRequest(
      request, 
      ['POST'], 
      true, 
      'MAKE_BLOG_WEBHOOK_SECRET'
    );
    
    if (validation instanceof Response) return validation;
    
    const { payload, env } = validation;
    const postPayload = payload as IngestPostPayload;

    // Validate required fields
    if (!postPayload.tenantSlug || !postPayload.title || !postPayload.slug || !postPayload.type) {
      return errorResponse('Missing required fields: tenantSlug, title, slug, type', 400);
    }

    const supabase = getSupabaseClient(env);
    const tenant = await getTenant(supabase, postPayload.tenantSlug);

    // Process Amazon affiliate links
    const processedBodyMdx = postPayload.bodyMdx 
      ? processAmazonLinks(postPayload.bodyMdx, env.AMAZON_ASSOCIATE_TAG)
      : '';

    const postData = {
      tenant_id: tenant.id,
      type: postPayload.type,
      title: postPayload.title,
      slug: postPayload.slug,
      excerpt: postPayload.excerpt || '',
      body_mdx: processedBodyMdx,
      images: postPayload.images ?? [],
      status: postPayload.publish ? 'published' : 'draft',
      published_at: postPayload.publish ? new Date().toISOString() : null,
      seo: postPayload.seo ?? {},
      jsonld: postPayload.jsonLd ?? {},
      updated_at: new Date().toISOString()
    };

    const { data: post, error: postError } = await supabase
      .from('posts')
      .upsert(postData, { onConflict: 'tenant_id,slug' })
      .select('id')
      .single();

    if (postError) {
      console.error('Post upsert failed:', postError);
      return errorResponse('Failed to create/update post', 500);
    }

    // Handle product associations if provided
    if (post && Array.isArray(postPayload.products) && postPayload.products.length > 0) {
      try {
        const productAssociations = [];
        
        for (let i = 0; i < postPayload.products.length; i++) {
          const asin = postPayload.products[i];
          const { data: product } = await supabase
            .from('products')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('asin', asin)
            .maybeSingle();
          
          if (product) {
            productAssociations.push({ 
              post_id: post.id, 
              product_id: product.id, 
              position: i 
            });
          }
        }

        if (productAssociations.length > 0) {
          // Delete existing associations and insert new ones
          await supabase.from('post_products').delete().eq('post_id', post.id);
          const { error: associationError } = await supabase
            .from('post_products')
            .insert(productAssociations);
            
          if (associationError) {
            console.error('Product association failed:', associationError);
          }
        }
      } catch (error) {
        console.error('Error processing product associations:', error);
        // Don't fail the entire operation for product association errors
      }
    }

    logOperation('Post Ingested', {
      tenantSlug: postPayload.tenantSlug,
      postId: post.id,
      title: postPayload.title,
      type: postPayload.type,
      status: postPayload.publish ? 'published' : 'draft'
    });

    return successResponse(
      { postId: post.id },
      `Post "${postPayload.title}" ingested successfully`
    );

  } catch (error) {
    console.error('Unexpected error in ingest-post:', error);
    return errorResponse(`Internal server error: ${error.message}`);
  }
});