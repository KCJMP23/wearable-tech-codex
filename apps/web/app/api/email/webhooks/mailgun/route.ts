import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@affiliate-factory/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-mailgun-signature-timestamp') || '';

    // Get email service configuration for Mailgun
    const emailConfig = {
      provider: 'mailgun' as const,
      apiKey: process.env.MAILGUN_API_KEY!,
      domain: process.env.MAILGUN_DOMAIN!,
      fromEmail: process.env.EMAIL_FROM!,
      fromName: process.env.EMAIL_FROM_NAME!,
    };

    const emailService = new EmailService(emailConfig);

    // Process webhook
    const success = await emailService.processWebhook('mailgun', JSON.parse(body), signature);

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Mailgun webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}