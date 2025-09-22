import { Resend } from 'resend';
import { loadEnv } from './env.js';
import type { NewsletterCampaign } from './types.js';

let resendClient: Resend | null = null;

function getClient(): Resend {
  if (!resendClient) {
    const env = loadEnv();
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendNewsletter(campaign: NewsletterCampaign): Promise<string> {
  const env = loadEnv();
  const fromEmail = env.RESEND_FROM_EMAIL ?? `Affiliate Factory <news@${env.NEXT_PUBLIC_DEFAULT_DOMAIN}>`;
  const client = getClient();

  const response = await client.emails.send({
    from: fromEmail,
    to: campaign.segment,
    subject: campaign.subject,
    html: campaign.html,
    headers: {
      'X-Affiliate-Tenant': campaign.tenantId
    }
  }) as { id?: string };

  return response.id ?? '';
}
