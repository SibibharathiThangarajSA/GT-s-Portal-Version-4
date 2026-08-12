import { useCallback, useState } from 'react';
import { uploadStudyMaterialFile } from '../services/api';
import { useToast } from '../context/ToastContext';

interface UploadResult {
  fileName: string;
  url: string;
  driveItemId?: string;
  webUrl?: string;
  downloadUrl?: string;
}

/**
 * Runs a file upload while keeping the screen honest about it.
 *
 * Every upload site used to await the request with nothing on screen and swallow failures into
 * console.error, so a large video looked like it had done nothing for minutes and a failure
 * looked the same as a success. This reports progress while the file is going up and raises a
 * toast either way.
 *
 * Returns null instead of throwing when the upload fails, so callers can simply skip saving.
 */
export const useFileUpload = () => {
  const { addToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');

  const uploadFile = useCallback(
    async (file: File, sessionId?: string): Promise<UploadResult | null> => {
      setIsUploading(true);
      setProgress(0);
      setUploadingFileName(file.name);

      try {
        const result = await uploadStudyMaterialFile(file, sessionId, setProgress);
        addToast('success', `${file.name} uploaded successfully.`);
        return result;
      } catch (error: any) {
        addToast('error', error?.message || `Could not upload ${file.name}.`);
        return null;
      } finally {
        setIsUploading(false);
        setProgress(0);
        setUploadingFileName('');
      }
    },
    [addToast]
  );

  return { isUploading, progress, uploadingFileName, uploadFile };
};
