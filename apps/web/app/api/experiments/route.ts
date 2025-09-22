import { NextRequest, NextResponse } from 'next/server';
import { experimentService } from '@/lib/services/experiments';
import { ensureInternalApiAccess } from '@/lib/security/internal-auth';

export async function GET(request: NextRequest) {
  const unauthorized = ensureInternalApiAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    const experiments = await experimentService.getExperiments(tenantId);
    return NextResponse.json(experiments);
  } catch (error) {
    console.error('Error fetching experiments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = ensureInternalApiAccess(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const body = await request.json();
    const { tenantId, experiment, variants } = body;

    if (!tenantId || !experiment || !variants) {
      return NextResponse.json(
        { error: 'tenantId, experiment, and variants are required' },
        { status: 400 }
      );
    }

    const newExperiment = await experimentService.createExperiment(
      tenantId,
      experiment,
      variants
    );
    
    return NextResponse.json(newExperiment);
  } catch (error) {
    console.error('Error creating experiment:', error);
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    );
  }
}
