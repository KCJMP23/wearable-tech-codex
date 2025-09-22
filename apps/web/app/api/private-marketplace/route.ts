import { NextRequest, NextResponse } from 'next/server'
import { SupabaseServer } from '@affiliate-factory/sdk'
import { ensureInternalApiAccess } from '@/lib/security/internal-auth'

export async function GET(request: NextRequest) {
  const unauthorized = ensureInternalApiAccess(request)
  if (unauthorized) {
    return unauthorized
  }

  try {
    const supabase = await SupabaseServer.createClient()
    const { searchParams } = new URL(request.url)
    const brand_id = searchParams.get('brand_id')
    const category = searchParams.get('category')
    const exclusive = searchParams.get('exclusive')

    let query = supabase
      .from('private_marketplace')
      .select(`
        *,
        brands (
          id,
          name,
          slug,
          logo_url,
          tier
        )
      `)
      .order('created_at', { ascending: false })

    if (brand_id) {
      query = query.eq('brand_id', brand_id)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (exclusive !== null) {
      query = query.eq('exclusive', exclusive === 'true')
    }

    // Only show products that are currently available
    const now = new Date().toISOString()
    query = query
      .or(`availability_start.is.null,availability_start.lte.${now}`)
      .or(`availability_end.is.null,availability_end.gte.${now}`)

    const { data: products, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching private marketplace products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = ensureInternalApiAccess(request)
  if (unauthorized) {
    return unauthorized
  }

  try {
    const supabase = await SupabaseServer.createClient()
    const body = await request.json()

    const {
      brand_id,
      product_id,
      title,
      description,
      price,
      original_price,
      currency = 'USD',
      images = [],
      features = [],
      category,
      commission_rate,
      exclusive = true,
      stock_quantity,
      availability_start,
      availability_end,
      metadata = {}
    } = body

    const { data: product, error } = await supabase
      .from('private_marketplace')
      .insert({
        brand_id,
        product_id,
        title,
        description,
        price,
        original_price,
        currency,
        images,
        features,
        category,
        commission_rate,
        exclusive,
        stock_quantity,
        availability_start,
        availability_end,
        metadata
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Error creating private marketplace product:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
