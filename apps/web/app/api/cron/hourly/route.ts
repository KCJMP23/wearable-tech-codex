import { NextResponse } from 'next/server';

export async function GET() {
  const results = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/schedule-tick`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` }
    }),
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/run-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` },
      body: JSON.stringify({ tenantSlug: process.env.DEFAULT_TENANT_SLUG ?? 'nectarheat', agent: 'EditorialAgent', input: { cadence: 'hourly-cron' } })
    })
  ]);
  return NextResponse.json({ ok: results.every((res) => res.ok) });
}
