import { 
  validateRequest, 
  getTenant, 
  successResponse,
  errorResponse,
  logOperation,
  getSupabaseClient,
  IngestProductPayload 
} from '../_shared/mod.ts';

Deno.serve(async (request) => {
  try {
    const validation = await validateRequest(
      request, 
      ['POST'], 
      true, 
      'MAKE_PRODUCT_WEBHOOK_SECRET'
    );
    
    if (validation instanceof Response) return validation;
    
    const { payload, env } = validation;
    const productPayload = payload as IngestProductPayload;

    // Validate required fields
    if (!productPayload.tenantSlug || !productPayload.asin) {
      return errorResponse('Missing required fields: tenantSlug, asin', 400);
    }

    // Validate ASIN format (basic validation)
    if (!/^[A-Z0-9]{10}$/.test(productPayload.asin)) {
      return errorResponse('Invalid ASIN format', 400);
    }

    const supabase = getSupabaseClient(env);
    const tenant = await getTenant(supabase, productPayload.tenantSlug);

    // Generate affiliate URL if not provided
    let affiliateUrl = productPayload.affiliateUrl;
    if (!affiliateUrl) {
      const tag = env.AMAZON_ASSOCIATE_TAG || 'jmpkc01-20';
      affiliateUrl = `https://www.amazon.com/dp/${productPayload.asin}?tag=${tag}`;
    }

    // Parse category path into structured data
    let categoryData = null;
    if (productPayload.categoryPath) {
      const categories = productPayload.categoryPath.split(' > ').map(cat => cat.trim());
      categoryData = {
        path: categories,
        primary: categories[categories.length - 1],
        full_path: productPayload.categoryPath
      };
    }

    const productData = {
      tenant_id: tenant.id,
      asin: productPayload.asin,
      title: productPayload.title || '',
      brand: productPayload.brand || '',
      price: productPayload.price || null,
      rating: productPayload.rating || null,
      review_count: productPayload.reviewCount || null,
      image_url: productPayload.imageUrl || '',
      features: productPayload.features || [],
      description: productPayload.description || '',
      category: categoryData,
      affiliate_url: affiliateUrl,
      is_active: productPayload.isActive !== false, // Default to true
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: product, error: productError } = await supabase
      .from('products')
      .upsert(productData, { onConflict: 'tenant_id,asin' })
      .select('id, asin, title')
      .single();

    if (productError) {
      console.error('Product upsert failed:', productError);
      return errorResponse('Failed to create/update product', 500);
    }

    // Update product taxonomy if category information is available
    if (productPayload.categoryPath) {
      try {
        await updateProductTaxonomy(supabase, tenant.id, product.id, productPayload.categoryPath);
      } catch (error) {
        console.error('Failed to update product taxonomy:', error);
        // Don't fail the entire operation for taxonomy errors
      }
    }

    logOperation('Product Ingested', {
      tenantSlug: productPayload.tenantSlug,
      productId: product.id,
      asin: productPayload.asin,
      title: productPayload.title,
      isActive: productPayload.isActive
    });

    return successResponse(
      { 
        productId: product.id,
        asin: product.asin,
        title: product.title 
      },
      `Product ${productPayload.asin} ingested successfully`
    );

  } catch (error) {
    console.error('Unexpected error in ingest-product:', error);
    return errorResponse(`Internal server error: ${error.message}`);
  }
});

async function updateProductTaxonomy(
  supabase: any, 
  tenantId: string, 
  productId: string, 
  categoryPath: string
) {
  const categories = categoryPath.split(' > ').map(cat => cat.trim());
  let parentId = null;

  // Create or find each category in the hierarchy
  for (let i = 0; i < categories.length; i++) {
    const categoryName = categories[i];
    const path = categories.slice(0, i + 1).join('.');
    
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', categoryName)
      .eq('parent_id', parentId)
      .maybeSingle();

    let categoryId;
    
    if (existingCategory) {
      categoryId = existingCategory.id;
    } else {
      const { data: newCategory, error } = await supabase
        .from('categories')
        .insert({
          tenant_id: tenantId,
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          parent_id: parentId,
          path: path,
          level: i,
          is_active: true
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create category: ${error.message}`);
      }
      
      categoryId = newCategory.id;
    }

    parentId = categoryId;
  }

  // Associate product with the leaf category
  if (parentId) {
    await supabase
      .from('product_categories')
      .upsert({
        product_id: productId,
        category_id: parentId,
        is_primary: true
      }, { onConflict: 'product_id,category_id' });
  }
}