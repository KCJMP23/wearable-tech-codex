'use client';

import { useState, useTransition } from 'react';
import { QuizDrawer } from '@affiliate-factory/ui';
import type { Quiz } from '@affiliate-factory/sdk';

interface QuizWrapperProps {
  quiz: Quiz;
  tenantSlug: string;
}

export function QuizWrapper({ quiz, tenantSlug }: QuizWrapperProps) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (answers: Record<string, string | string[]>) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/${tenantSlug}/quiz/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quizId: quiz.id,
            answers,
          }),
        });

        if (response.ok) {
          setSubmitted(true);
        }
      } catch (error) {
        console.error('Failed to submit quiz:', error);
      }
    });
  };

  if (submitted) {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center">
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          Quiz Completed!
        </h3>
        <p className="text-green-700">
          Thanks for taking the quiz. We'll use your answers to show you personalized recommendations.
        </p>
      </div>
    );
  }

  return (
    <QuizDrawer 
      quiz={quiz} 
      onSubmit={handleSubmit}
    />
  );
}