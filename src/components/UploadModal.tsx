'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileUpload } from './FileUpload';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (filename: string) => void;
  onUploadError?: (error: string) => void;
}

export function UploadModal({ isOpen, onClose, onUploadSuccess, onUploadError }: UploadModalProps) {
  const [uploadProgress, setUploadProgress] = useState<{ uploading: boolean; progress: number; filename?: string }>({ 
    uploading: false, 
    progress: 0 
  });
  const router = useRouter();

  const handleUploadSuccess = useCallback((filename: string) => {
    setUploadProgress({ uploading: false, progress: 100, filename });
    onUploadSuccess?.(filename);
    
    // Navigate to the new report dashboard after a short delay to show success message
    setTimeout(() => {
      onClose();
      setUploadProgress({ uploading: false, progress: 0 });
      router.push(`/dashboard?report=${encodeURIComponent(filename)}`);
    }, 2000);
  }, [onUploadSuccess, onClose, router]);

  const handleUploadError = useCallback((error: string) => {
    setUploadProgress({ uploading: false, progress: 0 });
    onUploadError?.(error);
  }, [onUploadError]);

  const handleClose = useCallback(() => {
    if (!uploadProgress.uploading) {
      onClose();
    }
  }, [uploadProgress.uploading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Upload Garak Report
              </h3>
              <button
                onClick={handleClose}
                disabled={uploadProgress.uploading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Upload a Garak report file (.jsonl) to add it to your reports collection.
            </p>

            {/* Upload Component */}
            <FileUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploadProgress.uploading}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadProgress.uploading ? 'Uploading...' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
