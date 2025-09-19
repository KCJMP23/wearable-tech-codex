import { NextRequest, NextResponse } from 'next/server';
import { SupabaseServer } from '@affiliate-factory/sdk';

export async function POST(req: NextRequest) {
  try {
    const supabase = await SupabaseServer.createClient();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const tenantId = formData.get('tenantId') as string;

    if (!file || !tenantId) {
      return NextResponse.json(
        { error: 'File and tenant ID are required' },
        { status: 400 }
      );
    }

    // Parse CSV content
    const content = await file.text();
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const products = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const product: any = {};
      
      headers.forEach((header, index) => {
        product[header.toLowerCase().replace(/\s+/g, '_')] = values[index];
      });
      
      products.push({
        tenant_id: tenantId,
        name: product.name || product.title || 'Unnamed Product',
        description: product.description || '',
        price: parseFloat(product.price) || 0,
        affiliate_url: product.url || product.affiliate_url || '',
        image_url: product.image || product.image_url || '',
        category: product.category || 'Uncategorized',
        brand: product.brand || '',
        asin: product.asin || '',
        created_at: new Date().toISOString(),
      });
    }

    // Insert products into database
    const { data, error } = await supabase
      .from('products')
      .insert(products)
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to import products' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: data.length,
      products: data,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to process CSV file' },
      { status: 500 }
    );
  }
}