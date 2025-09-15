'use client';

import { useState, useRef, useCallback } from 'react';

interface FileUploadProps {
  onUploadSuccess?: (filename: string) => void;
  onUploadError?: (error: string) => void;
}

interface UploadProgress {
  uploading: boolean;
  progress: number;
  filename?: string;
}

export function FileUpload({ onUploadSuccess, onUploadError }: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ uploading: false, progress: 0 });
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    // Reset error state
    setError(null);

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.jsonl')) {
      const errorMsg = 'Please select a valid Garak report file (.jsonl)';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    // Validate file size (500MB limit)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      const errorMsg = `File too large. Maximum size is 500MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB`;
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    // Start upload
    setUploadProgress({ uploading: true, progress: 0, filename: file.name });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-report', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Upload successful
      setUploadProgress({ uploading: false, progress: 100, filename: file.name });
      onUploadSuccess?.(result.filename);

      // Reset after a short delay
      setTimeout(() => {
        setUploadProgress({ uploading: false, progress: 0 });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      setUploadProgress({ uploading: false, progress: 0 });
      onUploadError?.(errorMsg);
    }
  }, [onUploadSuccess, onUploadError]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const handleClick = useCallback(() => {
    if (!uploadProgress.uploading) {
      fileInputRef.current?.click();
    }
  }, [uploadProgress.uploading]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : uploadProgress.uploading
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploadProgress.uploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jsonl"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploadProgress.uploading}
        />

        {uploadProgress.uploading ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Uploading Report</h3>
              <p className="text-sm text-gray-600 mt-1">{uploadProgress.filename}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">Validating and saving report...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg
                className="h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Upload Garak Report
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Drag and drop your .jsonl file here, or click to browse
              </p>
            </div>
            <div className="text-xs text-gray-500">
              <p>Maximum file size: 500MB</p>
              <p>Supported format: .jsonl</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadProgress.progress === 100 && !error && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Upload Successful</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Report uploaded and validated successfully! Redirecting to dashboard...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
