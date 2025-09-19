import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { SupabaseServer } from '@affiliate-factory/sdk';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

// Subscription tiers
const PRICING_TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    sites: 1,
    features: ['1 site', 'Basic analytics', 'Community support'],
  },
  starter: {
    id: 'price_starter_monthly',
    name: 'Starter',
    price: 29,
    sites: 3,
    features: ['3 sites', 'Advanced analytics', 'Email support', 'Custom domains'],
  },
  growth: {
    id: 'price_growth_monthly',
    name: 'Growth',
    price: 99,
    sites: -1, // unlimited
    features: ['Unlimited sites', 'Premium analytics', 'Priority support', 'API access', 'White label'],
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = await SupabaseServer.createClient();
    
    // Get user's current subscription
    const { data: user } = await supabase
      .from('platform_users')
      .select('subscription_tier, stripe_customer_id, stripe_subscription_id')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      tiers: PRICING_TIERS,
      currentTier: user?.subscription_tier || 'free',
      subscription: {
        customerId: user?.stripe_customer_id,
        subscriptionId: user?.stripe_subscription_id,
      },
    });
  } catch (error) {
    console.error('Billing GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch billing info' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email, tier, action } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID and email required' }, { status: 400 });
    }

    const supabase = await SupabaseServer.createClient();

    // Get or create Stripe customer
    const { data: user } = await supabase
      .from('platform_users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = user?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('platform_users')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    if (action === 'create-checkout') {
      // Create checkout session for new subscription
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: PRICING_TIERS[tier as keyof typeof PRICING_TIERS].id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        metadata: {
          userId,
          tier,
        },
      });

      return NextResponse.json({ checkoutUrl: session.url });
    }

    if (action === 'manage-billing') {
      // Create billing portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      });

      return NextResponse.json({ portalUrl: session.url });
    }

    if (action === 'cancel-subscription') {
      const { data: userData } = await supabase
        .from('platform_users')
        .select('stripe_subscription_id')
        .eq('id', userId)
        .single();

      if (userData?.stripe_subscription_id) {
        await stripe.subscriptions.cancel(userData.stripe_subscription_id);
        
        await supabase
          .from('platform_users')
          .update({ 
            subscription_tier: 'free',
            stripe_subscription_id: null,
          })
          .eq('id', userId);

        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Billing POST error:', error);
    return NextResponse.json({ error: 'Billing operation failed' }, { status: 500 });
  }
}