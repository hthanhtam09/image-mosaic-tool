"use client";

import { useCallback, useRef, useState } from "react";

interface ImageUploaderProps {
  onImageSelected: (dataUrl: string, fileName: string) => void;
}

export default function ImageUploader({ onImageSelected }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        onImageSelected(reader.result as string, file.name);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`
        relative cursor-pointer rounded-2xl border-2 border-dashed p-12
        flex flex-col items-center justify-center gap-4
        transition-all duration-300 group
        ${
          isDragging
            ? "border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.02]"
            : "border-[var(--border-default)] hover:border-[var(--accent)]/50 hover:bg-white/[0.02]"
        }
      `}
    >
      {/* Animated icon */}
      <div
        className={`
          w-20 h-20 rounded-2xl flex items-center justify-center
          transition-all duration-300
          ${
            isDragging
              ? "bg-[var(--accent)]/20 text-[var(--accent)] scale-110"
              : "bg-white/5 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:scale-105"
          }
        `}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold text-[var(--text-primary)] mb-1">
          {isDragging ? "Drop image here" : "Upload an image"}
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          Drag & drop or click to browse · PNG, JPG, WEBP
        </p>
      </div>

      {/* Bottom accent bar */}
      <div
        className={`
          absolute bottom-0 left-1/2 -translate-x-1/2 h-1 rounded-full transition-all duration-500
          ${isDragging ? "w-1/2 bg-[var(--accent)]" : "w-0 bg-transparent group-hover:w-1/4 group-hover:bg-[var(--accent)]/40"}
        `}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
