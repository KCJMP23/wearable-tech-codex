'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles, Target, Zap, Heart, Brain, TrendingUp } from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  description?: string;
  type: 'single' | 'multiple' | 'range' | 'text';
  options?: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  min?: number;
  max?: number;
  step?: number;
}

const questions: QuizQuestion[] = [
  {
    id: 'niche',
    question: 'What niche are you targeting?',
    description: 'This helps us configure AI agents for your specific market',
    type: 'single',
    options: [
      { value: 'wearable-tech', label: 'Wearable Technology', icon: <Brain className="w-5 h-5" /> },
      { value: 'smart-home', label: 'Smart Home & IoT', icon: <Zap className="w-5 h-5" /> },
      { value: 'outdoor-gear', label: 'Outdoor & Adventure Gear', icon: <Target className="w-5 h-5" /> },
      { value: 'health-wellness', label: 'Health & Wellness', icon: <Heart className="w-5 h-5" /> },
      { value: 'gaming-tech', label: 'Gaming Technology', icon: <TrendingUp className="w-5 h-5" /> },
      { value: 'custom', label: 'Custom Niche', icon: <Sparkles className="w-5 h-5" /> }
    ]
  },
  {
    id: 'audience',
    question: 'Who is your target audience?',
    description: 'Helps personalize content tone and product recommendations',
    type: 'multiple',
    options: [
      { value: 'tech-enthusiasts', label: 'Tech Enthusiasts' },
      { value: 'fitness-athletes', label: 'Fitness & Athletes' },
      { value: 'professionals', label: 'Business Professionals' },
      { value: 'parents', label: 'Parents & Families' },
      { value: 'seniors', label: 'Seniors & Accessibility' },
      { value: 'budget-conscious', label: 'Budget Conscious Buyers' }
    ]
  },
  {
    id: 'priceRange',
    question: 'What price range will you focus on?',
    description: 'Determines product filtering and recommendation strategy',
    type: 'range',
    min: 0,
    max: 2000,
    step: 50
  },
  {
    id: 'contentTypes',
    question: 'What content will you publish?',
    description: 'Configures AI agents for content generation',
    type: 'multiple',
    options: [
      { value: 'reviews', label: 'Product Reviews' },
      { value: 'comparisons', label: 'Comparison Guides' },
      { value: 'howto', label: 'How-To Tutorials' },
      { value: 'news', label: 'Industry News' },
      { value: 'deals', label: 'Deals & Promotions' },
      { value: 'seasonal', label: 'Seasonal Content' }
    ]
  },
  {
    id: 'frequency',
    question: 'How often will you publish?',
    description: 'Sets agent automation schedules',
    type: 'single',
    options: [
      { value: 'daily', label: 'Daily (7 posts/week)' },
      { value: 'frequent', label: 'Frequent (3-5 posts/week)' },
      { value: 'moderate', label: 'Moderate (1-2 posts/week)' },
      { value: 'monthly', label: 'Monthly (4-5 posts/month)' }
    ]
  },
  {
    id: 'automation',
    question: 'How much automation do you want?',
    description: 'Controls AI agent autonomy levels',
    type: 'single',
    options: [
      { value: 'full', label: 'Full Automation - Agents run autonomously' },
      { value: 'supervised', label: 'Supervised - Review before publishing' },
      { value: 'assisted', label: 'AI Assisted - Manual with AI help' },
      { value: 'manual', label: 'Manual - Full control' }
    ]
  }
];

interface OnboardingQuizProps {
  onComplete: (answers: Record<string, any>) => void;
  tenantSlug?: string;
}

export function OnboardingQuiz({ onComplete, tenantSlug }: OnboardingQuizProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleAnswer = (value: any) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      submitQuiz();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const submitQuiz = async () => {
    setLoading(true);
    try {
      // Process answers and configure agents
      const config = {
        ...answers,
        timestamp: new Date().toISOString(),
        tenantSlug
      };

      // Save to database and trigger agent configuration
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        onComplete(config);
      }
    } catch (error) {
      console.error('Quiz submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-neutral-500 mb-2">
          <span>Step {currentStep + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">
              {currentQuestion.question}
            </h2>
            {currentQuestion.description && (
              <p className="text-neutral-600">{currentQuestion.description}</p>
            )}
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.type === 'single' && currentQuestion.options && (
              <div className="grid gap-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      answers[currentQuestion.id] === option.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {option.icon}
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'multiple' && currentQuestion.options && (
              <div className="grid gap-3">
                {currentQuestion.options.map((option) => {
                  const selected = (answers[currentQuestion.id] || []).includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        const current = answers[currentQuestion.id] || [];
                        const updated = selected
                          ? current.filter((v: string) => v !== option.value)
                          : [...current, option.value];
                        handleAnswer(updated);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selected
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <span className="font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {currentQuestion.type === 'range' && (
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-neutral-600">
                  <span>${currentQuestion.min}</span>
                  <span className="font-bold text-lg">
                    ${answers[currentQuestion.id] || currentQuestion.min} - ${(answers[currentQuestion.id] || currentQuestion.min) + 500}
                  </span>
                  <span>${currentQuestion.max}</span>
                </div>
                <input
                  type="range"
                  min={currentQuestion.min}
                  max={currentQuestion.max}
                  step={currentQuestion.step}
                  value={answers[currentQuestion.id] || currentQuestion.min}
                  onChange={(e) => handleAnswer(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            )}

            {currentQuestion.type === 'text' && (
              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder="Enter your answer..."
                className="w-full p-4 border-2 border-neutral-200 rounded-xl focus:border-purple-500 outline-none resize-none h-32"
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                currentStep === 0
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            <button
              onClick={handleNext}
              disabled={!answers[currentQuestion.id] || loading}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                !answers[currentQuestion.id]
                  ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
              }`}
            >
              {currentStep === questions.length - 1 ? (
                loading ? 'Configuring...' : 'Complete Setup'
              ) : (
                'Next'
              )}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}