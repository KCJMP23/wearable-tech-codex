import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    // Test connection
    const { data, error } = await supabase
      .from('tenants')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('Database error:', error);
      return;
    }
    
    console.log('✅ Database connection successful');
    console.log('Test result:', data);
    
    // Test tenant creation/retrieval
    let { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', 'wearable-tech-codex')
      .single();

    if (!tenant) {
      console.log('Creating default tenant...');
      const { data: newTenant, error } = await supabase
        .from('tenants')
        .insert({
          name: 'Wearable Tech Codex',
          slug: 'wearable-tech-codex',
          domain: 'wearabletechcodex.com',
          config: { theme: 'woodstock' },
          active: true
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating tenant:', error);
        return;
      }
      tenant = newTenant;
      console.log('✅ Tenant created:', tenant.name);
    } else {
      console.log('✅ Tenant found:', tenant.name);
    }
    
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();