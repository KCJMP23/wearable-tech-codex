'use server';

import { createServiceClient } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function submitQuizAnswers(
  tenantSlug: string,
  quizId: string,
  answers: Record<string, any>
) {
  try {
    const supabase = createServiceClient();
    
    // Store quiz responses for personalization
    const { error } = await supabase
      .from('quiz_responses')
      .insert({
        quiz_id: quizId,
        answers,
        ip_address: null, // Could be extracted from headers if needed
        user_agent: null, // Could be extracted from headers if needed
        completed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving quiz response:', error);
      return { success: false, error: 'Failed to save quiz response' };
    }

    // Revalidate the quiz page to potentially show personalized content
    revalidatePath(`/${tenantSlug}/quiz`);
    
    return { success: true };
  } catch (error) {
    console.error('Error in submitQuizAnswers:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}