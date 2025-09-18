'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Store, 
  Palette, 
  Package, 
  FileText, 
  Rocket,
  CheckCircle,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  fields: {
    name: string;
    label: string;
    type: string;
    placeholder?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
  }[];
}

const steps: OnboardingStep[] = [
  {
    id: 'brand',
    title: 'Brand Setup',
    description: 'Let\'s start with your brand identity',
    icon: Sparkles,
    fields: [
      {
        name: 'brandName',
        label: 'Brand Name',
        type: 'text',
        placeholder: 'e.g., TechWear Pro',
        required: true
      },
      {
        name: 'domain',
        label: 'Domain/Subdomain',
        type: 'text',
        placeholder: 'e.g., techwear-pro',
        required: true
      },
      {
        name: 'tagline',
        label: 'Tagline',
        type: 'text',
        placeholder: 'Your trusted source for wearable tech',
        required: true
      }
    ]
  },
  {
    id: 'niche',
    title: 'Niche Selection',
    description: 'Choose your wearable tech focus areas',
    icon: Store,
    fields: [
      {
        name: 'primaryNiche',
        label: 'Primary Focus',
        type: 'select',
        required: true,
        options: [
          { value: 'smartwatches', label: 'Smartwatches' },
          { value: 'fitness', label: 'Fitness Trackers' },
          { value: 'health', label: 'Health Monitors' },
          { value: 'ar-vr', label: 'AR/VR Headsets' },
          { value: 'smart-clothing', label: 'Smart Clothing' },
          { value: 'all', label: 'All Wearables' }
        ]
      },
      {
        name: 'targetAudience',
        label: 'Target Audience',
        type: 'select',
        required: true,
        options: [
          { value: 'athletes', label: 'Athletes & Fitness Enthusiasts' },
          { value: 'health', label: 'Health-Conscious Consumers' },
          { value: 'tech', label: 'Tech Enthusiasts' },
          { value: 'business', label: 'Business Professionals' },
          { value: 'general', label: 'General Consumers' }
        ]
      },
      {
        name: 'priceRange',
        label: 'Price Range Focus',
        type: 'select',
        options: [
          { value: 'budget', label: 'Budget (< $100)' },
          { value: 'mid', label: 'Mid-Range ($100-$500)' },
          { value: 'premium', label: 'Premium ($500+)' },
          { value: 'all', label: 'All Price Ranges' }
        ]
      }
    ]
  },
  {
    id: 'theme',
    title: 'Visual Theme',
    description: 'Choose your site\'s look and feel',
    icon: Palette,
    fields: [
      {
        name: 'theme',
        label: 'Color Theme',
        type: 'select',
        required: true,
        options: [
          { value: 'modern', label: 'Modern & Minimal' },
          { value: 'tech', label: 'Tech & Futuristic' },
          { value: 'vibrant', label: 'Vibrant & Energetic' },
          { value: 'professional', label: 'Professional & Clean' },
          { value: 'dark', label: 'Dark Mode' }
        ]
      },
      {
        name: 'primaryColor',
        label: 'Primary Color',
        type: 'select',
        options: [
          { value: 'blue', label: 'Blue' },
          { value: 'green', label: 'Green' },
          { value: 'purple', label: 'Purple' },
          { value: 'orange', label: 'Orange' },
          { value: 'red', label: 'Red' }
        ]
      }
    ]
  },
  {
    id: 'content',
    title: 'Content Strategy',
    description: 'Define your content approach',
    icon: FileText,
    fields: [
      {
        name: 'contentTypes',
        label: 'Content Focus',
        type: 'select',
        required: true,
        options: [
          { value: 'reviews', label: 'Product Reviews' },
          { value: 'comparisons', label: 'Comparisons & Guides' },
          { value: 'news', label: 'Industry News' },
          { value: 'tutorials', label: 'How-To & Tutorials' },
          { value: 'mixed', label: 'Mixed Content' }
        ]
      },
      {
        name: 'publishingFrequency',
        label: 'Publishing Frequency',
        type: 'select',
        options: [
          { value: 'daily', label: 'Daily' },
          { value: '3-week', label: '3 Times per Week' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'biweekly', label: 'Bi-Weekly' }
        ]
      }
    ]
  },
  {
    id: 'products',
    title: 'Initial Products',
    description: 'Import your first products',
    icon: Package,
    fields: [
      {
        name: 'productImportMethod',
        label: 'Import Method',
        type: 'select',
        required: true,
        options: [
          { value: 'auto', label: 'Auto-select Top Products' },
          { value: 'asins', label: 'Enter Amazon ASINs' },
          { value: 'category', label: 'Import by Category' },
          { value: 'skip', label: 'Skip for Now' }
        ]
      },
      {
        name: 'initialProductCount',
        label: 'Number of Products',
        type: 'select',
        options: [
          { value: '10', label: '10 Products' },
          { value: '25', label: '25 Products' },
          { value: '50', label: '50 Products' },
          { value: '100', label: '100 Products' }
        ]
      }
    ]
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.success) {
        // Redirect to admin dashboard
        router.push(`/admin/${result.tenant.slug}`);
      } else {
        alert('Failed to complete onboarding. Please try again.');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center text-white mr-4">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{step.title}</h2>
              <p className="text-gray-600">{step.description}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 mb-8">
            {step.fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required={field.required}
                  >
                    <option value="">Select an option</option>
                    {field.options?.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`flex items-center px-6 py-2 rounded-lg font-medium transition-colors ${
                currentStep === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-600 transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="flex items-center px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-600 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>Creating Your Site...</>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Launch Site
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center mt-8 space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep
                  ? 'bg-gradient-to-r from-green-500 to-blue-500 w-8'
                  : index < currentStep
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}