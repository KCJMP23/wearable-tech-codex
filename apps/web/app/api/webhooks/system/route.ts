import { NextRequest } from 'next/server'
import { SupabaseServer } from '@affiliate-factory/sdk'
import { createHmac } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const supabase = await SupabaseServer.createClient()
    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')
    const app_id = searchParams.get('app_id')

    let query = supabase
      .from('webhooks')
      .select(`
        *,
        developer_apps (
          id,
          name,
          developer_id
        )
      `)
      .order('created_at', { ascending: false })

    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id)
    }

    if (app_id) {
      query = query.eq('app_id', app_id)
    }

    const { data: webhooks, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ webhooks })
  } catch (error) {
    console.error('Error fetching webhooks:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      tenant_id,
      app_id,
      name,
      url,
      events,
      retry_count = 3,
      timeout_seconds = 30,
      headers = {}
    } = body

    // Generate webhook secret
    const secret = require('crypto').randomBytes(32).toString('hex')

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        tenant_id,
        app_id,
        name,
        url,
        secret,
        events,
        retry_count,
        timeout_seconds,
        headers,
        active: true
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ webhook }, { status: 201 })
  } catch (error) {
    console.error('Error creating webhook:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Function to trigger webhooks (used internally)
export async function triggerWebhook(
  tenant_id: string,
  event: string,
  payload: any
) {
  try {
    const supabase = createClient()

    // Get all active webhooks for this tenant and event
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('active', true)
      .contains('events', [event])

    if (error || !webhooks?.length) {
      return
    }

    // Trigger each webhook
    const webhookPromises = webhooks.map(async (webhook) => {
      try {
        const timestamp = Math.floor(Date.now() / 1000)
        const bodyString = JSON.stringify({
          event,
          data: payload,
          timestamp,
          tenant_id
        })

        // Create signature
        const signature = createHmac('sha256', webhook.secret)
          .update(bodyString)
          .digest('hex')

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${signature}`,
            'X-Webhook-Event': event,
            'X-Webhook-Timestamp': timestamp.toString(),
            ...webhook.headers
          },
          body: bodyString,
          signal: AbortSignal.timeout(webhook.timeout_seconds * 1000)
        })

        // Update webhook status
        await supabase
          .from('webhooks')
          .update({
            last_triggered_at: new Date().toISOString(),
            last_status: response.status
          })
          .eq('id', webhook.id)

        // Log the webhook delivery
        await supabase.from('webhook_logs').insert({
          tenant_id,
          webhook_type: 'system',
          payload: {
            webhook_id: webhook.id,
            event,
            url: webhook.url,
            status: response.status,
            response_text: await response.text()
          },
          status: response.ok ? 'success' : 'failed'
        })

      } catch (error) {
        console.error(`Webhook delivery failed for ${webhook.url}:`, error)
        
        // Log the error
        await supabase.from('webhook_logs').insert({
          tenant_id,
          webhook_type: 'system',
          payload: {
            webhook_id: webhook.id,
            event,
            url: webhook.url,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          status: 'failed'
        })
      }
    })

    await Promise.allSettled(webhookPromises)
  } catch (error) {
    console.error('Error triggering webhooks:', error)
  }
}