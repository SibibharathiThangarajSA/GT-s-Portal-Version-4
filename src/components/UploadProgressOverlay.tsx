import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, Loader2, FileVideo, AlertCircle, Sparkles } from 'lucide-react';

interface UploadProgressOverlayProps {
  isUploading: boolean;
  progress: number;
  fileName: string;
}

/**
 * Centered Modal Popup Overlay shown while uploading video/materials to cloud storage.
 * Deliberately blocks the screen so users wait for the upload to complete safely without accidental page closure.
 */
export const UploadProgressOverlay: React.FC<UploadProgressOverlayProps> = ({ isUploading, progress, fileName }) => (
  <AnimatePresence>
    {isUploading && (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative max-w-md w-full bg-white/80 backdrop-blur-2xl border border-white/90 rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5 space-y-6 text-center overflow-hidden"
        >
          {/* Subtle Ambient Glows */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Animated Pulsing Icon */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-ping opacity-60" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <UploadCloud className="w-10 h-10 text-white animate-pulse" />
            </div>
            <Loader2 className="absolute -inset-2 w-24 h-24 text-blue-600 animate-spin opacity-80" />
          </div>

          {/* Title & File Info */}
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
              <span>Uploading to Cloud Storage</span>
              <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
            </h3>
            <p className="text-xs text-slate-600 font-medium">
              Securing and streaming file to Tigris S3 Storage bucket
            </p>

            {fileName && (
              <div className="mt-3 bg-slate-100/90 border border-slate-200/90 rounded-xl px-3.5 py-2.5 flex items-center justify-center gap-2 text-xs font-mono text-slate-800 shadow-sm">
                <FileVideo className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate max-w-[280px]" title={fileName}>
                  {fileName}
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar & Status */}
          <div className="space-y-2 text-left">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span>Upload Progress</span>
              <span className="text-blue-600 font-mono text-sm font-extrabold">
                {progress >= 99 ? 'Processing & Securing…' : `${Math.round(progress)}%`}
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-200/80 border border-slate-300/60 overflow-hidden p-0.5 shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 shadow-sm"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progress, 100)}%` }}
                transition={{ ease: 'easeOut', duration: 0.2 }}
              />
            </div>
          </div>

          {/* Blocking Warning Banner */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/40 text-amber-950 text-xs flex items-center justify-center gap-2.5 text-left font-medium backdrop-blur-sm">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="font-medium leading-relaxed text-amber-900">
              Please wait until upload completes. Do not close or refresh this tab.
            </span>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
