import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, Loader2 } from 'lucide-react';

interface UploadProgressOverlayProps {
  isUploading: boolean;
  progress: number;
  fileName: string;
}

/**
 * Shown while a file is going to the bucket. It blocks the screen deliberately: closing the
 * dialog mid-upload used to abandon the request and leave the material record pointing nowhere.
 *
 * The bar tracks the real number of bytes sent rather than animating on a timer, so a stalled
 * upload looks stalled instead of pretending to make progress. Above 99% the file is with the
 * server and the wait is its response, which no percentage can describe.
 */
export const UploadProgressOverlay: React.FC<UploadProgressOverlayProps> = ({ isUploading, progress, fileName }) => (
  <AnimatePresence>
    {isUploading && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[99998] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.94, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-4 text-center"
        >
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-blue-50 flex items-center justify-center">
              <UploadCloud className="w-7 h-7 text-blue-600" />
            </div>
            <Loader2 className="absolute -inset-1 w-16 h-16 text-blue-500/50 animate-spin" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">Uploading</h3>
            <p className="text-xs font-semibold text-slate-600 truncate" title={fileName}>
              {fileName}
            </p>
          </div>

          <div className="space-y-2">
            <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
            <p className="text-[11px] font-mono font-bold text-slate-500">
              {progress >= 99 ? 'Finishing up…' : `${progress}%`}
            </p>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Keep this window open until the upload finishes. Large videos can take a few minutes.
          </p>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
