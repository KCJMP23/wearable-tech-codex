import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { SupabaseServer } from '@affiliate-factory/sdk';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { niche, tenantId, count = 10 } = await req.json();
    
    if (!niche || !tenantId) {
      return NextResponse.json(
        { error: 'Niche and tenant ID are required' },
        { status: 400 }
      );
    }

    // Use AI to generate relevant products for the niche
    const prompt = `Generate ${count} realistic affiliate products for a ${niche} website.
    
    For each product, provide:
    - name: Product name
    - description: 2-3 sentence description
    - price: Realistic price in USD
    - category: Specific category within ${niche}
    - brand: Realistic brand name
    - features: Array of 3-4 key features
    - rating: Number between 3.5 and 5
    - review_count: Number between 50 and 5000
    
    Return as a JSON array.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in e-commerce and affiliate marketing. Generate realistic product data.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    });

    const generatedData = JSON.parse(completion.choices[0].message.content || '{"products": []}');
    const products = generatedData.products || [];

    const supabase = await SupabaseServer.createClient();
    
    const productsToInsert = products.map((p: any) => ({
      tenant_id: tenantId,
      name: p.name,
      description: p.description,
      price: p.price,
      category: p.category,
      brand: p.brand,
      rating: p.rating,
      review_count: p.review_count,
      features: p.features,
      // Generate affiliate URLs (in production, these would be real affiliate links)
      affiliate_url: `https://affiliate.example.com/product/${p.name.toLowerCase().replace(/\s+/g, '-')}`,
      image_url: `https://placehold.co/400x400/purple/white?text=${encodeURIComponent(p.name)}`,
      created_at: new Date().toISOString(),
      ai_generated: true,
    }));

    const { data, error } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to save generated products' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      generated: data.length,
      products: data,
      niche: niche,
    });
  } catch (error) {
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate products' },
      { status: 500 }
    );
  }
}