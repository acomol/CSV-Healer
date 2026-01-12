import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFileSelect,
  accept = '.csv',
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const validExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setDragError(`Invalid file type. Please upload ${accept} files.`);
      return false;
    }

    // Max file size: 50MB
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setDragError('File too large. Maximum size is 50MB.');
      return false;
    }

    setDragError(null);
    return true;
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
    // Reset input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-16 animate-fade-in">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-300 group shadow-sm
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isDragOver
            ? 'border-[#1877F2] bg-blue-50 scale-[1.02] shadow-xl shadow-blue-100'
            : 'border-slate-300 bg-white hover:border-[#1877F2] hover:bg-blue-50/30 hover:shadow-xl'
          }
          ${dragError ? 'border-red-400 bg-red-50' : ''}
        `}
      >
        <div className={`
          w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6
          transition-all duration-300
          ${isDragOver ? 'bg-[#1877F2] scale-110' : 'bg-blue-100 group-hover:scale-110'}
        `}>
          {isDragOver ? (
            <FileSpreadsheet className="text-white w-10 h-10 animate-bounce" />
          ) : (
            <Upload className="text-[#1877F2] w-10 h-10" />
          )}
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-2">
          {isDragOver ? 'Drop your file here!' : 'Upload CSV Audience'}
        </h3>

        <p className="text-slate-500 mb-6 max-w-xs mx-auto leading-relaxed">
          {isDragOver ? (
            'Release to upload your file'
          ) : (
            <>
              <strong>Drag & drop</strong> your CSV file here, or click to browse.
              <br />
              <span className="text-xs text-slate-400">Max file size: 50MB</span>
            </>
          )}
        </p>

        {dragError && (
          <div className="mb-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
            {dragError}
          </div>
        )}

        <button
          className={`
            px-8 py-3 font-semibold rounded-full shadow-lg transition-all
            ${isDragOver
              ? 'bg-[#1877F2] text-white shadow-blue-300'
              : 'bg-[#1877F2] text-white shadow-blue-200 group-hover:bg-blue-700'
            }
          `}
        >
          {isDragOver ? 'Drop Now' : 'Select CSV File'}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled}
        />
      </div>

      {/* Feature hints */}
      <div className="mt-8 grid grid-cols-2 gap-4 text-center text-xs text-slate-400">
        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <span className="block font-semibold text-slate-600 mb-1">Clean Phones</span>
          <code>050-123...</code> → <code>97250123...</code>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <span className="block font-semibold text-slate-600 mb-1">Normalize Emails</span>
          <code>John@Gmail.COM</code> → <code>john@gmail.com</code>
        </div>
      </div>
    </div>
  );
};
