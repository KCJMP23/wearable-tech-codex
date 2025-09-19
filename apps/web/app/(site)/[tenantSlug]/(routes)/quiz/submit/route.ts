import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { quizId, answers } = await request.json();
    
    if (!quizId || !answers) {
      return NextResponse.json(
        { error: 'Quiz ID and answers are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    
    // Store quiz responses for personalization
    const { error } = await supabase
      .from('quiz_responses')
      .insert({
        quiz_id: quizId,
        answers,
        ip_address: request.ip || null,
        user_agent: request.headers.get('user-agent') || null,
        completed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving quiz response:', error);
      return NextResponse.json(
        { error: 'Failed to save quiz response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in quiz submission:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}