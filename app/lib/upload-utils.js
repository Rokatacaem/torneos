import { put } from '@vercel/blob';

export async function saveFile(file, folder = 'uploads') {
    if (!file || !file.name) return null;

    try {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.name.split('.').pop();
        const filename = `${folder}/${file.name.split('.')[0]}-${uniqueSuffix}.${ext}`;

        // Upload to Vercel Blob
        // access: 'public' required for public serving
        const blob = await put(filename, file, {
            access: 'public',
        });

        // Return public URL
        return blob.url;
    } catch (error) {
        console.error('Error saving file to Vercel Blob:', error);
        return null;
    }
}
