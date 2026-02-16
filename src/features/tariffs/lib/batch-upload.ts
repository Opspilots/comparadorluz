import { supabase } from '@/shared/lib/supabase';

export interface BatchFileStatus {
    file: File;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
}

/**
 * Creates a new tariff batch record in the database.
 */
export async function createBatch(companyId: string, userId: string): Promise<string> {
    const { data, error } = await supabase
        .from('tariff_batches')
        .insert({
            company_id: companyId,
            uploaded_by: userId,
            status: 'uploaded',
            file_count: 0
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error creating batch:', error);
        throw new Error('Failed to create tariff batch');
    }
    return data.id;
}

/**
 * Uploads a single file to Supabase Storage and creates a record in tariff_files.
 */
export async function uploadBatchFile(batchId: string, companyId: string, file: File): Promise<void> {
    try {
        // 1. Upload file to Storage (bucket: tariff-files)
        // Path structure: company_id/batch_id/random_uuid.pdf
        const fileExt = file.name.split('.').pop();
        const fileUuid = crypto.randomUUID();
        const storagePath = `${companyId}/${batchId}/${fileUuid}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('tariff-files')
            .upload(storagePath, file);

        if (uploadError) {
            // If bucket doesn't exist or permissions fail
            throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        // 2. Create record in tariff_files
        const { error: dbError } = await supabase
            .from('tariff_files')
            .insert({
                company_id: companyId,
                batch_id: batchId,
                filename: file.name,
                storage_path: storagePath,
                file_size_bytes: file.size,
                mime_type: file.type,
                extraction_status: 'pending'
            });

        if (dbError) {
            throw new Error(`Database record creation failed: ${dbError.message}`);
        }

    } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        throw error;
    }
}

/**
 * Finalizes the batch by updating the file count and setting status to 'processing'.
 */
export async function finalizeBatch(batchId: string, fileCount: number): Promise<void> {
    const { error } = await supabase
        .from('tariff_batches')
        .update({
            file_count: fileCount,
            updated_at: new Date().toISOString(),
            status: 'processing' // Move directly to processing (mock pipeline will pick this up)
        })
        .eq('id', batchId);

    if (error) {
        console.error('Error finalizing batch:', error);
        throw new Error('Failed to finalize batch');
    }
}
