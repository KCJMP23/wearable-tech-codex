import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { SupabaseServer } from '@affiliate-factory/sdk';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = await SupabaseServer.createClient();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, tier } = session.metadata || {};

        if (userId && tier) {
          await supabase
            .from('platform_users')
            .update({
              subscription_tier: tier,
              stripe_subscription_id: session.subscription as string,
            })
            .eq('id', userId);

          // Log the upgrade
          await supabase.from('insights').insert({
            tenant_id: userId,
            event_type: 'subscription_upgraded',
            event_data: { tier, amount: session.amount_total },
            created_at: new Date().toISOString(),
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          // Update subscription status
          const tier = subscription.items.data[0]?.price.metadata?.tier || 'free';
          
          await supabase
            .from('platform_users')
            .update({
              subscription_tier: tier,
              subscription_status: subscription.status,
            })
            .eq('stripe_customer_id', subscription.customer);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await supabase
          .from('platform_users')
          .update({
            subscription_tier: 'free',
            stripe_subscription_id: null,
            subscription_status: 'canceled',
          })
          .eq('stripe_customer_id', subscription.customer);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Send email notification about failed payment
        console.log('Payment failed for customer:', invoice.customer);
        
        // You could trigger an email here
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}