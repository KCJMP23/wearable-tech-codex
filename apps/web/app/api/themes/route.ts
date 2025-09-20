import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@affiliate-factory/sdk';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured') === 'true';
    
    let query = supabase
      .from('themes')
      .select('*')
      .eq('is_active', true);
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (featured) {
      query = query.eq('is_featured', true);
    }
    
    const { data: themes, error } = await query.order('downloads', { ascending: false });
    
    if (error) {
      console.error('Error fetching themes:', error);
      return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 });
    }
    
    return NextResponse.json({ themes });
  } catch (error) {
    console.error('Error in GET /api/themes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { theme_id, name, description, category, config, thumbnail_url, screenshots, tags } = body;
    
    if (!theme_id || !name || !config) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Check if user is a developer
    const { data: developer } = await supabase
      .from('developers')
      .select('id')
      .eq('user_id', user.id)
      .single();
    
    if (!developer) {
      return NextResponse.json({ error: 'Must be a registered developer to submit themes' }, { status: 403 });
    }
    
    // Create theme
    const { data: theme, error: createError } = await supabase
      .from('themes')
      .insert({
        theme_id,
        name,
        description,
        category,
        config,
        thumbnail_url,
        screenshots,
        tags,
        author: user.email?.split('@')[0] || 'Anonymous',
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating theme:', createError);
      return NextResponse.json({ error: 'Failed to create theme' }, { status: 500 });
    }
    
    return NextResponse.json({ theme });
  } catch (error) {
    console.error('Error in POST /api/themes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}