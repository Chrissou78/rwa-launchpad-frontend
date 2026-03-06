// src/components/trade/DocumentUploader.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  X,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { TRADE_DOCUMENTS, TradeDocumentType, DealStage } from '@/lib/trade/constants';

interface DocumentUploaderProps {
  dealId: string;
  dealStage: DealStage;
  onUploadComplete?: (document: any) => void;
  onClose?: () => void;
}

export default function DocumentUploader({
  dealId,
  dealStage,
  onUploadComplete,
  onClose,
}: DocumentUploaderProps) {
  const [selectedType, setSelectedType] = useState<string>('');
  const [documentName, setDocumentName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get relevant document types for current stage
  const relevantDocTypes = TRADE_DOCUMENTS.filter(
    (doc) => doc.requiredFor.includes(dealStage) || doc.requiredFor.length === 0
  );

  const selectedDocType = TRADE_DOCUMENTS.find((d) => d.id === selectedType);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      
      // Validate file type if document type is selected
      if (selectedDocType) {
        const isValidType = selectedDocType.validationRules.allowedTypes.some(
          (type) => uploadedFile.type === type || uploadedFile.name.endsWith(type.split('/')[1])
        );
        
        if (!isValidType) {
          setError(`Invalid file type. Allowed: ${selectedDocType.validationRules.allowedTypes.join(', ')}`);
          return;
        }

        const maxSizeBytes = selectedDocType.validationRules.maxSize * 1024 * 1024;
        if (uploadedFile.size > maxSizeBytes) {
          setError(`File too large. Maximum size: ${selectedDocType.validationRules.maxSize}MB`);
          return;
        }
      }

      setFile(uploadedFile);
      setError(null);
      
      // Auto-set document name if not already set
      if (!documentName) {
        setDocumentName(uploadedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [selectedDocType, documentName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: selectedDocType
      ? selectedDocType.validationRules.allowedTypes.reduce((acc, type) => {
          acc[type] = [];
          return acc;
        }, {} as Record<string, string[]>)
      : {
          'application/pdf': ['.pdf'],
          'image/jpeg': ['.jpg', '.jpeg'],
          'image/png': ['.png'],
          'application/msword': ['.doc'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        },
  });

  const handleUpload = async () => {
    if (!file || !selectedType) {
      setError('Please select a document type and file');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dealId', dealId);
      formData.append('documentType', selectedType);
      formData.append('name', documentName || file.name);

      const response = await fetch('/api/trade/documents', {
        method: 'POST',
        headers: {
          'x-wallet-address': localStorage.getItem('walletAddress') || '',
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const document = await response.json();
      setUploadProgress(100);

      if (onUploadComplete) {
        onUploadComplete(document);
      }

      // Reset form
      setFile(null);
      setSelectedType('');
      setDocumentName('');
      
      if (onClose) {
        setTimeout(onClose, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Upload Document</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Document Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Document Type <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white appearance-none cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Select document type...</option>
              <optgroup label="Required for Current Stage">
                {relevantDocTypes
                  .filter((d) => d.requiredFor.includes(dealStage))
                  .map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Other Documents">
                {TRADE_DOCUMENTS.filter(
                  (d) => !d.requiredFor.includes(dealStage)
                ).map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
          </div>
          {selectedDocType && (
            <p className="text-xs text-gray-500 mt-1">{selectedDocType.description}</p>
          )}
        </div>

        {/* Document Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Document Name
          </label>
          <input
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Enter a name for this document"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* File Dropzone */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            File <span className="text-red-400">*</span>
          </label>
          
          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-300 mb-1">
                {isDragActive
                  ? 'Drop the file here'
                  : 'Drag & drop a file here, or click to select'}
              </p>
              <p className="text-xs text-gray-500">
                {selectedDocType
                  ? `Allowed: ${selectedDocType.validationRules.allowedTypes.join(', ')} (max ${selectedDocType.validationRules.maxSize}MB)`
                  : 'PDF, DOC, DOCX, JPG, PNG (max 20MB)'}
              </p>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mr-3">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Validation Requirements */}
        {selectedDocType && (
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
            <p className="text-sm text-gray-400 mb-2">Requirements:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• Maximum file size: {selectedDocType.validationRules.maxSize}MB</li>
              <li>• Allowed formats: {selectedDocType.validationRules.allowedTypes.map(t => t.split('/')[1]).join(', ')}</li>
              {selectedDocType.validationRules.requiresSignature && (
                <li className="text-yellow-500">• This document requires a signature</li>
              )}
              {selectedDocType.validationRules.requiresNotarization && (
                <li className="text-yellow-500">• This document requires notarization</li>
              )}
              {selectedDocType.validationRules.expiryDays && (
                <li>• Valid for {selectedDocType.validationRules.expiryDays} days from issue date</li>
              )}
            </ul>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              {uploadProgress < 100 ? 'Uploading...' : 'Upload complete!'}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {onClose && (
            <button
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleUpload}
            disabled={!file || !selectedType || isUploading}
            className="flex-1 px-4 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : uploadProgress === 100 ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                Uploaded!
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Upload Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
