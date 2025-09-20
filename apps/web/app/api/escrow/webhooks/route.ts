/**
 * Stripe webhook endpoint for escrow system
 * Dedicated route for handling Stripe webhook events
 */

import { NextRequest } from 'next/server';
import { handleStripeWebhook } from '../webhooks';

export async function POST(request: NextRequest) {
  return handleStripeWebhook(request);
}

// Only allow POST requests for webhooks
export async function GET() {
  return new Response('Method not allowed', { status: 405 });
}

export async function PUT() {
  return new Response('Method not allowed', { status: 405 });
}

export async function DELETE() {
  return new Response('Method not allowed', { status: 405 });
}

export async function PATCH() {
  return new Response('Method not allowed', { status: 405 });
}