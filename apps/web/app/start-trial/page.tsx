'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, Store, Mail, Lock, User } from 'lucide-react';

export default function StartTrialPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    storeName: '',
    fullName: '',
    email: '',
    password: '',
    agreeToTerms: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Handle final submission
      console.log('Trial signup:', formData);
    }
  };

  const benefits = [
    "14-day free trial, no credit card required",
    "Access to all features and AI agents",
    "Free migration from your current platform",
    "24/7 support during trial",
    "Cancel anytime"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              AffiliateOS
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Already have an account? Sign in
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Left Side - Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h1 className="text-3xl font-bold mb-2">Start Your Free Trial</h1>
              <p className="text-gray-600 mb-8">Get your store up and running in minutes</p>

              {/* Progress Steps */}
              <div className="flex justify-between mb-8">
                {[1, 2, 3].map((num) => (
                  <div key={num} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step >= num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step > num ? <Check className="h-5 w-5" /> : num}
                    </div>
                    {num < 3 && (
                      <div className={`w-20 h-1 ${step > num ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                {/* Step 1: Store Info */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Store Name
                      </label>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.storeName}
                          onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                          className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                          placeholder="My Awesome Store"
                          required
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Your store URL will be: {formData.storeName.toLowerCase().replace(/\s+/g, '-')}.affiliateos.com
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                          className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Account Setup */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                          placeholder="Minimum 8 characters"
                          required
                          minLength={8}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p className="text-sm"><strong>Store:</strong> {formData.storeName}</p>
                      <p className="text-sm"><strong>Name:</strong> {formData.fullName}</p>
                      <p className="text-sm"><strong>Email:</strong> {formData.email}</p>
                    </div>

                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={formData.agreeToTerms}
                        onChange={(e) => setFormData({...formData, agreeToTerms: e.target.checked})}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        required
                      />
                      <span className="ml-2 text-sm text-gray-600">
                        I agree to the{' '}
                        <Link href="/terms" className="text-blue-600 hover:text-blue-700">Terms of Service</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</Link>
                      </span>
                    </label>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="mt-8 flex justify-between">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep(step - 1)}
                      className="px-6 py-3 text-gray-600 hover:text-gray-900"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`${step === 1 ? 'w-full' : ''} bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center`}
                  >
                    {step === 3 ? 'Start My Trial' : 'Continue'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Right Side - Benefits */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-6">Why Choose AffiliateOS?</h2>
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6">
                <h3 className="font-bold mb-4">What happens next?</h3>
                <ol className="space-y-3 text-sm text-gray-600">
                  <li>1. Complete your account setup</li>
                  <li>2. Choose your store theme</li>
                  <li>3. Add your first products</li>
                  <li>4. Launch your store!</li>
                </ol>
              </div>

              <div className="bg-blue-50 rounded-xl p-6">
                <p className="text-sm text-gray-700">
                  <strong>Need help?</strong> Our support team is available 24/7 to help you get started.
                  Call us at 1-800-STORE or email support@affiliateos.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}