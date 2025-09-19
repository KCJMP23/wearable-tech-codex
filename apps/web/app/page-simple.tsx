export default function SimplePage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">
          AffiliateOS Platform
        </h1>
        <p className="text-xl text-neutral-600 mb-8">
          The Shopify for Affiliate Websites
        </p>
        <a
          href="/onboarding"
          className="px-8 py-4 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          Start free trial
        </a>
      </div>
    </div>
  );
}