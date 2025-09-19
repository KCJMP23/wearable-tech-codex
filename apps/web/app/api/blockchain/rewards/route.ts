import { NextRequest } from 'next/server'
import { createClient } from '@affiliate-factory/sdk/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')
    const user_identifier = searchParams.get('user_identifier')
    const reward_type = searchParams.get('reward_type')
    const status = searchParams.get('status')

    let query = supabase
      .from('user_rewards')
      .select('*')
      .order('created_at', { ascending: false })

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    if (user_identifier) {
      query = query.eq('user_identifier', user_identifier)
    }

    if (reward_type) {
      query = query.eq('reward_type', reward_type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: rewards, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Calculate total rewards by type
    const summary = rewards?.reduce((acc, reward) => {
      const type = reward.reward_type
      if (!acc[type]) {
        acc[type] = { total: 0, pending: 0, distributed: 0 }
      }
      acc[type].total += parseFloat(reward.amount)
      if (reward.status === 'pending') {
        acc[type].pending += parseFloat(reward.amount)
      } else if (reward.status === 'distributed') {
        acc[type].distributed += parseFloat(reward.amount)
      }
      return acc
    }, {} as Record<string, { total: number; pending: number; distributed: number }>)

    return Response.json({ rewards, summary })
  } catch (error) {
    console.error('Error fetching rewards:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      tenant_id,
      user_identifier,
      reward_type,
      amount,
      source,
      reference_id,
      expires_at,
      metadata = {}
    } = body

    const { data: reward, error } = await supabase
      .from('user_rewards')
      .insert({
        tenant_id,
        user_identifier,
        reward_type,
        amount,
        source,
        reference_id,
        expires_at,
        metadata,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ reward }, { status: 201 })
  } catch (error) {
    console.error('Error creating reward:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}