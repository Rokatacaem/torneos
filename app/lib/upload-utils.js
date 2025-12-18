import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';

export async function saveFile(file, folder = 'uploads') {
    if (!file || !file.name) return null;

    try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists
        const uploadDir = join(process.cwd(), 'public', folder);
        await mkdir(uploadDir, { recursive: true });

        // Unique filename to avoid collisions
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = file.name.split('.').pop();
        const filename = `${file.name.split('.')[0]}-${uniqueSuffix}.${ext}`;
        const filepath = join(uploadDir, filename);

        await writeFile(filepath, buffer);

        // Return public URL
        return `/${folder}/${filename}`;
    } catch (error) {
        console.error('Error saving file:', error);
        throw new Error('Failed to upload file');
    }
}
