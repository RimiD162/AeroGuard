'use client';

import { useCallback, useState } from 'react';
import { Upload, FileVideo, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useInspectionStore } from '@/stores/inspection.store';

export default function VideoUploadZone({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { uploadProgress, isUploading, uploadedFile, startUpload } = useInspectionStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    startUpload(file);
  }, [startUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="animate-slide-up space-y-5">
      <div>
        <h2 className="text-[18px] font-medium text-text-primary mb-1">Upload Inspection Video</h2>
        <p className="text-[13px] text-text-secondary">Upload borescope footage for AI analysis.</p>
      </div>

      {/* Drop zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex h-[320px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all ${
          isDragOver
            ? 'border-accent bg-accent-subtle'
            : uploadedFile
            ? 'border-success/40 bg-success-subtle'
            : 'border-border-default bg-surface hover:border-border-strong'
        }`}
      >
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleSelect} className="hidden" />

        {isUploading ? (
          <div className="flex flex-col items-center">
            {/* Circular progress */}
            <div className="relative mb-4 h-20 w-20">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="#2A2A2A" strokeWidth="4" />
                <circle
                  cx="40" cy="40" r="36" fill="none" stroke="#2563EB" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - uploadProgress / 100)}`}
                  className="transition-all duration-200"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[14px] font-medium text-text-primary">
                {Math.round(uploadProgress)}%
              </span>
            </div>
            <p className="text-[13px] text-text-secondary">Uploading...</p>
          </div>
        ) : uploadedFile ? (
          <div className="flex flex-col items-center">
            <CheckCircle2 className="mb-3 h-10 w-10 text-success" />
            <p className="text-[14px] font-medium text-text-primary">{uploadedFile.name}</p>
            <p className="mt-1 text-[12px] text-text-tertiary">{uploadedFile.size}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="mb-3 h-10 w-10 text-text-tertiary" />
            <p className="text-[14px] font-medium text-text-secondary">Drop image file here</p>
            <p className="mt-1 text-[13px] text-text-tertiary">or click to select</p>
            <div className="mt-4 flex gap-2">
              {['JPG', 'JPEG', 'PNG', 'WEBP', '15MB'].map((f) => (
                <span key={f} className="rounded border border-border-subtle bg-elevated px-2 py-0.5 text-[10px] font-medium text-text-tertiary">{f}</span>
              ))}
            </div>
          </div>
        )}
      </label>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 rounded-md border border-border-default px-4 py-2.5 text-[14px] text-text-secondary transition-colors hover:text-text-primary hover:border-border-strong">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={onNext} disabled={!uploadedFile} className="flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed">
          Start Analysis <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
