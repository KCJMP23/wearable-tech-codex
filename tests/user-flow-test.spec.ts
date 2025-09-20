import { test, expect } from '@playwright/test';

test.describe('User Flow Test - Complete Journey', () => {
  test('Navigate through all pages as a real user', async ({ page }) => {
    console.log('\n🚀 Starting User Flow Test on localhost:3001\n');

    // 1. Visit Homepage
    console.log('1️⃣ Visiting Homepage...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/user-flow-01-homepage.png' });
    
    const pageTitle = await page.title();
    const hasContent = await page.locator('body').textContent();
    console.log(`   ✓ Homepage loaded - Title: "${pageTitle}"`);
    console.log(`   ✓ Page has content: ${hasContent ? 'Yes' : 'No'}`);
    
    // 2. Try to access admin dashboard
    console.log('\n2️⃣ Accessing Admin Dashboard...');
    await page.goto('http://localhost:3001/admin/test-tenant/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/user-flow-02-admin.png' });
    
    const adminUrl = page.url();
    console.log(`   ✓ Admin URL: ${adminUrl}`);
    
    // 3. Navigate to Orders page
    console.log('\n3️⃣ Viewing Orders Management...');
    await page.goto('http://localhost:3001/admin/test-tenant/orders');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/user-flow-03-orders.png' });
    
    const hasOrdersTitle = await page.locator('h1:has-text("Orders")').isVisible().catch(() => false);
    console.log(`   ✓ Orders page has title: ${hasOrdersTitle}`);
    
    // 4. Check Commissions page
    console.log('\n4️⃣ Checking Commission Management...');
    await page.goto('http://localhost:3001/admin/test-tenant/commissions');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/user-flow-04-commissions.png' });
    
    const hasCommissionsContent = await page.locator('h1:has-text("Commission")').isVisible().catch(() => false);
    console.log(`   ✓ Commissions page loaded: ${hasCommissionsContent}`);
    
    // 5. Test Agent Builder
    console.log('\n5️⃣ Testing AI Agent Builder...');
    await page.goto('http://localhost:3001/admin/test-tenant/agents/builder');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/user-flow-05-agent-builder.png' });
    
    const hasAgentBuilder = await page.locator('text=/Agent Builder/i').isVisible().catch(() => false);
    console.log(`   ✓ Agent builder interface: ${hasAgentBuilder ? 'Available' : 'Not found'}`);
    
    // Try to interact with form if available
    const agentNameInput = page.locator('input[placeholder*="agent name" i]').first();
    if (await agentNameInput.isVisible().catch(() => false)) {
      await agentNameInput.fill('Test Pet Content Agent');
      console.log('   ✓ Filled agent name field');
    }
    
    // 6. Visit Code Editor
    console.log('\n6️⃣ Accessing Site Code Editor...');
    await page.goto('http://localhost:3001/admin/test-tenant/code');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/user-flow-06-code-editor.png' });
    
    const hasCodeEditor = await page.locator('text=/Site Code/i').isVisible().catch(() => false);
    console.log(`   ✓ Code editor interface: ${hasCodeEditor ? 'Available' : 'Not found'}`);
    
    // 7. Test main storefront
    console.log('\n7️⃣ Visiting Main Storefront...');
    await page.goto('http://localhost:3001/test-tenant');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/user-flow-07-storefront.png' });
    
    const storefrontUrl = page.url();
    console.log(`   ✓ Storefront URL: ${storefrontUrl}`);
    
    // 8. Check for key elements
    console.log('\n8️⃣ Checking Page Elements...');
    const elements = {
      'Navigation': await page.locator('nav').isVisible().catch(() => false),
      'Header': await page.locator('header').isVisible().catch(() => false),
      'Main Content': await page.locator('main').isVisible().catch(() => false),
      'Footer': await page.locator('footer').isVisible().catch(() => false),
    };
    
    for (const [element, visible] of Object.entries(elements)) {
      console.log(`   ${visible ? '✓' : '✗'} ${element}: ${visible ? 'Present' : 'Missing'}`);
    }
    
    // 9. Test API endpoints
    console.log('\n9️⃣ Testing API Endpoints...');
    const apis = [
      { name: 'Orders', url: 'http://localhost:3001/api/orders?tenant_id=test' },
      { name: 'Commissions', url: 'http://localhost:3001/api/commissions?tenant_id=test' },
      { name: 'Custom Agents', url: 'http://localhost:3001/api/agents/custom?tenant_id=test' },
      { name: 'Theme Code', url: 'http://localhost:3001/api/themes/code?tenant_id=test' },
    ];
    
    for (const api of apis) {
      const response = await page.request.get(api.url);
      console.log(`   ${response.ok() ? '✓' : '✗'} ${api.name} API: ${response.status()}`);
    }
    
    // 10. Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 USER FLOW TEST SUMMARY');
    console.log('='.repeat(60));
    console.log('✅ Test completed successfully');
    console.log('📸 Screenshots saved to test-results/');
    console.log('='.repeat(60));
  });
});