import { NextRequest } from 'next/server'
import { SupabaseServer } from '@affiliate-factory/sdk'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const supabase = await SupabaseServer.createClient()
    const { brandId } = await params

    const { data: partnerships, error } = await supabase
      .from('brand_partnerships')
      .select(`
        *,
        tenants (
          id,
          name,
          slug,
          domain
        ),
        brands (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ partnerships })
  } catch (error) {
    console.error('Error fetching partnerships:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const supabase = createClient()
    const { brandId } = await params
    const body = await request.json()

    const {
      tenant_id,
      commission_rate,
      contract_start_date,
      contract_end_date,
      exclusive = false,
      performance_bonus = {}
    } = body

    const { data: partnership, error } = await supabase
      .from('brand_partnerships')
      .insert({
        tenant_id,
        brand_id: brandId,
        commission_rate,
        contract_start_date,
        contract_end_date,
        exclusive,
        performance_bonus,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ partnership }, { status: 201 })
  } catch (error) {
    console.error('Error creating partnership:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}