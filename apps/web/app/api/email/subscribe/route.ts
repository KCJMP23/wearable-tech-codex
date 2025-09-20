import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  source: z.string().optional(),
  listIds: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  doubleOptIn: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = subscribeSchema.parse(body);

    // Get tenant from subdomain or header
    const host = request.headers.get('host') || '';
    const subdomain = host.split('.')[0];
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get tenant ID
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('domain', subdomain)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check if email already exists
    const { data: existingSubscriber } = await supabase
      .from('email_subscribers')
      .select('id, status')
      .eq('tenant_id', tenant.id)
      .eq('email', validatedData.email)
      .single();

    if (existingSubscriber) {
      if (existingSubscriber.status === 'active') {
        return NextResponse.json(
          { error: 'Email already subscribed' },
          { status: 409 }
        );
      }
      
      // Reactivate if previously unsubscribed
      if (existingSubscriber.status === 'unsubscribed') {
        const { error: updateError } = await supabase
          .from('email_subscribers')
          .update({
            status: validatedData.doubleOptIn ? 'pending' : 'active',
            first_name: validatedData.firstName,
            last_name: validatedData.lastName,
            source: validatedData.source,
            tags: validatedData.tags || [],
            custom_fields: validatedData.customFields || {},
            subscribed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSubscriber.id);

        if (updateError) {
          throw updateError;
        }

        // Add to lists if specified
        if (validatedData.listIds && validatedData.listIds.length > 0) {
          const listInserts = validatedData.listIds.map(listId => ({
            list_id: listId,
            subscriber_id: existingSubscriber.id,
            is_active: true,
          }));

          await supabase
            .from('email_list_subscribers')
            .upsert(listInserts, { onConflict: 'list_id,subscriber_id' });
        }

        return NextResponse.json({
          success: true,
          subscriberId: existingSubscriber.id,
          message: 'Successfully resubscribed',
        });
      }
    }

    // Create new subscriber
    const { data: newSubscriber, error: insertError } = await supabase
      .from('email_subscribers')
      .insert({
        tenant_id: tenant.id,
        email: validatedData.email,
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        status: validatedData.doubleOptIn ? 'pending' : 'active',
        source: validatedData.source || 'website',
        tags: validatedData.tags || [],
        custom_fields: validatedData.customFields || {},
        ip_address: request.ip,
        user_agent: request.headers.get('user-agent'),
      })
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    // Add to lists if specified
    if (validatedData.listIds && validatedData.listIds.length > 0) {
      const listInserts = validatedData.listIds.map(listId => ({
        list_id: listId,
        subscriber_id: newSubscriber.id,
        is_active: true,
      }));

      await supabase
        .from('email_list_subscribers')
        .insert(listInserts);
    }

    // Send welcome email or double opt-in email
    if (validatedData.doubleOptIn) {
      // TODO: Send double opt-in confirmation email
    } else {
      // TODO: Trigger welcome automation
    }

    return NextResponse.json({
      success: true,
      subscriberId: newSubscriber.id,
      message: validatedData.doubleOptIn 
        ? 'Please check your email to confirm subscription'
        : 'Successfully subscribed',
    });

  } catch (error) {
    console.error('Subscription error:', error);
    
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