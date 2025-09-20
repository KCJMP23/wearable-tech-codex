import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const unsubscribeSchema = z.object({
  token: z.string().optional(),
  email: z.string().email().optional(),
  subscriberId: z.string().uuid().optional(),
}).refine(data => data.token || data.email || data.subscriberId, {
  message: 'Either token, email, or subscriberId must be provided',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = unsubscribeSchema.parse(body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let subscriberId: string;

    if (validatedData.token) {
      // Validate unsubscribe token
      const { data: tokenData, error: tokenError } = await supabase
        .from('email_unsubscribe_tokens')
        .select('subscriber_id, expires_at, used_at')
        .eq('token', validatedData.token)
        .single();

      if (tokenError || !tokenData) {
        return NextResponse.json(
          { error: 'Invalid unsubscribe token' },
          { status: 400 }
        );
      }

      if (tokenData.used_at) {
        return NextResponse.json(
          { error: 'Unsubscribe token already used' },
          { status: 400 }
        );
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        return NextResponse.json(
          { error: 'Unsubscribe token expired' },
          { status: 400 }
        );
      }

      subscriberId = tokenData.subscriber_id;

      // Mark token as used
      await supabase
        .from('email_unsubscribe_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', validatedData.token);

    } else if (validatedData.subscriberId) {
      subscriberId = validatedData.subscriberId;
    } else if (validatedData.email) {
      // Find subscriber by email
      const host = request.headers.get('host') || '';
      const subdomain = host.split('.')[0];

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('domain', subdomain)
        .single();

      if (!tenant) {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }

      const { data: subscriber } = await supabase
        .from('email_subscribers')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('email', validatedData.email)
        .single();

      if (!subscriber) {
        return NextResponse.json(
          { error: 'Subscriber not found' },
          { status: 404 }
        );
      }

      subscriberId = subscriber.id;
    } else {
      return NextResponse.json(
        { error: 'No valid identifier provided' },
        { status: 400 }
      );
    }

    // Update subscriber status
    const { error: updateError } = await supabase
      .from('email_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriberId);

    if (updateError) {
      throw updateError;
    }

    // Deactivate from all lists
    await supabase
      .from('email_list_subscribers')
      .update({
        is_active: false,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('subscriber_id', subscriberId);

    // Track unsubscribe event
    await supabase
      .from('email_analytics')
      .insert({
        subscriber_id: subscriberId,
        event: 'unsubscribed',
        timestamp: new Date().toISOString(),
        ip_address: request.ip,
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed',
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET request for one-click unsubscribe
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const email = url.searchParams.get('email');

  if (!token && !email) {
    return new NextResponse('Missing token or email parameter', { status: 400 });
  }

  try {
    const response = await POST(request);
    const result = await response.json();

    if (result.success) {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed Successfully</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 40px 20px;
              background-color: #f9fafb;
              color: #374151;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            h1 { color: #059669; margin-bottom: 20px; }
            p { font-size: 16px; margin-bottom: 20px; }
            .footer { font-size: 14px; color: #6b7280; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Unsubscribed Successfully</h1>
            <p>You have been successfully unsubscribed from our mailing list.</p>
            <p>We're sorry to see you go, but we respect your decision.</p>
            <div class="footer">
              <p>If you unsubscribed by mistake, you can always subscribe again from our website.</p>
            </div>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribe Error</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 40px 20px;
              background-color: #f9fafb;
              color: #374151;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            h1 { color: #dc2626; margin-bottom: 20px; }
            p { font-size: 16px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Unsubscribe Error</h1>
            <p>We encountered an error while processing your unsubscribe request.</p>
            <p>Error: ${result.error}</p>
            <p>Please contact our support team if this problem persists.</p>
          </div>
        </body>
        </html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      });
    }
  } catch (error) {
    return new NextResponse('Internal server error', { status: 500 });
  }
}