import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const wearableQuiz = {
  id: '01234567-89ab-cdef-0123-456789abcde2',
  tenant_id: '01234567-89ab-cdef-0123-456789abcdef', // Wearable Tech Codex tenant
  title: 'Find Your Perfect Wearable Device',
  description: 'Answer a few questions to get personalized recommendations',
  active: true,
  schema: [
    {
      id: 'primary_use',
      question: 'What will you primarily use your wearable for?',
      type: 'single',
      choices: [
        { id: 'fitness', label: 'Fitness & Health Tracking', value: 'fitness' },
        { id: 'smartwatch', label: 'Smart Features & Notifications', value: 'smartwatch' },
        { id: 'sports', label: 'Specific Sports Training', value: 'sports' },
        { id: 'style', label: 'Fashion & Style', value: 'style' }
      ]
    },
    {
      id: 'budget',
      question: 'What\'s your budget range?',
      type: 'single',
      choices: [
        { id: 'budget_low', label: 'Under $100', value: 'under_100' },
        { id: 'budget_mid', label: '$100 - $300', value: '100_300' },
        { id: 'budget_high', label: '$300 - $500', value: '300_500' },
        { id: 'budget_premium', label: '$500+', value: 'over_500' }
      ]
    },
    {
      id: 'features',
      question: 'Which features are most important to you?',
      type: 'multi',
      choices: [
        { id: 'gps', label: 'Built-in GPS', value: 'gps' },
        { id: 'heart_rate', label: 'Heart Rate Monitoring', value: 'heart_rate' },
        { id: 'sleep', label: 'Sleep Tracking', value: 'sleep' },
        { id: 'battery', label: 'Long Battery Life', value: 'battery' },
        { id: 'waterproof', label: 'Water Resistance', value: 'waterproof' },
        { id: 'music', label: 'Music Storage/Control', value: 'music' }
      ]
    },
    {
      id: 'platform',
      question: 'What smartphone do you use?',
      type: 'single',
      choices: [
        { id: 'ios', label: 'iPhone', value: 'ios' },
        { id: 'android', label: 'Android', value: 'android' },
        { id: 'both', label: 'I use both', value: 'both' }
      ]
    }
  ]
};

async function seedQuiz() {
  console.log('Seeding quiz...');
  
  try {
    const { error } = await supabase
      .from('quiz')
      .upsert(wearableQuiz);
    
    if (error) {
      console.error('Quiz seeding error:', error);
      return;
    }
    
    console.log('✅ Quiz seeded successfully!');
    console.log('Quiz ID:', wearableQuiz.id);
    console.log('Test URL: http://localhost:3001/wearable-tech-codex/quiz');
    
  } catch (error) {
    console.error('❌ Quiz seeding failed:', error);
  }
}

seedQuiz();