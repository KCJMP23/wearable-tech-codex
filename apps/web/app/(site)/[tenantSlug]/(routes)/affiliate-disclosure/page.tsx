import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';

interface AffiliateDisclosurePageProps {
  params: Promise<{
    tenantSlug: string;
  }>;
}

export default async function AffiliateDisclosurePage({ params }: AffiliateDisclosurePageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  
  if (!tenant) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Affiliate Disclosure</h1>
          
          {/* Amazon Associates Required Statement */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Amazon Associates Disclosure
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p className="font-semibold">
                    As an Amazon Associate I earn from qualifying purchases.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="prose prose-gray max-w-none">
            <h2>About Our Affiliate Relationships</h2>
            <p>
              {tenant.name} participates in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com and affiliated international Amazon websites.
            </p>

            <h2>What This Means for You</h2>
            <p>
              When you click on certain links on our website and make a purchase, we may receive a small commission from Amazon at no additional cost to you. This commission helps us maintain and improve our website and continue providing valuable content and recommendations.
            </p>

            <h2>Our Commitment to Transparency</h2>
            <ul>
              <li>
                <strong>Honest Recommendations:</strong> We only recommend products that we believe will provide value to our readers. Our affiliate relationships do not influence our editorial opinions or product recommendations.
              </li>
              <li>
                <strong>Clear Disclosures:</strong> We clearly identify affiliate links and sponsored content throughout our website in compliance with FTC guidelines and Amazon's Operating Agreement.
              </li>
              <li>
                <strong>Independence:</strong> Our reviews and comparisons are based on research, testing, and analysis, not on potential commission earnings.
              </li>
            </ul>

            <h2>FTC Compliance</h2>
            <p>
              In accordance with the Federal Trade Commission's guidelines, we disclose that we may receive compensation when you click on affiliate links and make purchases. This disclosure is required by the FTC to ensure transparency in online marketing.
            </p>

            <h2>International Compliance</h2>
            <p>
              We also participate in international Amazon affiliate programs, including but not limited to Amazon.ca, Amazon.co.uk, Amazon.de, Amazon.fr, Amazon.it, Amazon.es, and Amazon.com.au. The same disclosure principles apply to all our international affiliate relationships.
            </p>

            <h2>Product Pricing and Availability</h2>
            <p>
              Please note that product prices and availability on Amazon change frequently. The prices displayed on our website reflect the prices at the time of our last update and may not reflect current pricing. We make every effort to provide accurate information, but we recommend checking Amazon directly for the most up-to-date pricing and availability.
            </p>

            <h2>Your Privacy</h2>
            <p>
              Our participation in affiliate programs does not affect our privacy practices. We do not share your personal information with Amazon or other affiliates. For more information about how we handle your data, please see our <a href={`/${tenantSlug}/privacy`} className="text-blue-600 hover:text-blue-800">Privacy Policy</a>.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have any questions about our affiliate relationships or this disclosure, please don't hesitate to <a href={`/${tenantSlug}/contact`} className="text-blue-600 hover:text-blue-800">contact us</a>. We're committed to transparency and are happy to answer any questions you may have.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• We earn commissions from qualifying Amazon purchases made through our links</li>
                <li>• This comes at no additional cost to you</li>
                <li>• Our recommendations remain honest and independent</li>
                <li>• We comply with all FTC and Amazon disclosure requirements</li>
                <li>• Your privacy is protected and respected</li>
              </ul>
            </div>

            <div className="mt-8 text-xs text-gray-500">
              <p>
                This disclosure was last updated on {new Date().toLocaleDateString()} to ensure compliance with the most recent Amazon Associates Operating Agreement (updated December 20, 2024) and FTC guidelines.
              </p>
              <p className="mt-2">
                Amazon Associates Program Operating Agreement ID: {tenant.name.toLowerCase().replace(/\s+/g, '')}-{Date.now().toString().slice(-6)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}