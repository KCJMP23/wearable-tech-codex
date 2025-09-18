'use client';

import { useState } from 'react';
import type { Quiz } from '@affiliate-factory/sdk';
import { Button } from './Button';

interface QuizDrawerProps {
  quiz: Quiz;
  onSubmit: (answers: Record<string, string | string[]>) => Promise<void>;
}

export function QuizDrawer({ quiz, onSubmit }: QuizDrawerProps) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  function updateAnswer(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    await onSubmit(answers);
    setOpen(false);
  }

  return (
    <div>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Take the quiz
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/70 p-6">
          <div className="h-full w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-neutral-900">{quiz.title}</h2>
                <p className="text-sm text-neutral-600">Answer a few questions to personalize product picks.</p>
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <ol className="mt-6 space-y-6">
              {quiz.schema.map((question, index) => (
                <li key={question.id} className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">Step {index + 1}</p>
                  <h3 className="text-lg font-semibold text-neutral-900">{question.question}</h3>
                  <div className="flex flex-wrap gap-2">
                    {question.choices.map((choice) => {
                      const selected = answers[question.id];
                      const isSelected = Array.isArray(selected)
                        ? selected.includes(choice.value)
                        : selected === choice.value;
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() =>
                            updateAnswer(
                              question.id,
                              question.type === 'multi'
                                ? toggleMulti(selected as string[] | undefined, choice.value)
                                : choice.value
                            )
                          }
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            isSelected
                              ? 'border-amber-500 bg-amber-100 text-amber-700'
                              : 'border-neutral-200 bg-white text-neutral-700 hover:border-amber-200'
                          }`}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex justify-end">
              <Button onClick={handleSubmit}>See recommendations</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toggleMulti(current: string[] | undefined, value: string): string[] {
  const set = new Set(current ?? []);
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
  return Array.from(set);
}
