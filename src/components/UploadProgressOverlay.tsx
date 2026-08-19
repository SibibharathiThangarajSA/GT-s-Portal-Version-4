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
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[99998] pointer-events-auto"
      >
        <div className="bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 w-80 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 flex-shrink-0">
              <div className="absolute inset-0 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-blue-400" />
              </div>
              <Loader2 className="absolute -inset-0.5 w-10 h-10 text-blue-400 animate-spin" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-white">Uploading file…</h4>
                <span className="text-[11px] font-mono font-bold text-blue-400">
                  {progress >= 99 ? 'Processing…' : `${progress}%`}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate" title={fileName}>
                {fileName}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Uploading in background — you can continue editing freely!
            </p>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);
