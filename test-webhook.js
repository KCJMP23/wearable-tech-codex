#!/usr/bin/env node

const payload = {
  tenant_slug: 'nectarheat',
  id: 1234,
  date: '2025-01-18T12:00:00',
  date_gmt: '2025-01-18T12:00:00',
  modified: '2025-01-18T12:00:00',
  modified_gmt: '2025-01-18T12:00:00',
  slug: 'best-fitness-trackers-2025',
  status: 'publish',
  type: 'post',
  link: 'https://example.com/best-fitness-trackers-2025/',
  title: {
    rendered: 'Best Fitness Trackers 2025: Top Wearables for Health Monitoring'
  },
  content: {
    rendered: `<p>Looking for the best fitness tracker in 2025? We've tested and reviewed the top wearable devices.</p>
      <img src="https://images.unsplash.com/photo-1576243345690-4e4b79b63288" alt="Fitness Tracker"/>
      <p>The Apple Watch Ultra 2 leads our list with comprehensive health features.</p>
      <img src="https://images.unsplash.com/photo-1579586337278-3befd40fd17a" alt="Apple Watch"/>
      <h2>Best Overall: Apple Watch Ultra 2</h2>
      <p>With advanced health monitoring including ECG, blood oxygen, and temperature sensing.</p>
      <img src="https://images.unsplash.com/photo-1639037687665-a5130d0c5fd3" alt="Apple Watch Ultra"/>
      <h2>Best Value: Garmin Venu 3</h2>
      <p>Offering 14-day battery life and comprehensive fitness tracking.</p>
      <img src="https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1" alt="Garmin Venu"/>
      <h2>Best for Sleep: Oura Ring</h2>
      <p>The most comfortable sleep tracking device with detailed insights.</p>
      <img src="https://images.unsplash.com/photo-1605100804763-247f67b3557e" alt="Oura Ring"/>
      <p>Each of these devices offers unique features for different needs and budgets.</p>
      <img src="https://images.unsplash.com/photo-1598618588648-ba3b70a9e51e" alt="Fitness Tracking"/>
      <p>Make sure to consider your specific health goals when choosing.</p>`,
    protected: false
  },
  excerpt: {
    rendered: '<p>Discover the best fitness trackers and smartwatches of 2025.</p>',
    protected: false
  },
  author: 1,
  featured_media: 5678,
  categories: [15, 23],
  tags: [45, 67, 89, 101]
};

fetch('http://localhost:3001/api/webhooks/make/blog', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'test-api-key-123'
  },
  body: JSON.stringify(payload)
})
.then(res => res.text())
.then(body => {
  console.log('Response:', body);
})
.catch(err => {
  console.error('Error:', err);
});