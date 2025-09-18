import { 
  validateRequest, 
  getTenant, 
  successResponse,
  errorResponse,
  logOperation,
  getSupabaseClient,
  IngestImagePayload 
} from '../_shared/mod.ts';

Deno.serve(async (request) => {
  try {
    const validation = await validateRequest(
      request, 
      ['POST'], 
      true, 
      'MAKE_IMAGE_WEBHOOK_SECRET'
    );
    
    if (validation instanceof Response) return validation;
    
    const { payload, env } = validation;
    const imagePayload = payload as IngestImagePayload;

    // Validate required fields
    if (!imagePayload.tenantSlug || !imagePayload.images || !Array.isArray(imagePayload.images)) {
      return errorResponse('Missing required fields: tenantSlug, images array', 400);
    }

    if (imagePayload.images.length === 0) {
      return errorResponse('Images array cannot be empty', 400);
    }

    const supabase = getSupabaseClient(env);
    const tenant = await getTenant(supabase, imagePayload.tenantSlug);

    const processedImages = [];
    const errors = [];

    for (let i = 0; i < imagePayload.images.length; i++) {
      const image = imagePayload.images[i];
      
      try {
        // Validate image data
        if (!image.url || !image.alt) {
          errors.push({ index: i, error: 'Missing required fields: url, alt' });
          continue;
        }

        // Validate URL format
        try {
          new URL(image.url);
        } catch {
          errors.push({ index: i, error: 'Invalid URL format' });
          continue;
        }

        // Process the image
        const processedImage = await processImage(supabase, tenant, image, env);
        processedImages.push({
          index: i,
          ...processedImage
        });

      } catch (error) {
        console.error(`Error processing image at index ${i}:`, error);
        errors.push({ 
          index: i, 
          error: error.message 
        });
      }
    }

    // Log the operation
    logOperation('Images Ingested', {
      tenantSlug: imagePayload.tenantSlug,
      totalImages: imagePayload.images.length,
      processedCount: processedImages.length,
      errorCount: errors.length
    });

    return successResponse(
      {
        processedImages,
        errors,
        summary: {
          total: imagePayload.images.length,
          processed: processedImages.length,
          failed: errors.length
        }
      },
      `Processed ${processedImages.length} of ${imagePayload.images.length} images`
    );

  } catch (error) {
    console.error('Unexpected error in ingest-images:', error);
    return errorResponse(`Internal server error: ${error.message}`);
  }
});

async function processImage(
  supabase: any, 
  tenant: any, 
  image: any, 
  env: any
) {
  const bucket = image.bucket || 'images';
  const folder = image.folder || tenant.slug;
  
  // Generate filename if not provided
  let fileName = image.fileName;
  if (!fileName) {
    const url = new URL(image.url);
    const pathParts = url.pathname.split('/');
    fileName = pathParts[pathParts.length - 1] || `image-${Date.now()}.jpg`;
  }

  // Ensure filename has extension
  if (!fileName.includes('.')) {
    fileName += '.jpg';
  }

  const storagePath = `${folder}/${fileName}`;

  try {
    // Download the image from the external URL
    const imageResponse = await fetch(image.url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageBlob = await imageResponse.blob();
    
    // Validate file size (max 10MB)
    if (imageBlob.size > 10 * 1024 * 1024) {
      throw new Error('Image file too large (max 10MB)');
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, imageBlob, {
        contentType: imageBlob.type || 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    // Store image metadata in database
    const imageData = {
      tenant_id: tenant.id,
      original_url: image.url,
      storage_path: storagePath,
      public_url: publicUrlData.publicUrl,
      bucket: bucket,
      file_name: fileName,
      alt_text: image.alt,
      file_size: imageBlob.size,
      mime_type: imageBlob.type || 'image/jpeg',
      uploaded_at: new Date().toISOString()
    };

    const { data: dbImage, error: dbError } = await supabase
      .from('images')
      .insert(imageData)
      .select('id, public_url, alt_text')
      .single();

    if (dbError) {
      console.error('Database insert failed:', dbError);
      // Don't throw here - the image was uploaded successfully
    }

    return {
      success: true,
      imageId: dbImage?.id,
      originalUrl: image.url,
      publicUrl: publicUrlData.publicUrl,
      storagePath: storagePath,
      fileName: fileName,
      alt: image.alt,
      fileSize: imageBlob.size
    };

  } catch (error) {
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

// Helper function to extract filename from URL
function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split('/');
    let filename = segments[segments.length - 1];
    
    // Remove query parameters if they exist in the filename
    filename = filename.split('?')[0];
    
    // If no filename or extension, generate one
    if (!filename || !filename.includes('.')) {
      const timestamp = Date.now();
      filename = `image-${timestamp}.jpg`;
    }
    
    return filename;
  } catch {
    return `image-${Date.now()}.jpg`;
  }
}