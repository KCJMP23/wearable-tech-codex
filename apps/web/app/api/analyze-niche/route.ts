import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { niche } = await req.json();

    if (!niche) {
      return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
    }

    const prompt = `Analyze the following niche for an affiliate marketing website: "${niche}"

    Provide a comprehensive analysis in JSON format with:
    1. categories: Array of 5-8 relevant product categories
    2. target_audience: Object with demographics, interests, pain_points, buying_behavior
    3. affiliate_networks: Array of recommended networks (Amazon Associates, ShareASale, CJ Affiliate, etc.)
    4. profit_score: Number 1-10 indicating profit potential
    5. competition_level: "low", "medium", or "high"
    6. content_ideas: Array of 5 blog post ideas
    7. keywords: Array of 10 high-value SEO keywords
    8. estimated_monthly_revenue: Range like "$1,000 - $5,000"
    9. product_types: Array of specific product types to feature
    10. brand_suggestions: Array of popular brands in this niche

    Return only valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert in affiliate marketing and niche analysis. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({
      niche,
      analysis,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Niche analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze niche' },
      { status: 500 }
    );
  }
}