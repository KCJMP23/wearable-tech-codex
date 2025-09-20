import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@affiliate-factory/sdk';

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { tenant_id, customizations } = body;
    
    if (!tenant_id || !customizations) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check if user has access to tenant
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', user.id)
      .single();
    
    if (!tenantUser || !['owner', 'admin'].includes(tenantUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Get active theme installation
    const { data: activeInstallation } = await supabase
      .from('theme_installations')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .single();
    
    if (!activeInstallation) {
      return NextResponse.json({ error: 'No active theme found' }, { status: 404 });
    }
    
    // Update customizations
    const { error: updateError } = await supabase
      .from('theme_installations')
      .update({ customizations })
      .eq('id', activeInstallation.id);
    
    if (updateError) {
      console.error('Error updating customizations:', updateError);
      return NextResponse.json({ error: 'Failed to update customizations' }, { status: 500 });
    }
    
    // Save to history
    const { error: historyError } = await supabase
      .from('theme_customizations')
      .insert({
        installation_id: activeInstallation.id,
        customizations,
        created_by: user.id,
      });
    
    if (historyError) {
      console.error('Error saving customization history:', historyError);
    }
    
    return NextResponse.json({ 
      message: 'Theme customizations saved successfully',
      customizations 
    });
  } catch (error) {
    console.error('Error in PUT /api/themes/customize:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get('tenant_id');
    
    if (!tenant_id) {
      return NextResponse.json({ error: 'Missing tenant_id' }, { status: 400 });
    }
    
    // Get active theme installation with customizations
    const { data: installation, error } = await supabase
      .from('theme_installations')
      .select(`
        *,
        theme:themes(*)
      `)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('Error fetching theme customizations:', error);
      return NextResponse.json({ error: 'Failed to fetch theme customizations' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      theme: installation?.theme,
      customizations: installation?.customizations || {}
    });
  } catch (error) {
    console.error('Error in GET /api/themes/customize:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}