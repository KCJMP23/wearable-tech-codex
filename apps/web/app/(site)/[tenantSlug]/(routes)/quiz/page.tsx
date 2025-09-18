import { notFound } from 'next/navigation';
import { getTenantBySlug } from '../../../../lib/tenant';
import { getActiveQuiz } from '../../../../lib/content';
import { QuizDrawer } from '@affiliate-factory/ui';
import { submitQuizAnswers } from '../actions';

interface QuizPageProps {
  params: { tenantSlug: string };
}

export default async function QuizPage({ params }: QuizPageProps) {
  const tenant = await getTenantBySlug(params.tenantSlug);
  if (!tenant) notFound();
  const quiz = await getActiveQuiz(tenant.id);
  if (!quiz) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-16">
        <h1 className="text-4xl font-semibold text-neutral-900">Quiz coming soon</h1>
        <p className="text-neutral-600">The personalization agent is building an even better quiz experience. Check back shortly.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-16">
      <h1 className="text-4xl font-semibold text-neutral-900">{quiz.title}</h1>
      <p className="text-neutral-600">Answer a few quick questions to unlock curated recommendations.</p>
      <QuizDrawer quiz={quiz} onSubmit={(answers) => submitQuizAnswers(params.tenantSlug, quiz.id, answers)} />
    </div>
  );
}
