import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api/api';

interface UploadProgress {
  stage: 'initiating' | 'uploading' | 'completing' | 'done' | 'error';
  uploadedChunks: number;
  totalChunks: number;
  percentage: number;
}

export function useChunkedUpload() {
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const upload = useCallback(async (file: File, metadata: {
    title: string;
    description?: string;
    privacy?: string;
    allowComments?: boolean;
    allowDuet?: boolean;
    allowStitch?: boolean;
  }) => {
    setIsUploading(true);
    setError(null);
    abortRef.current = false;

    try {
      // Initiate
      setProgress({ stage: 'initiating', uploadedChunks: 0, totalChunks: 0, percentage: 0 });
      const session = await api.initiateChunkedUpload({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        ...metadata,
      });

      const { uploadId, chunkSize, totalChunks } = session;

      // Upload chunks
      for (let i = 0; i < totalChunks; i++) {
        if (abortRef.current) throw new Error('Upload cancelled');

        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const buffer = await chunk.arrayBuffer();

        await api.uploadChunk(uploadId, i, buffer);

        setProgress({
          stage: 'uploading',
          uploadedChunks: i + 1,
          totalChunks,
          percentage: Math.round(((i + 1) / totalChunks) * 100),
        });
      }

      // Complete
      setProgress({ stage: 'completing', uploadedChunks: totalChunks, totalChunks, percentage: 100 });
      const video = await api.completeChunkedUpload(uploadId);

      setProgress({ stage: 'done', uploadedChunks: totalChunks, totalChunks, percentage: 100 });
      return video;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      setProgress(prev => prev ? { ...prev, stage: 'error' } : null);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { upload, progress, isUploading, error, cancel };
}
