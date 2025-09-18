#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { generateOnboardingPlan, applyOnboardingPlan } from './onboardingPlan.mjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables.');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const [,, command, ...args] = process.argv;

// Available agents from the worker registry
const AVAILABLE_AGENTS = [
  'OrchestratorAgent',
  'ProductAgent', 
  'EditorialAgent',
  'ReviewAgent',
  'ImageAgent',
  'SocialAgent',
  'NewsletterAgent',
  'PersonalizationAgent',
  'SeasonalAgent',
  'TrendsAgent',
  'ChatbotAgent',
  'AdManagerAgent',
  'LinkVerifierAgent'
];

// Progress indicator utilities
function showProgress(message, dots = false) {
  if (dots) {
    process.stdout.write(`${message}`);
    const interval = setInterval(() => process.stdout.write('.'), 500);
    return () => {
      clearInterval(interval);
      console.log(' ✅');
    };
  }
  console.log(`🔄 ${message}`);
}

function showSuccess(message) {
  console.log(`✅ ${message}`);
}

function showError(message) {
  console.error(`❌ ${message}`);
}

function showWarning(message) {
  console.warn(`⚠️  ${message}`);
}

async function initTenant() {
  const options = parseArgs(args);
  
  // Interactive mode if no options provided
  if (!options.name && !options.interactive) {
    showError('Missing required --name parameter');
    console.log('Usage: site init-tenant --name="My Tenant" [--domain=example.com] [--theme=preset]');
    console.log('   or: site init-tenant --interactive');
    process.exit(1);
  }

  let tenantData = {
    name: options.name,
    domain: options.domain,
    theme: options.theme
  };

  // Interactive mode
  if (options.interactive || !options.name) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    console.log('🚀 Interactive Tenant Creation');
    console.log('Press Enter to accept defaults shown in [brackets]\n');
    
    tenantData.name = await ask(rl, 'Tenant name', tenantData.name || 'My Wearable Tech Site');
    tenantData.domain = await ask(rl, 'Custom domain (optional)', tenantData.domain || '');
    tenantData.theme = await ask(rl, 'Theme preset (woodstock/modern/minimal)', tenantData.theme || 'woodstock');
    
    await rl.close();
  }

  const slug = tenantData.domain?.split('.')[0] || tenantData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  showProgress('Creating tenant...');
  
  // Check if tenant already exists
  const { data: existing } = await supabase
    .from('tenants')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();
    
  if (existing) {
    showError(`Tenant with slug '${slug}' already exists`);
    process.exit(1);
  }

  const { data, error } = await supabase.from('tenants').insert({
    name: tenantData.name,
    slug,
    domain: tenantData.domain || null,
    theme: { 
      tagline: 'Freshly onboarded niche', 
      description: tenantData.name,
      preset: tenantData.theme || 'woodstock'
    },
    color_tokens: tenantData.theme ? { preset: tenantData.theme } : {},
    status: 'draft'
  }).select('slug, name, domain').maybeSingle();
  
  if (error) {
    showError(`Failed to create tenant: ${error.message}`);
    process.exit(1);
  }
  
  showSuccess(`Created tenant '${data.slug}'`);
  console.log(`   Name: ${data.name}`);
  if (data.domain) console.log(`   Domain: ${data.domain}`);
  console.log(`   Next: Run 'pnpm exec site onboard --tenant=${data.slug}' to complete setup`);
}

async function onboardTenant() {
  const options = parseArgs(args);
  const slug = options.tenant;
  
  if (!slug) {
    showError('Missing --tenant parameter');
    console.log('Usage: site onboard --tenant=my-tenant');
    process.exit(1);
  }

  showProgress('Looking up tenant...');
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name, slug, domain')
    .eq('slug', slug)
    .maybeSingle();
    
  if (error) {
    showError(`Database error: ${error.message}`);
    process.exit(1);
  }
  
  if (!tenant) {
    showError(`Tenant '${slug}' not found`);
    console.log('Available tenants:');
    const { data: tenants } = await supabase.from('tenants').select('slug, name').limit(10);
    tenants?.forEach(t => console.log(`  - ${t.slug} (${t.name})`));
    process.exit(1);
  }

  console.log(`\n🎯 Onboarding Wizard for '${tenant.name}'`);
  console.log('This will generate a complete content strategy, products, and agent schedule.');
  console.log('Press Enter to accept defaults shown in [brackets]\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

  // Check for existing API keys
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAmazon = !!process.env.AMAZON_PA_API_PARTNER_TAG;
  
  if (!hasOpenAI) {
    showWarning('OPENAI_API_KEY not found in environment');
    console.log('You will need this for content generation.');
  }
  
  if (!hasAmazon) {
    showWarning('AMAZON_PA_API_PARTNER_TAG not found in environment');
    console.log('You will need this for affiliate links.');
  }

  // Brand and positioning questions
  console.log('\n📋 BRAND & POSITIONING');
  const persona = await ask(rl, 'Target persona (e.g., "recovery-focused athletes")', 'recovery-focused athletes');
  const tone = await ask(rl, 'Brand tone/voice', 'warm and evidence-led');
  const region = await ask(rl, 'Primary region', 'US');
  const heroGoal = await ask(rl, 'Core outcome readers want', 'Accelerate recovery with wearable heat tech');
  const differentiator = await ask(rl, 'Brand differentiator', 'Agent-curated therapy routines with verified data');
  
  // Keywords and competition
  console.log('\n🔍 SEO & COMPETITION');
  const keywords = await askList(rl, 'Core keywords (comma separated, min 5)', 5);
  const competitors = await askList(rl, 'Competitor URLs (comma separated, 2-5)', 2);
  
  // Product seeding
  console.log('\n🛍️  PRODUCT CATALOG');
  const asinSeeds = await askList(rl, 'Seed ASINs (comma separated, min 5)', 5);
  
  // Content and marketing cadence
  console.log('\n📅 CONTENT STRATEGY');
  const weeklyPosts = parseNumber(await ask(rl, 'Weekly post target', '3'), 3);
  const monthlyClicks = parseNumber(await ask(rl, 'Monthly click goal', '1500'), 1500);
  const ctrTarget = parseNumber(await ask(rl, 'Click-through rate target (%)', '5'), 5);
  const socialCadence = await ask(rl, 'Social cadence', '3 posts/week');
  const newsletterFrequency = await ask(rl, 'Newsletter frequency', 'weekly');
  
  // Compliance
  console.log('\n⚖️  COMPLIANCE');
  const complianceNotes = await ask(rl, 'Compliance notes or disclaimers', 'Highlight heat-therapy safety and consult disclaimers');
  
  await rl.close();

  const onboardingInput = {
    tenant: { name: tenant.name, slug: tenant.slug, domain: tenant.domain },
    persona,
    tone,
    region,
    heroGoal,
    differentiator,
    keywords,
    competitorUrls: competitors,
    asinSeeds,
    cadence: {
      weeklyPosts,
      monthlyClicks,
      ctrTarget,
      newsletterFrequency,
      socialCadence
    },
    complianceNotes
  };

  console.log('\n📋 ONBOARDING SUMMARY:');
  console.log(`   Persona: ${persona}`);
  console.log(`   Keywords: ${keywords.slice(0, 3).join(', ')}${keywords.length > 3 ? '...' : ''}`);
  console.log(`   Products: ${asinSeeds.length} seed ASINs`);
  console.log(`   Content: ${weeklyPosts} posts/week`);
  console.log('');

  const stopProgress1 = showProgress('Generating onboarding plan with OpenAI', true);
  
  try {
    const plan = await generateOnboardingPlan(onboardingInput);
    stopProgress1();
    
    const stopProgress2 = showProgress('Applying onboarding plan to database', true);
    const summary = await applyOnboardingPlan({
      plan,
      supabase,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantDomain: tenant.domain,
      complianceNotes
    });
    stopProgress2();

    showSuccess('Onboarding completed successfully!');
    console.log('');
    console.log('📊 RESULTS:');
    console.log(`   ✅ Products inserted: ${summary.products}`);
    console.log(`   ✅ Posts drafted: ${summary.posts}`);
    console.log(`   ✅ Calendar items scheduled: ${summary.calendar}`);
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log(`   • Visit your admin dashboard to review content`);
    console.log(`   • Run 'pnpm exec site run-agent --tenant=${slug} --agent=OrchestratorAgent' to start automation`);
    console.log(`   • Set up your domain and deployment`);
  } catch (error) {
    if (typeof stopProgress1 === 'function') stopProgress1();
    showError(`Onboarding failed: ${error.message}`);
    if (error.message.includes('OPENAI_API_KEY')) {
      console.log('Please set your OpenAI API key in the .env file.');
    }
    process.exit(1);
  }
}

async function seedPosts() {
  const options = parseArgs(args);
  const slug = options.tenant;
  const count = Number(options.posts || options.count || 5);
  const type = options.type || 'evergreen';
  
  if (!slug) {
    showError('Missing --tenant parameter');
    console.log('Usage: site seed --tenant=my-tenant [--posts=5] [--type=evergreen]');
    process.exit(1);
  }

  if (count < 1 || count > 50) {
    showError('Post count must be between 1 and 50');
    process.exit(1);
  }

  const validTypes = ['evergreen', 'howto', 'listicle', 'review', 'roundup', 'answer', 'alternative'];
  if (!validTypes.includes(type)) {
    showError(`Invalid post type. Valid types: ${validTypes.join(', ')}`);
    process.exit(1);
  }

  showProgress('Looking up tenant...');
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle();
    
  if (error) {
    showError(`Database error: ${error.message}`);
    process.exit(1);
  }
  
  if (!tenant) {
    showError(`Tenant '${slug}' not found`);
    process.exit(1);
  }

  showProgress(`Creating ${count} seed posts...`);
  
  const posts = [];
  for (let index = 0; index < count; index++) {
    const postNumber = index + 1;
    const slug = `seed-post-${type}-${postNumber}`;
    
    posts.push({
      tenant_id: tenant.id,
      type,
      title: `${type === 'evergreen' ? 'Seed' : type.charAt(0).toUpperCase() + type.slice(1)} Post ${postNumber}`,
      slug,
      excerpt: `Generated by CLI seed command. This is a ${type} post ready for content.`,
      body_mdx: `# ${type.charAt(0).toUpperCase() + type.slice(1)} Post ${postNumber}\n\nThis is a seed post generated by the CLI. Replace this content with your actual post content.\n\n## Key Points\n\n- Point 1\n- Point 2\n- Point 3\n\n## Conclusion\n\nContent coming soon.`,
      status: 'draft',
      seo: {
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Post ${postNumber} | ${tenant.name}`,
        description: `Learn about wearable technology in this comprehensive ${type} post.`
      },
      images: [
        {
          url: `https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800`,
          alt: 'Wearable technology device',
          attribution: 'Unsplash'
        }
      ]
    });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('posts')
    .insert(posts)
    .select('slug, title');
    
  if (insertError) {
    showError(`Failed to create posts: ${insertError.message}`);
    process.exit(1);
  }

  showSuccess(`Created ${count} seed posts for '${tenant.name}'`);
  console.log('');
  console.log('📝 CREATED POSTS:');
  inserted?.forEach((post, index) => {
    console.log(`   ${index + 1}. ${post.title} (/${post.slug})`);
  });
  console.log('');
  console.log('💡 TIP: Use the admin dashboard to edit and publish these posts.');
}

async function importProducts() {
  const options = parseArgs(args);
  const slug = options.tenant;
  const file = options['asin-file'] || options.file;
  const format = options.format || 'auto';
  const batch = options.batch === 'true' || options.batch === true;
  
  if (!slug) {
    showError('Missing --tenant parameter');
    console.log('Usage: site import-products --tenant=my-tenant --asin-file=products.csv [--format=csv|txt] [--batch=true]');
    process.exit(1);
  }
  
  if (!file) {
    showError('Missing --asin-file parameter');
    console.log('Provide a file containing Amazon ASINs (one per line or CSV format)');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), file);
  
  if (!fs.existsSync(filePath)) {
    showError(`File not found: ${filePath}`);
    process.exit(1);
  }

  showProgress('Reading ASIN file...');
  
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    showError(`Failed to read file: ${error.message}`);
    process.exit(1);
  }

  // Parse ASINs based on format
  let asins = [];
  
  if (format === 'csv' || (format === 'auto' && file.endsWith('.csv'))) {
    // CSV format - assume first column contains ASINs
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const header = lines[0];
    
    if (header && (header.includes('asin') || header.includes('ASIN'))) {
      // Skip header row
      asins = lines.slice(1).map(line => {
        const parts = line.split(',');
        return parts[0]?.trim().replace(/["']/g, '');
      }).filter(Boolean);
    } else {
      // No header, assume first column is ASIN
      asins = lines.map(line => {
        const parts = line.split(',');
        return parts[0]?.trim().replace(/["']/g, '');
      }).filter(Boolean);
    }
  } else {
    // Plain text format - one ASIN per line
    asins = content.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split(/[,\s]+/)[0]) // Take first word if multiple
      .filter(Boolean);
  }

  // Validate ASINs
  const validAsins = asins.filter(asin => {
    // Amazon ASIN format: 10 characters, alphanumeric
    return /^[A-Z0-9]{10}$/i.test(asin);
  });

  const invalidAsins = asins.filter(asin => !/^[A-Z0-9]{10}$/i.test(asin));
  
  if (invalidAsins.length > 0) {
    showWarning(`Found ${invalidAsins.length} invalid ASINs:`);
    invalidAsins.slice(0, 5).forEach(asin => console.log(`   - ${asin}`));
    if (invalidAsins.length > 5) {
      console.log(`   ... and ${invalidAsins.length - 5} more`);
    }
  }

  if (validAsins.length === 0) {
    showError('No valid ASINs found in file');
    console.log('Expected format: 10-character alphanumeric codes like B08N5WRWNW');
    process.exit(1);
  }

  showProgress('Looking up tenant...');
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle();
    
  if (error) {
    showError(`Database error: ${error.message}`);
    process.exit(1);
  }
  
  if (!tenant) {
    showError(`Tenant '${slug}' not found`);
    process.exit(1);
  }

  console.log(`\n📦 IMPORT SUMMARY:`);
  console.log(`   Valid ASINs: ${validAsins.length}`);
  console.log(`   Invalid ASINs: ${invalidAsins.length}`);
  console.log(`   Tenant: ${tenant.name}`);
  console.log(`   Batch mode: ${batch ? 'Yes' : 'No'}`);
  
  if (batch && validAsins.length > 20) {
    showProgress(`Queueing ${validAsins.length} ASINs for batch processing...`);
    
    // Split into chunks of 20 for batch processing
    const chunks = [];
    for (let i = 0; i < validAsins.length; i += 20) {
      chunks.push(validAsins.slice(i, i + 20));
    }
    
    const tasks = chunks.map((chunk, index) => ({
      tenant_id: tenant.id,
      agent: 'ProductAgent',
      input: { asins: chunk, batch: true, chunkIndex: index + 1, totalChunks: chunks.length },
      status: 'queued',
      priority: 'normal'
    }));
    
    const { error: taskError } = await supabase.from('agent_tasks').insert(tasks);
    
    if (taskError) {
      showError(`Failed to queue tasks: ${taskError.message}`);
      process.exit(1);
    }
    
    showSuccess(`Queued ${chunks.length} batch tasks for ${validAsins.length} ASINs`);
    console.log(`Products will be processed by the ProductAgent in batches of 20.`);
  } else {
    showProgress(`Queueing ${validAsins.length} ASINs for processing...`);
    
    const { error: taskError } = await supabase.from('agent_tasks').insert({
      tenant_id: tenant.id,
      agent: 'ProductAgent',
      input: { asins: validAsins },
      status: 'queued',
      priority: 'high'
    });
    
    if (taskError) {
      showError(`Failed to queue task: ${taskError.message}`);
      process.exit(1);
    }
    
    showSuccess(`Queued ${validAsins.length} ASINs for ProductAgent`);
    console.log(`Products will be processed and added to your catalog.`);
  }
  
  console.log('');
  console.log('💡 TIP: Monitor progress with your admin dashboard or check agent_tasks table.');
}

async function runAgent() {
  const options = parseArgs(args);
  const slug = options.tenant;
  const agent = options.agent;
  const inputJson = options.input;
  const priority = options.priority || 'normal';
  const sync = options.sync === 'true' || options.sync === true;
  
  if (!slug) {
    showError('Missing --tenant parameter');
    console.log('Usage: site run-agent --tenant=my-tenant --agent=AgentName [--input=\'{}\'] [--sync=true] [--priority=high]');
    process.exit(1);
  }
  
  if (!agent) {
    showError('Missing --agent parameter');
    console.log('\nAvailable agents:');
    AVAILABLE_AGENTS.forEach(agentName => {
      console.log(`   - ${agentName}`);
    });
    process.exit(1);
  }
  
  if (!AVAILABLE_AGENTS.includes(agent)) {
    showError(`Unknown agent: ${agent}`);
    console.log('\nAvailable agents:');
    AVAILABLE_AGENTS.forEach(agentName => {
      console.log(`   - ${agentName}`);
    });
    process.exit(1);
  }

  // Parse input JSON
  let input = {};
  if (inputJson) {
    try {
      input = JSON.parse(inputJson);
    } catch (error) {
      showError(`Invalid JSON input: ${error.message}`);
      console.log('Example: --input=\'{"key": "value"}\' ');
      process.exit(1);
    }
  }

  showProgress('Looking up tenant...');
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle();
    
  if (error) {
    showError(`Database error: ${error.message}`);
    process.exit(1);
  }
  
  if (!tenant) {
    showError(`Tenant '${slug}' not found`);
    process.exit(1);
  }

  console.log(`\n🤖 AGENT EXECUTION:`);
  console.log(`   Agent: ${agent}`);
  console.log(`   Tenant: ${tenant.name}`);
  console.log(`   Mode: ${sync ? 'Synchronous' : 'Asynchronous'}`);
  console.log(`   Priority: ${priority}`);
  if (Object.keys(input).length > 0) {
    console.log(`   Input: ${JSON.stringify(input, null, 2)}`);
  }

  if (sync) {
    // Run agent synchronously via edge function
    showProgress('Executing agent synchronously', true);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/run-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ tenantSlug: slug, agent, input, priority })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      showSuccess('Agent executed successfully');
      console.log('');
      console.log('📊 EXECUTION RESULT:');
      console.log(JSON.stringify(result, null, 2));
      
    } catch (error) {
      showError(`Agent execution failed: ${error.message}`);
      
      if (error.message.includes('fetch')) {
        console.log('Edge function may not be deployed or configured correctly.');
      }
      
      process.exit(1);
    }
  } else {
    // Queue agent task for asynchronous execution
    showProgress('Queueing agent task...');
    
    const { data: task, error: taskError } = await supabase
      .from('agent_tasks')
      .insert({
        tenant_id: tenant.id,
        agent,
        input,
        status: 'queued',
        priority,
        created_at: new Date().toISOString()
      })
      .select('id')
      .maybeSingle();
    
    if (taskError) {
      showError(`Failed to queue task: ${taskError.message}`);
      process.exit(1);
    }
    
    showSuccess(`Agent task queued successfully`);
    console.log('');
    console.log('📋 TASK DETAILS:');
    console.log(`   Task ID: ${task.id}`);
    console.log(`   Status: queued`);
    console.log('   The worker will pick up this task automatically.');
    console.log('');
    console.log('💡 TIP: Monitor execution in the admin dashboard or check agent_tasks table.');
  }
}

async function verifyLinks() {
  const options = parseArgs(args);
  const slug = options.tenant;
  const fix = options.fix === 'true' || options.fix === true;
  const types = options.types ? options.types.split(',') : ['all'];
  const limit = Number(options.limit || 100);
  
  // If tenant specified, verify only that tenant's links
  let tenant = null;
  if (slug) {
    showProgress('Looking up tenant...');
    const { data: tenantData, error } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('slug', slug)
      .maybeSingle();
      
    if (error) {
      showError(`Database error: ${error.message}`);
      process.exit(1);
    }
    
    if (!tenantData) {
      showError(`Tenant '${slug}' not found`);
      process.exit(1);
    }
    
    tenant = tenantData;
  }

  console.log('\n🔗 LINK VERIFICATION:');
  if (tenant) {
    console.log(`   Scope: ${tenant.name} only`);
  } else {
    console.log(`   Scope: All tenants`);
  }
  console.log(`   Types: ${types.join(', ')}`);
  console.log(`   Limit: ${limit} links`);
  console.log(`   Auto-fix: ${fix ? 'Yes' : 'No'}`);
  console.log('');

  // Check if using edge function or direct verification
  const useEdgeFunction = !slug; // Use edge function for global verification
  
  if (useEdgeFunction) {
    showProgress('Running link verification via edge function', true);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/link-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ types, limit, fix })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      showSuccess('Link verification completed');
      console.log('');
      console.log('📊 VERIFICATION RESULTS:');
      console.log(JSON.stringify(result, null, 2));
      
    } catch (error) {
      showError(`Link verification failed: ${error.message}`);
      
      if (error.message.includes('fetch')) {
        console.log('Edge function may not be deployed. Falling back to direct verification...');
        await directLinkVerification(tenant, types, limit, fix);
      } else {
        process.exit(1);
      }
    }
  } else {
    await directLinkVerification(tenant, types, limit, fix);
  }
}

async function directLinkVerification(tenant, types, limit, fix) {
  showProgress('Fetching links to verify...');
  
  let query = supabase.from('links').select('id, target_url, target_type, status_code, ok, checked_at');
  
  if (tenant) {
    query = query.eq('tenant_id', tenant.id);
  }
  
  if (!types.includes('all')) {
    query = query.in('target_type', types);
  }
  
  query = query.limit(limit).order('checked_at', { ascending: true, nullsFirst: true });
  
  const { data: links, error } = await query;
  
  if (error) {
    showError(`Failed to fetch links: ${error.message}`);
    process.exit(1);
  }
  
  if (!links || links.length === 0) {
    showWarning('No links found to verify');
    return;
  }
  
  showSuccess(`Found ${links.length} links to verify`);
  
  const results = {
    total: links.length,
    verified: 0,
    ok: 0,
    failed: 0,
    fixed: 0
  };
  
  console.log('');
  showProgress('Verifying links...');
  
  for (const link of links) {
    try {
      const response = await fetch(link.target_url, {
        method: 'HEAD',
        redirect: 'follow',
        timeout: 10000
      });
      
      const isOk = response.ok;
      const statusCode = response.status;
      
      // Update link status
      await supabase
        .from('links')
        .update({
          status_code: statusCode,
          ok: isOk,
          checked_at: new Date().toISOString()
        })
        .eq('id', link.id);
      
      results.verified++;
      if (isOk) {
        results.ok++;
      } else {
        results.failed++;
        
        if (fix && link.target_type === 'product') {
          // Try to fix affiliate links
          // This is a basic implementation - could be enhanced
          showWarning(`Broken link: ${link.target_url} (${statusCode})`);
        }
      }
      
    } catch (error) {
      // Mark as failed
      await supabase
        .from('links')
        .update({
          status_code: 0,
          ok: false,
          checked_at: new Date().toISOString()
        })
        .eq('id', link.id);
      
      results.verified++;
      results.failed++;
    }
  }
  
  showSuccess('Link verification completed');
  console.log('');
  console.log('📊 VERIFICATION RESULTS:');
  console.log(`   Total verified: ${results.verified}`);
  console.log(`   Working links: ${results.ok}`);
  console.log(`   Broken links: ${results.failed}`);
  if (fix) {
    console.log(`   Fixed links: ${results.fixed}`);
  }
  
  if (results.failed > 0) {
    showWarning(`Found ${results.failed} broken links`);
    console.log('Run with --fix=true to attempt automatic repairs.');
  }
}

async function ask(rl, prompt, defaultValue = '') {
  const suffix = defaultValue ? ` [${defaultValue}]` : '';
  const answer = (await rl.question(`${prompt}${suffix}: `)).trim();
  return answer || defaultValue;
}

async function askList(rl, prompt, minItems, fallback = []) {
  while (true) {
    const defaultValue = fallback.length ? fallback.join(', ') : '';
    const raw = await ask(rl, prompt, defaultValue);
    const list = parseList(raw);
    if (list.length >= minItems) {
      return list;
    }
    console.log(`Please provide at least ${minItems} values.`);
  }
}

function parseList(value) {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(list) {
  return list.reduce((acc, arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.replace(/^--/, '').split('=');
      acc[key] = value ?? true;
    }
    return acc;
  }, {});
}

// Command help and usage
function showHelp() {
  console.log('🚀 Wearable Tech Codex CLI');
  console.log('');
  console.log('USAGE:');
  console.log('  pnpm exec site <command> [options]');
  console.log('');
  console.log('COMMANDS:');
  console.log('  init-tenant       Initialize a new tenant');
  console.log('    --name="Name"       Tenant name (required)');
  console.log('    --domain=domain.com Custom domain (optional)');
  console.log('    --theme=preset      Theme preset (optional)');
  console.log('    --interactive       Interactive mode');
  console.log('');
  console.log('  onboard           Complete onboarding wizard');
  console.log('    --tenant=slug       Tenant slug (required)');
  console.log('');
  console.log('  seed              Seed posts for a tenant');
  console.log('    --tenant=slug       Tenant slug (required)');
  console.log('    --posts=5           Number of posts (default: 5)');
  console.log('    --type=evergreen    Post type (default: evergreen)');
  console.log('');
  console.log('  import-products   Import products from ASIN file');
  console.log('    --tenant=slug       Tenant slug (required)');
  console.log('    --asin-file=file    File with ASINs (required)');
  console.log('    --format=csv        File format (csv|txt|auto)');
  console.log('    --batch=true        Batch processing for large files');
  console.log('');
  console.log('  run-agent         Run specific agents');
  console.log('    --tenant=slug       Tenant slug (required)');
  console.log('    --agent=AgentName   Agent name (required)');
  console.log('    --input=\'{}\'        JSON input (optional)');
  console.log('    --sync=true         Synchronous execution');
  console.log('    --priority=high     Task priority (high|normal|low)');
  console.log('');
  console.log('  verify-links      Verify affiliate links');
  console.log('    --tenant=slug       Tenant slug (optional)');
  console.log('    --types=product     Link types to check (comma-separated)');
  console.log('    --limit=100         Maximum links to check');
  console.log('    --fix=true          Attempt to fix broken links');
  console.log('');
  console.log('  help              Show this help message');
  console.log('');
  console.log('EXAMPLES:');
  console.log('  pnpm exec site init-tenant --name="Recovery Tech" --interactive');
  console.log('  pnpm exec site onboard --tenant=recovery-tech');
  console.log('  pnpm exec site import-products --tenant=my-site --asin-file=products.csv');
  console.log('  pnpm exec site run-agent --tenant=my-site --agent=OrchestratorAgent');
  console.log('  pnpm exec site verify-links --tenant=my-site --fix=true');
  console.log('');
  console.log('For more information, visit the project documentation.');
}

const commands = {
  'init-tenant': initTenant,
  onboard: onboardTenant,
  seed: seedPosts,
  'import-products': importProducts,
  'run-agent': runAgent,
  'verify-links': verifyLinks,
  help: showHelp
};

if (!command || command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
}

if (!commands[command]) {
  showError(`Unknown command: ${command}`);
  console.log(`\nAvailable commands: ${Object.keys(commands).filter(c => c !== 'help').join(', ')}`);
  console.log('Run \'pnpm exec site help\' for detailed usage information.');
  process.exit(1);
}

// Execute command with enhanced error handling
commands[command]().catch((error) => {
  console.log(''); // Add spacing
  showError(`Command failed: ${error.message}`);
  
  // Provide helpful error context
  if (error.message.includes('SUPABASE')) {
    console.log('Check your Supabase environment variables in .env file.');
  } else if (error.message.includes('OPENAI')) {
    console.log('Check your OpenAI API key in .env file.');
  } else if (error.message.includes('fetch')) {
    console.log('Check your network connection and Supabase configuration.');
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('\n🐛 DEBUG INFO:');
    console.error(error.stack);
  }
  
  process.exit(1);
});
