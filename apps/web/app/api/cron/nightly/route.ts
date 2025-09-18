import { NextResponse } from 'next/server';

export async function GET() {
  const endpoints = ['link-verify', 'embeddings-index'];
  const results = await Promise.all(
    endpoints.map((endpoint) =>
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json'
        }
      })
    )
  );
  return NextResponse.json({ ok: results.every((res) => res.ok) });
}
