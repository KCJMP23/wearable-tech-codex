import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@affiliate-factory/sdk';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { tenant_id, theme_id } = body;
    
    if (!tenant_id || !theme_id) {
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
    
    // Call the install_theme function
    const { data, error } = await supabase
      .rpc('install_theme', {
        p_tenant_id: tenant_id,
        p_theme_id: theme_id,
      });
    
    if (error) {
      console.error('Error installing theme:', error);
      return NextResponse.json({ error: 'Failed to install theme' }, { status: 500 });
    }
    
    // Get the installed theme details
    const { data: installation } = await supabase
      .from('theme_installations')
      .select(`
        *,
        theme:themes(*)
      `)
      .eq('id', data)
      .single();
    
    return NextResponse.json({ 
      message: 'Theme installed successfully',
      installation 
    });
  } catch (error) {
    console.error('Error in POST /api/themes/install:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}