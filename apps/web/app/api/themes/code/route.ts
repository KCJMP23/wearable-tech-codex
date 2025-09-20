import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

const getCodeSchema = z.object({
  tenant_id: z.string().uuid(),
  file_path: z.string().optional(),
  component: z.string().optional(),
});

const updateCodeSchema = z.object({
  tenant_id: z.string().uuid(),
  file_path: z.string(),
  content: z.string(),
  backup: z.boolean().default(true),
});

const createFileSchema = z.object({
  tenant_id: z.string().uuid(),
  file_path: z.string(),
  content: z.string(),
  file_type: z.enum(['component', 'style', 'config', 'api']),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenant_id');
    const filePath = searchParams.get('file_path');
    const component = searchParams.get('component');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Get tenant theme information
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('theme, slug')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // If specific file requested
    if (filePath) {
      const { data: customFile } = await supabase
        .from('custom_files')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('file_path', filePath)
        .single();

      if (customFile) {
        return NextResponse.json({
          file: {
            path: customFile.file_path,
            content: customFile.content,
            type: customFile.file_type,
            last_modified: customFile.updated_at,
            is_custom: true,
          },
        });
      }

      // Return default theme file if no custom version exists
      const defaultContent = await getDefaultThemeFile(tenant.theme?.name || 'default', filePath);
      return NextResponse.json({
        file: {
          path: filePath,
          content: defaultContent,
          type: getFileType(filePath),
          last_modified: null,
          is_custom: false,
        },
      });
    }

    // If component requested, return component structure
    if (component) {
      const componentFiles = await getComponentFiles(tenantId, component);
      return NextResponse.json({
        component: {
          name: component,
          files: componentFiles,
        },
      });
    }

    // Return site structure overview
    const siteStructure = await getSiteStructure(tenantId, tenant.theme?.name || 'default');
    return NextResponse.json({
      site: {
        theme: tenant.theme,
        structure: siteStructure,
        custom_files_count: siteStructure.custom_files?.length || 0,
      },
    });

  } catch (error) {
    console.error('Site code API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create_file') {
      const validatedData = createFileSchema.parse(body);
      const supabase = createServiceClient();

      const { data: newFile, error } = await supabase
        .from('custom_files')
        .insert({
          tenant_id: validatedData.tenant_id,
          file_path: validatedData.file_path,
          content: validatedData.content,
          file_type: validatedData.file_type,
          version: 1,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating file:', error);
        return NextResponse.json({ error: 'Failed to create file' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        file: newFile,
      }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors,
      }, { status: 400 });
    }

    console.error('Site code creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateCodeSchema.parse(body);

    const supabase = createServiceClient();

    // Create backup if requested
    if (validatedData.backup) {
      const { data: existingFile } = await supabase
        .from('custom_files')
        .select('*')
        .eq('tenant_id', validatedData.tenant_id)
        .eq('file_path', validatedData.file_path)
        .single();

      if (existingFile) {
        await supabase
          .from('file_backups')
          .insert({
            tenant_id: validatedData.tenant_id,
            file_path: validatedData.file_path,
            content: existingFile.content,
            version: existingFile.version,
            backup_reason: 'pre_edit',
          });
      }
    }

    // Update or create the file
    const { data: updatedFile, error } = await supabase
      .from('custom_files')
      .upsert({
        tenant_id: validatedData.tenant_id,
        file_path: validatedData.file_path,
        content: validatedData.content,
        file_type: getFileType(validatedData.file_path),
        version: 1, // In real implementation, increment version
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating file:', error);
      return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      file: updatedFile,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors,
      }, { status: 400 });
    }

    console.error('Site code update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
async function getDefaultThemeFile(themeName: string, filePath: string): Promise<string> {
  try {
    // In a real implementation, this would read from theme templates
    const templatePath = path.join(process.cwd(), 'themes', themeName, filePath);
    const content = await fs.readFile(templatePath, 'utf-8');
    return content;
  } catch {
    return `// Default template for ${filePath}
// This file can be customized for your site

export default function Component() {
  return (
    <div>
      <h1>Default Component</h1>
      <p>Customize this component to match your brand.</p>
    </div>
  );
}`;
  }
}

async function getComponentFiles(tenantId: string, componentName: string) {
  const supabase = createServiceClient();
  
  const { data: files } = await supabase
    .from('custom_files')
    .select('*')
    .eq('tenant_id', tenantId)
    .like('file_path', `%${componentName}%`);

  return files || [];
}

async function getSiteStructure(tenantId: string, themeName: string) {
  const supabase = createServiceClient();

  // Get custom files
  const { data: customFiles } = await supabase
    .from('custom_files')
    .select('file_path, file_type, updated_at')
    .eq('tenant_id', tenantId);

  // Default theme structure
  const defaultStructure = {
    components: [
      'Header.tsx',
      'Footer.tsx',
      'ProductCard.tsx',
      'CategoryGrid.tsx',
      'HeroSection.tsx',
      'Testimonials.tsx',
    ],
    pages: [
      'index.tsx',
      'about.tsx',
      'contact.tsx',
      'products/[id].tsx',
      'categories/[slug].tsx',
    ],
    styles: [
      'globals.css',
      'components.css',
      'themes.css',
    ],
    config: [
      'site.config.js',
      'theme.config.js',
      'seo.config.js',
    ],
  };

  return {
    default_files: defaultStructure,
    custom_files: customFiles || [],
    theme: themeName,
  };
}

function getFileType(filePath: string): string {
  if (filePath.includes('.css') || filePath.includes('.scss')) return 'style';
  if (filePath.includes('.tsx') || filePath.includes('.jsx')) return 'component';
  if (filePath.includes('.config.') || filePath.includes('config/')) return 'config';
  if (filePath.includes('/api/')) return 'api';
  return 'component';
}