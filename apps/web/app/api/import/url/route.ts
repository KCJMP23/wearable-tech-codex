import { NextRequest, NextResponse } from 'next/server';
import { SupabaseServer } from '@affiliate-factory/sdk';

export async function POST(req: NextRequest) {
  try {
    const { url, tenantId, selector } = await req.json();
    
    if (!url || !tenantId) {
      return NextResponse.json(
        { error: 'URL and tenant ID are required' },
        { status: 400 }
      );
    }

    // Scrape products from URL
    // In production, this would use a proper scraping service
    const response = await fetch(url);
    const html = await response.text();
    
    // Basic example - extract product info
    // In reality, this would use cheerio or puppeteer for proper scraping
    const products = [];
    
    // Mock scraped data for demo
    const mockProducts = [
      {
        name: 'Scraped Product 1',
        price: 99.99,
        description: 'Product scraped from ' + url,
        affiliate_url: url,
      },
      {
        name: 'Scraped Product 2',
        price: 149.99,
        description: 'Another product from ' + url,
        affiliate_url: url,
      },
    ];

    const supabase = await SupabaseServer.createClient();
    
    const productsToInsert = mockProducts.map(p => ({
      tenant_id: tenantId,
      name: p.name,
      description: p.description,
      price: p.price,
      affiliate_url: p.affiliate_url,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();

    if (error) {
      return NextResponse.json({ error: 'Failed to save products' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: data.length,
      products: data,
      source: url,
    });
  } catch (error) {
    console.error('URL import error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape URL' },
      { status: 500 }
    );
  }
}