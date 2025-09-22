'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, User, Building, CreditCard, Sparkles, CheckCircle } from 'lucide-react';
import { OnboardingQuiz } from '../../../components/OnboardingQuiz';
import { useRouter } from 'next/navigation';

type OnboardingStep = 'email' | 'account' | 'business' | 'quiz' | 'payment' | 'complete';

interface UserData {
  email: string;
  fullName: string;
  password: string;
  businessName: string;
  website?: string;
  quizAnswers?: Record<string, any>;
}

export default function PremiumOnboarding() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('email');
  const [userData, setUserData] = useState<UserData>({
    email: '',
    fullName: '',
    password: '',
    businessName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    { id: 'email', title: 'Get Started', icon: <Mail className="w-5 h-5" /> },
    { id: 'account', title: 'Create Account', icon: <User className="w-5 h-5" /> },
    { id: 'business', title: 'Business Info', icon: <Building className="w-5 h-5" /> },
    { id: 'quiz', title: 'Configure Store', icon: <Sparkles className="w-5 h-5" /> },
    { id: 'payment', title: 'Choose Plan', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'complete', title: 'Launch', icon: <CheckCircle className="w-5 h-5" /> }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData.email) {
      setError('Please enter your email');
      return;
    }
    setError('');
    setCurrentStep('account');
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData.fullName || !userData.password) {
      setError('Please fill in all fields');
      return;
    }
    if (userData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setCurrentStep('business');
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData.businessName) {
      setError('Please enter your business name');
      return;
    }
    setError('');
    setCurrentStep('quiz');
  };

  const handleQuizComplete = (answers: Record<string, any>) => {
    setUserData(prev => ({ ...prev, quizAnswers: answers }));
    setCurrentStep('payment');
  };

  const handlePaymentSubmit = async () => {
    setIsLoading(true);
    try {
      // Create user account and tenant
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        throw new Error('Failed to create account');
      }

      const result = await response.json();
      setCurrentStep('complete');
      
      // Redirect to user's unique dashboard after 3 seconds
      setTimeout(() => {
        router.push(`/dashboard/${result.tenantSlug}`);
      }, 3000);

    } catch (err) {
      setError('Failed to create your account. Please try again.');
      console.error('Onboarding error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserData = (field: keyof UserData, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-900">Create Your Store</h1>
            <div className="text-sm text-gray-500">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          {/* Step Indicators */}
          <div className="flex items-center justify-between mt-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  index <= currentStepIndex 
                    ? 'bg-purple-500 border-purple-500 text-white' 
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step.icon}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  index <= currentStepIndex ? 'text-purple-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 py-12">
        <div className="max-w-2xl mx-auto px-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Email Capture */}
            {currentStep === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Launch Your AI-Powered Store
                  </h2>
                  <p className="text-xl text-gray-600">
                    Join thousands of entrepreneurs building successful affiliate businesses with our AI platform
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {error}
                    </div>
                  )}
                  
                  <div>
                    <input
                      type="email"
                      value={userData.email}
                      onChange={(e) => updateUserData('email', e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-4 py-4 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    Start Your Free Trial
                  </button>

                  <p className="text-sm text-gray-500">
                    14-day free trial • No credit card required • Cancel anytime
                  </p>
                </form>
              </motion.div>
            )}

            {/* Step 2: Account Creation */}
            {currentStep === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Create Your Account
                  </h2>
                  <p className="text-gray-600">
                    Set up your secure account to get started
                  </p>
                </div>

                <form onSubmit={handleAccountSubmit} className="space-y-6">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={userData.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={userData.fullName}
                      onChange={(e) => updateUserData('fullName', e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={userData.password}
                      onChange={(e) => updateUserData('password', e.target.value)}
                      placeholder="Create a secure password (8+ characters)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      minLength={8}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    Create Account
                  </button>
                </form>
              </motion.div>
            )}

            {/* Step 3: Business Information */}
            {currentStep === 'business' && (
              <motion.div
                key="business"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Tell Us About Your Business
                  </h2>
                  <p className="text-gray-600">
                    Help us personalize your store and recommendations
                  </p>
                </div>

                <form onSubmit={handleBusinessSubmit} className="space-y-6">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={userData.businessName}
                      onChange={(e) => updateUserData('businessName', e.target.value)}
                      placeholder="e.g., Tech Gadgets Pro, Fitness Hub, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Website (Optional)
                    </label>
                    <input
                      type="url"
                      value={userData.website || ''}
                      onChange={(e) => updateUserData('website', e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                  >
                    Continue to Store Setup
                  </button>
                </form>
              </motion.div>
            )}

            {/* Step 4: Configuration Quiz */}
            {currentStep === 'quiz' && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Configure Your Store
                  </h2>
                  <p className="text-gray-600">
                    Answer a few questions to customize your AI agents and store setup
                  </p>
                </div>

                <OnboardingQuiz 
                  onComplete={handleQuizComplete}
                  tenantSlug={userData.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')}
                />
              </motion.div>
            )}

            {/* Step 5: Payment Plan Selection */}
            {currentStep === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Choose Your Plan
                  </h2>
                  <p className="text-gray-600">
                    Start with our free trial, upgrade anytime
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Starter Plan */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-2">Free Trial</h3>
                    <div className="text-3xl font-bold mb-4">$0<span className="text-base font-normal text-gray-500">/14 days</span></div>
                    <ul className="space-y-2 text-sm text-gray-600 mb-6">
                      <li>• 1 Store</li>
                      <li>• 100 Products</li>
                      <li>• Basic AI Agents</li>
                      <li>• Email Support</li>
                    </ul>
                  </div>

                  {/* Pro Plan */}
                  <div className="border-2 border-purple-500 rounded-lg p-6 bg-purple-50 relative">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Recommended
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Pro Plan</h3>
                    <div className="text-3xl font-bold mb-4">$49<span className="text-base font-normal text-gray-500">/month</span></div>
                    <ul className="space-y-2 text-sm text-gray-600 mb-6">
                      <li>• Unlimited Stores</li>
                      <li>• 10,000 Products</li>
                      <li>• Advanced AI Agents</li>
                      <li>• Priority Support</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <button
                    onClick={handlePaymentSubmit}
                    disabled={isLoading}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {isLoading ? 'Setting Up Your Store...' : 'Start Free Trial'}
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    No credit card required • Upgrade anytime
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 6: Completion */}
            {currentStep === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="mb-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    🎉 Welcome to Your Store!
                  </h2>
                  <p className="text-xl text-gray-600 mb-6">
                    Your AI-powered affiliate store is being set up. You'll be redirected to your dashboard shortly.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">What's Next?</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                      <span>Account created and verified</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                      <span>AI agents configured for your niche</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                      <span>Store theme and branding applied</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full mt-0.5"
                      />
                      <span>Generating initial products and content...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}