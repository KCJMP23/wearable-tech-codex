'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Using standard HTML elements instead of missing UI components
import { InstantSitePreview } from '@/components/InstantSitePreview';
import { ArrowRight, Upload, Link, Database, Wand2, CheckCircle } from 'lucide-react';

type OnboardingStep = 'niche' | 'import' | 'customize' | 'complete';
type ImportMethod = 'csv' | 'url' | 'api' | 'manual' | 'ai-generate';

export default function FlexibleOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('niche');
  const [niche, setNiche] = useState('');
  const [nicheAnalysis, setNicheAnalysis] = useState<any>(null);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [importMethod, setImportMethod] = useState<ImportMethod | null>(null);
  const [siteName, setSiteName] = useState('');
  const [aiContent, setAiContent] = useState(true);

  const handleNicheAnalysis = (analysis: any) => {
    setNicheAnalysis(analysis);
    if (!siteName) {
      setSiteName(`${niche.charAt(0).toUpperCase() + niche.slice(1)} Hub`);
    }
  };

  const handleNextStep = () => {
    if (step === 'niche' && nicheAnalysis) {
      setStep('import');
    } else if (step === 'import' && importMethod) {
      setStep('customize');
    } else if (step === 'customize') {
      handleCreateSite();
    }
  };

  const handleCreateSite = async () => {
    try {
      // Create the site with the gathered information
      const siteData = {
        name: siteName,
        niche: niche,
        nicheAnalysis: nicheAnalysis,
        affiliateNetworks: selectedNetworks.length > 0 ? selectedNetworks : nicheAnalysis?.affiliate_networks || [],
        importMethod: importMethod,
        aiContentEnabled: aiContent,
        categories: nicheAnalysis?.categories || [],
        keywords: nicheAnalysis?.keywords || [],
      };

      // TODO: Call API to create the site
      console.log('Creating site with data:', siteData);
      
      setStep('complete');
    } catch (error) {
      console.error('Error creating site:', error);
    }
  };

  const importMethods = [
    {
      id: 'csv' as ImportMethod,
      title: 'CSV Upload',
      description: 'Upload a CSV file with your products',
      icon: Upload,
    },
    {
      id: 'url' as ImportMethod,
      title: 'URL Scraper',
      description: 'Import products from any website',
      icon: Link,
    },
    {
      id: 'api' as ImportMethod,
      title: 'Affiliate API',
      description: 'Connect directly to affiliate networks',
      icon: Database,
    },
    {
      id: 'manual' as ImportMethod,
      title: 'Manual Entry',
      description: 'Add products one by one',
      icon: Upload,
    },
    {
      id: 'ai-generate' as ImportMethod,
      title: 'AI Generate',
      description: 'Let AI find and add products for you',
      icon: Wand2,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Create Your Affiliate Site</h1>
            <div className="flex items-center space-x-4">
              {['niche', 'import', 'customize', 'complete'].map((s, idx) => (
                <div
                  key={s}
                  className={`flex items-center ${
                    idx < ['niche', 'import', 'customize', 'complete'].indexOf(step)
                      ? 'text-green-600'
                      : idx === ['niche', 'import', 'customize', 'complete'].indexOf(step)
                      ? 'text-purple-600'
                      : 'text-gray-400'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      idx < ['niche', 'import', 'customize', 'complete'].indexOf(step)
                        ? 'bg-green-600 border-green-600 text-white'
                        : idx === ['niche', 'import', 'customize', 'complete'].indexOf(step)
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {idx < ['niche', 'import', 'customize', 'complete'].indexOf(step) ? '✓' : idx + 1}
                  </div>
                  {idx < 3 && (
                    <div
                      className={`w-24 h-1 ${
                        idx < ['niche', 'import', 'customize', 'complete'].indexOf(step)
                          ? 'bg-green-600'
                          : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div>
            {step === 'niche' && (
              <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-md">
                <h2 className="text-2xl font-semibold mb-4">What would you like to build?</h2>
                <p className="text-gray-600 mb-6">
                  Tell us about your niche and we'll help you create the perfect affiliate site
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Niche</label>
                    <input
                      type="text"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="e.g., Pet supplies, Home decor, Golf equipment, Kitchen gadgets..."
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Site Name (Optional)</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder="We'll suggest one based on your niche"
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {nicheAnalysis && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Affiliate Networks (Select all that apply)
                      </label>
                      <div className="space-y-2">
                        {nicheAnalysis.affiliate_networks.map((network: string) => (
                          <label key={network} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedNetworks.includes(network)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedNetworks([...selectedNetworks, network]);
                                } else {
                                  setSelectedNetworks(selectedNetworks.filter(n => n !== network));
                                }
                              }}
                              className="mr-2"
                            />
                            <span>{network}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleNextStep}
                    disabled={!nicheAnalysis}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Product Import
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 'import' && (
              <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-md">
                <h2 className="text-2xl font-semibold mb-4">How would you like to add products?</h2>
                <p className="text-gray-600 mb-6">
                  Choose how you want to populate your {niche} site with products
                </p>

                <div className="space-y-3">
                  {importMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setImportMethod(method.id)}
                        className={`w-full p-4 border rounded-lg text-left transition-all ${
                          importMethod === method.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-start">
                          <Icon className="w-5 h-5 mt-1 mr-3 text-purple-600" />
                          <div>
                            <h3 className="font-medium">{method.title}</h3>
                            <p className="text-sm text-gray-600">{method.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleNextStep}
                  disabled={!importMethod}
                  className="w-full mt-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Customization
                  <ArrowRight className="ml-2 w-4 h-4" />
                </button>
              </div>
            )}

            {step === 'customize' && (
              <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-md">
                <h2 className="text-2xl font-semibold mb-4">Content Preferences</h2>
                <p className="text-gray-600 mb-6">
                  How would you like to generate content for your site?
                </p>

                <div className="space-y-4">
                  <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={aiContent}
                      onChange={(e) => setAiContent(e.target.checked)}
                      className="mr-3"
                    />
                    <div>
                      <h3 className="font-medium">AI-Generated Content</h3>
                      <p className="text-sm text-gray-600">
                        Automatically create product reviews, comparisons, and blog posts
                      </p>
                    </div>
                  </label>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Your site will include:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• {nicheAnalysis?.categories?.length || 0} product categories</li>
                      <li>• {nicheAnalysis?.content_ideas?.length || 0} blog post ideas</li>
                      <li>• SEO-optimized for {nicheAnalysis?.keywords?.length || 0} keywords</li>
                      <li>• Integration with {selectedNetworks.length || nicheAnalysis?.affiliate_networks?.length || 0} affiliate networks</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleNextStep}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Create My Site
                    <Wand2 className="ml-2 w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 'complete' && (
              <Card className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-4">Your Site is Ready!</h2>
                <p className="text-gray-600 mb-6">
                  {siteName} has been created and is ready for you to customize
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/admin/dashboard')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => router.push(`/${niche.toLowerCase().replace(/\s+/g, '-')}`)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    View Live Site
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div>
            {step === 'niche' && (
              <InstantSitePreview
                niche={niche}
                onAnalysisComplete={handleNicheAnalysis}
              />
            )}

            {step !== 'niche' && nicheAnalysis && (
              <div className="p-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg border border-gray-200 shadow-md">
                <h3 className="text-xl font-semibold mb-4">Your {niche} Site Summary</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Site Name</p>
                    <p className="font-medium">{siteName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Profit Potential</p>
                    <p className="font-medium">{nicheAnalysis.profit_score}/10</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expected Revenue</p>
                    <p className="font-medium">{nicheAnalysis.estimated_monthly_revenue}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Competition Level</p>
                    <p className="font-medium capitalize">{nicheAnalysis.competition_level}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Product Categories</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {nicheAnalysis.categories.slice(0, 4).map((cat: string, idx: number) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-white rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}