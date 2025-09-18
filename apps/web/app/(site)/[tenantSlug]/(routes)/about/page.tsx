import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { getKbEntry } from '@/lib/content';
import { WoodstockNavigation } from '@/components/WoodstockNavigation';
import { WoodstockFooter } from '@/components/WoodstockFooter';
import { 
  ShieldCheckIcon, 
  TruckIcon, 
  ClockIcon, 
  StarIcon,
  UserGroupIcon,
  GlobeAltIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

interface AboutPageProps {
  params: { tenantSlug: string };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();
  const about = await getKbEntry(tenant.id, 'doc', 'About');

  const stats = [
    { label: 'Products Reviewed', value: '500+' },
    { label: 'Happy Customers', value: '10K+' },
    { label: 'Years Experience', value: '5+' },
    { label: 'Expert Reviews', value: '1K+' },
  ];

  const values = [
    {
      icon: ShieldCheckIcon,
      title: 'Trusted Reviews',
      description: 'Every product is thoroughly tested and reviewed by our expert team before recommendation.'
    },
    {
      icon: HeartIcon,
      title: 'Customer First',
      description: 'We prioritize our customers\' needs and provide honest, unbiased recommendations.'
    },
    {
      icon: GlobeAltIcon,
      title: 'Global Reach',
      description: 'Serving customers worldwide with the latest in wearable technology innovations.'
    },
    {
      icon: UserGroupIcon,
      title: 'Expert Team',
      description: 'Our team consists of tech enthusiasts and health experts passionate about wearables.'
    }
  ];

  const team = [
    {
      name: 'Sarah Johnson',
      role: 'Founder & CEO',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b1c0?w=400&h=400&fit=crop&crop=face',
      bio: 'Former Apple engineer with 10+ years in wearable tech development.'
    },
    {
      name: 'Mike Chen',
      role: 'Chief Technology Officer',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
      bio: 'Expert in health monitoring devices and fitness tracking technology.'
    },
    {
      name: 'Dr. Emily Rodriguez',
      role: 'Health & Wellness Expert',
      image: 'https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=400&h=400&fit=crop&crop=face',
      bio: 'Medical doctor specializing in preventive care and digital health solutions.'
    },
    {
      name: 'Alex Thompson',
      role: 'Product Testing Lead',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
      bio: 'Professional athlete and tech reviewer with expertise in fitness wearables.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <WoodstockNavigation tenantSlug={tenantSlug} tenantName={tenant.name} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-8 pt-8">
          <span>Home</span> <span className="mx-2">›</span> <span className="text-gray-900">About</span>
        </nav>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            About {tenant.name}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {about?.content ?? `We're passionate about helping you discover the best wearable technology to enhance your health, fitness, and lifestyle. Our expert team rigorously tests and reviews every product we recommend.`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Mission Statement */}
        <div className="bg-gray-50 rounded-2xl p-8 md:p-12 mb-20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              We believe that wearable technology should empower everyone to live healthier, more connected lives. 
              Our mission is to cut through the marketing noise and provide honest, comprehensive reviews that help 
              you make informed decisions about the tech you wear every day.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">What We Stand For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <value.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="text-center">
                <img 
                  src={member.image} 
                  alt={member.name}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Features */}
        <div className="bg-blue-50 rounded-2xl p-8 md:p-12 mb-20">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Trust Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Rigorous Testing</h3>
                <p className="text-gray-600">Every product undergoes weeks of real-world testing before we make our recommendation.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <StarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unbiased Reviews</h3>
                <p className="text-gray-600">We're not influenced by manufacturers - our loyalty is to you, our readers.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Always Updated</h3>
                <p className="text-gray-600">Our reviews are continuously updated as new firmware and features are released.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="text-center mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Have Questions?</h2>
          <p className="text-gray-600 mb-8">We'd love to hear from you. Reach out to our team for personalized recommendations.</p>
          <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Contact Us
          </button>
        </div>
      </div>

      {/* Footer */}
      <WoodstockFooter tenantSlug={tenantSlug} tenantName={tenant.name} />
    </div>
  );
}
