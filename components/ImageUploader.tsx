'use client';

/**
 * ImageUploader Component
 *
 * Refined drag-and-drop upload zone.
 */

import { useCallback, useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';

const IconUpload = () => (
  <svg
    className="h-8 w-8 text-[var(--text-muted)]"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
    />
  </svg>
);

export default function ImageUploader() {
  const { setImage } = useEditorStore();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndProcessFile = useCallback(
    async (file: File) => {
      setError(null);

      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload a PNG or JPG image');
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('Image must be less than 10MB');
        return;
      }

      try {
        await setImage(file);
      } catch {
        setError('Failed to process image');
      }
    },
    [setImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        validateAndProcessFile(file);
      }
    },
    [validateAndProcessFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        validateAndProcessFile(file);
      }
    },
    [validateAndProcessFile]
  );

  return (
    <div className="space-y-2">
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          flex cursor-pointer flex-col items-center justify-center
          rounded-lg border-2 border-dashed px-4 py-8
          transition-colors duration-150
          ${
            isDragging
              ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
              : 'border-[var(--border-default)] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
          }
          ${error ? 'border-[var(--error)] bg-[var(--error)]/10' : ''}
        `}
        tabIndex={0}
        role="button"
        aria-label="Upload image"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            document.getElementById('file-input')?.click();
          }
        }}
      >
        <input
          id="file-input"
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileInput}
          className="hidden"
        />
        <IconUpload />
        <span className="mt-3 block text-sm font-medium text-[var(--text-primary)]">
          {isDragging ? 'Drop image here' : 'Drop or click to upload'}
        </span>
        <span className="mt-1 block text-xs text-[var(--text-muted)]">
          PNG, JPG · max 10MB
        </span>
      </label>

      {error && (
        <div
          className="animate-shake rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-3 py-2"
          role="alert"
        >
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      )}
    </div>
  );
}
