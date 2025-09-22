import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { loadEnv } from '@affiliate-factory/sdk';

const { INTERNAL_API_SECRET } = loadEnv();

function tokensMatch(provided: string | null, expected: string): boolean {
  if (!provided) {
    return false;
  }

  try {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export function ensureInternalApiAccess(request: NextRequest): NextResponse | null {
  const headerToken = request.headers.get('x-internal-token');
  const authorization = request.headers.get('authorization');
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;

  const allowed = tokensMatch(headerToken, INTERNAL_API_SECRET) || tokensMatch(bearerToken, INTERNAL_API_SECRET);

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
