'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface FileUploadProps {
  onUploadSuccess?: (filename: string) => void;
  onUploadError?: (error: string) => void;
}

interface Folder {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: Folder[];
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
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [, setLoadingFolders] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load folders on component mount
  useEffect(() => {
    const loadFolders = async () => {
      try {
        const response = await fetch('/api/folders');
        if (response.ok) {
          const data = await response.json();
          setFolders(data.folders || []);
        }
      } catch (err) {
        console.error('Failed to load folders:', err);
      } finally {
        setLoadingFolders(false);
      }
    };
    
    loadFolders();
  }, []);

  const handleFileSelect = useCallback((file: File) => {
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

    // Just set the selected file, don't upload yet
    setSelectedFile(file);
  }, [onUploadError]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    // Start upload
    setUploadProgress({ uploading: true, progress: 0, filename: selectedFile.name });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      if (selectedFolder) {
        formData.append('folderPath', selectedFolder);
      }

      const response = await fetch('/api/upload-report', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Upload successful
      setUploadProgress({ uploading: false, progress: 100, filename: selectedFile.name });
      onUploadSuccess?.(result.filename);

      // Reset after a short delay
      setTimeout(() => {
        setUploadProgress({ uploading: false, progress: 0 });
        setSelectedFile(null);
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
  }, [selectedFile, selectedFolder, onUploadSuccess, onUploadError]);

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

  const handleCreateFolder = useCallback(async (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!newFolderName.trim()) return;
    
    // Clear any existing errors
    setError(null);
    
    try {
      const folderPath = selectedFolder ? `${selectedFolder}/${newFolderName}` : newFolderName;
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderPath }),
      });
      
      if (response.ok) {
        // Reload folders
        const foldersResponse = await fetch('/api/folders');
        if (foldersResponse.ok) {
          const data = await foldersResponse.json();
          setFolders(data.folders || []);
        }
        setNewFolderName('');
        setShowNewFolderInput(false);
        setSelectedFolder(folderPath);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to create folder');
      }
    } catch {
      setError('Failed to create folder');
    }
  }, [newFolderName, selectedFolder]);

  const handleClick = useCallback(() => {
    if (!uploadProgress.uploading) {
      fileInputRef.current?.click();
    }
  }, [uploadProgress.uploading]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Folder Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload to Folder (Optional)
        </label>
        <div className="flex items-center space-x-2">
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            disabled={uploadProgress.uploading}
          >
            <option value="" className="text-gray-900 bg-white">Root Directory</option>
            {folders.map((folder) => (
              <option key={folder.path} value={folder.path} className="text-gray-900 bg-white">
                {folder.path}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowNewFolderInput(!showNewFolderInput);
            }}
            disabled={uploadProgress.uploading}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            New Folder
          </button>
        </div>
        
        {showNewFolderInput && (
          <form 
            onSubmit={(e) => { e.preventDefault(); handleCreateFolder(); }} 
            onClick={(e) => e.stopPropagation()}
            className="mt-2 flex items-center space-x-2"
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
              disabled={uploadProgress.uploading}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="submit"
              disabled={uploadProgress.uploading || !newFolderName.trim()}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={(e) => e.stopPropagation()}
            >
              Create
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNewFolderInput(false);
                setNewFolderName('');
              }}
              disabled={uploadProgress.uploading}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

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

      {/* Selected File Display and Upload Button */}
      {selectedFile && !uploadProgress.uploading && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                <p className="text-xs text-blue-700">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedFile(null)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploadProgress.uploading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload Report
              </button>
            </div>
          </div>
        </div>
      )}

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
