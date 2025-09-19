import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Helper function to strip HTML tags
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// Extract images from WordPress content
function extractImagesFromContent(content: string): Array<{ url: string; alt?: string; caption?: string }> {
  const images: Array<{ url: string; alt?: string; caption?: string }> = [];
  
  // Regular expression to match img tags
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi;
  let match;
  
  while ((match = imgRegex.exec(content)) !== null) {
    images.push({
      url: match[1],
      alt: match[2] || undefined
    });
  }
  
  // Also extract from WordPress gallery blocks
  const galleryRegex = /wp:image[^}]*"url":"([^"]+)"[^}]*"alt":"([^"]*)"/gi;
  while ((match = galleryRegex.exec(content)) !== null) {
    images.push({
      url: match[1],
      alt: match[2] || undefined
    });
  }
  
  return images;
}

// Convert WordPress content to MDX
function convertWordPressToMdx(content: string): string {
  let mdx = content;
  
  // Convert WordPress blocks to MDX
  mdx = mdx.replace(/<!-- wp:paragraph -->/g, '');
  mdx = mdx.replace(/<!-- \/wp:paragraph -->/g, '\n\n');
  
  // Convert headings
  mdx = mdx.replace(/<!-- wp:heading {"level":2} -->/g, '## ');
  mdx = mdx.replace(/<!-- wp:heading {"level":3} -->/g, '### ');
  mdx = mdx.replace(/<!-- \/wp:heading -->/g, '\n\n');
  
  // Convert lists
  mdx = mdx.replace(/<!-- wp:list -->/g, '');
  mdx = mdx.replace(/<!-- \/wp:list -->/g, '\n');
  mdx = mdx.replace(/<li>/g, '- ');
  mdx = mdx.replace(/<\/li>/g, '\n');
  
  // Convert images to MDX format
  mdx = mdx.replace(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
  
  // Clean up remaining HTML
  mdx = mdx.replace(/<ul>/g, '');
  mdx = mdx.replace(/<\/ul>/g, '\n');
  mdx = mdx.replace(/<ol>/g, '');
  mdx = mdx.replace(/<\/ol>/g, '\n');
  mdx = mdx.replace(/<p>/g, '');
  mdx = mdx.replace(/<\/p>/g, '\n\n');
  mdx = mdx.replace(/<br\s*\/?>/g, '\n');
  mdx = mdx.replace(/<strong>/g, '**');
  mdx = mdx.replace(/<\/strong>/g, '**');
  mdx = mdx.replace(/<em>/g, '*');
  mdx = mdx.replace(/<\/em>/g, '*');
  
  // Clean up extra whitespace
  mdx = mdx.replace(/\n{3,}/g, '\n\n');
  
  return mdx.trim();
}

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Validation schema for blog post webhook - WordPress compatible
const BlogPostSchema = z.object({
  // WordPress standard fields - handling both nested and flat structures
  title: z.union([
    z.string(),
    z.object({ rendered: z.string() })
  ]).transform(val => typeof val === 'string' ? val : val.rendered),
  
  slug: z.string().optional(),
  
  excerpt: z.union([
    z.string(),
    z.object({ rendered: z.string() })
  ]).optional().transform(val => {
    if (!val) return undefined;
    return typeof val === 'string' ? val : val.rendered;
  }),
  
  content: z.union([
    z.string(),
    z.object({ rendered: z.string() })
  ]).transform(val => typeof val === 'string' ? val : val.rendered),
  
  author: z.union([z.string(), z.number()]).transform(String).default('1'),
  category: z.string().optional(),
  categories: z.array(z.union([z.string(), z.number()]).transform(String)).optional(),
  tags: z.array(z.union([z.string(), z.number()]).transform(String)).optional(),
  
  // Featured image (WordPress style)
  featuredImage: z.string().url().optional(),
  featured_media: z.union([z.string().url(), z.number()]).transform(String).optional(),
  
  // Multiple images (minimum 5-7 for quality posts)
  images: z.array(z.object({
    url: z.string().url(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  })).optional(),
  
  // Gallery support for WordPress galleries
  gallery: z.array(z.string().url()).optional(),
  
  // Video embeds
  videos: z.array(z.object({
    url: z.string().url(),
    title: z.string().optional(),
    thumbnail: z.string().url().optional(),
    embedCode: z.string().optional()
  })).optional(),
  
  // SEO fields (Yoast/RankMath compatible)
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  focusKeyword: z.string().optional(),
  
  // Publishing - handle WordPress statuses
  publishedAt: z.string().optional(),
  status: z.enum(['draft', 'published', 'scheduled', 'publish', 'private', 'future', 'pending'])
    .transform(val => val === 'publish' ? 'published' : val)
    .optional(),
  
  // Multi-tenant
  tenantId: z.string().optional(),
  tenant_slug: z.string().optional(), // Accept tenant slug to identify tenant
  webhookSecret: z.string().optional(),
  
  // WordPress meta fields
  meta: z.record(z.any()).optional(),
  custom_fields: z.record(z.any()).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if provided
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.MAKE_WEBHOOK_SECRET;
    
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = BlogPostSchema.parse(body);

    // Generate slug if not provided
    const slug = validatedData.slug || validatedData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Get tenant ID - resolve from slug if provided
    let tenantId = validatedData.tenantId;
    
    // If tenant_slug is provided, resolve it to get tenantId
    if (!tenantId && validatedData.tenant_slug) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', validatedData.tenant_slug)
        .single();
      
      if (tenant) {
        tenantId = tenant.id;
      }
    }
    
    // Fallback to default if still no tenantId
    if (!tenantId) {
      tenantId = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
    }
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID or slug is required' },
        { status: 400 }
      );
    }

    // Process WordPress content to extract embedded images
    const contentImages = extractImagesFromContent(validatedData.content);
    
    // Combine all images from various sources
    const allImages = [
      ...(validatedData.images || []),
      ...(validatedData.gallery?.map(url => ({ url })) || []),
      ...contentImages
    ];
    
    // Ensure we have at least 5-7 images for quality posts
    if (allImages.length < 5) {
      console.warn(`Post "${validatedData.title}" has only ${allImages.length} images. Recommended: 5-7 minimum.`);
    }
    
    // Determine featured image
    const featuredImageUrl = validatedData.featuredImage || 
                             validatedData.featured_media || 
                             allImages[0]?.url;
    
    // Process categories and tags
    const categoriesArray = validatedData.categories || 
                           (validatedData.category ? [validatedData.category] : ['General']);
    
    // Prepare blog post data matching the actual schema
    const blogPost = {
      tenant_id: tenantId,
      type: 'evergreen', // Default post type
      title: validatedData.title,
      slug,
      excerpt: validatedData.excerpt || stripHtml(validatedData.content).substring(0, 200),
      body_mdx: convertWordPressToMdx(validatedData.content), // Convert WP content to MDX
      images: [
        // Featured image first
        ...(featuredImageUrl ? [{ 
          url: featuredImageUrl, 
          alt: `Featured image for ${validatedData.title}`,
          isFeatured: true 
        }] : []),
        // Then all other images
        ...allImages.filter(img => img.url !== featuredImageUrl),
        // Include videos as well
        ...(validatedData.videos || [])
      ],
      status: validatedData.status === 'draft' ? 'draft' : 'published',
      published_at: validatedData.publishedAt || new Date().toISOString(),
      seo: {
        title: validatedData.seoTitle || validatedData.title,
        description: validatedData.seoDescription || validatedData.excerpt || stripHtml(validatedData.content).substring(0, 160),
        image: featuredImageUrl,
        focusKeyword: validatedData.focusKeyword,
        categories: categoriesArray,
        tags: validatedData.tags || []
      },
      jsonld: {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": validatedData.title,
        "description": validatedData.excerpt || stripHtml(validatedData.content).substring(0, 160),
        "author": {
          "@type": "Person",
          "name": validatedData.author
        },
        "datePublished": validatedData.publishedAt || new Date().toISOString(),
        "image": allImages.map(img => img.url).filter(Boolean),
        "keywords": validatedData.tags?.join(', ')
      }
    };

    // Insert blog post into database
    const { data, error } = await supabase
      .from('posts')
      .insert(blogPost)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create blog post', details: error.message },
        { status: 500 }
      );
    }

    // Log the webhook event for auditing
    await supabase
      .from('webhook_logs')
      .insert({
        tenant_id: tenantId,
        webhook_type: 'make_blog_post',
        payload: body,
        response: data,
        status: 'success',
        created_at: new Date().toISOString()
      });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Blog post created successfully',
      data: {
        id: data.id,
        title: data.title,
        slug: data.slug,
        url: `/${tenantId}/blog/${data.slug}`,
        published_at: data.published_at
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Webhook error:', error);
    
    // Log failed webhook attempt
    await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: 'make_blog_post',
        payload: await request.json().catch(() => null),
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'failed',
        created_at: new Date().toISOString()
      });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to verify webhook is working
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/make/blog',
    method: 'POST',
    description: 'WordPress-compatible blog post creation via Make.com webhook',
    requirements: {
      images: 'Minimum 5-7 images recommended for quality posts',
      content: 'Accepts WordPress HTML/Gutenberg blocks or plain HTML',
      conversion: 'Automatically converts WordPress content to MDX'
    },
    schema: {
      // Required fields
      title: 'string (required)',
      content: 'string (required) - WordPress HTML/Gutenberg blocks supported',
      
      // WordPress standard fields
      slug: 'string (optional)',
      excerpt: 'string (optional)',
      author: 'string (optional, default: AI Agent)',
      category: 'string (optional)',
      categories: 'string[] (optional) - WordPress style categories',
      tags: 'string[] (optional)',
      status: 'draft | published | scheduled (optional)',
      
      // Images (minimum 5-7 recommended)
      featuredImage: 'URL string (optional)',
      featured_media: 'URL string (optional) - WordPress style',
      images: 'array of {url, alt, caption, width?, height?} (optional)',
      gallery: 'string[] of URLs (optional) - WordPress gallery',
      
      // Videos
      videos: 'array of {url, title?, thumbnail?, embedCode?} (optional)',
      
      // SEO (Yoast/RankMath compatible)
      seoTitle: 'string (optional)',
      seoDescription: 'string (optional)',
      focusKeyword: 'string (optional)',
      
      // Publishing
      publishedAt: 'ISO date string (optional)',
      
      // Multi-tenant
      tenantId: 'string (optional)',
      webhookSecret: 'string (optional, set as Authorization: Bearer <secret>)',
      
      // WordPress meta
      meta: 'object (optional) - custom meta fields',
      custom_fields: 'object (optional) - WordPress custom fields'
    },
    examples: {
      minimal: {
        title: "Best Fitness Trackers 2025",
        content: "<p>Content with embedded images...</p>"
      },
      full: {
        title: "Top 10 Smartwatches for Health Monitoring",
        content: "<!-- wp:paragraph -->Full WordPress content<!-- /wp:paragraph -->",
        excerpt: "Comprehensive guide to health-focused smartwatches",
        categories: ["Smartwatches", "Health Tech"],
        tags: ["health monitoring", "ECG", "SpO2", "2025"],
        featuredImage: "https://example.com/featured.jpg",
        images: [
          { url: "https://example.com/img1.jpg", alt: "Apple Watch Ultra 2" },
          { url: "https://example.com/img2.jpg", alt: "Garmin Venu 3" },
          { url: "https://example.com/img3.jpg", alt: "Samsung Galaxy Watch 6" },
          { url: "https://example.com/img4.jpg", alt: "Fitbit Sense 2" },
          { url: "https://example.com/img5.jpg", alt: "Whoop 4.0" }
        ],
        seoTitle: "Best Smartwatches for Health Monitoring 2025 | Complete Guide",
        seoDescription: "Discover the top 10 smartwatches for health monitoring in 2025...",
        focusKeyword: "smartwatches health monitoring"
      }
    }
  });
}