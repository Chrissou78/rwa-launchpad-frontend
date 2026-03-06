// src/components/kyc/KYCComponents.tsx
'use client';

import { useState, useRef, useCallback, useEffect, DragEvent } from 'react';
import { 
  DOCUMENT_TYPES, 
  DocumentType, 
  DocumentValidationResult,
  getDocumentCaptureGuide,
} from '@/lib/documentValidation';
import { 
  OCRProgress, 
  ValidationError, 
  isMobileDevice,
  getPreferredFacingMode,
} from '@/types/kyc';

// ======================================
// OCR PROGRESS BAR COMPONENT
// ======================================

interface OCRProgressBarProps {
  progress: OCRProgress;
}

export function OCRProgressBar({ progress }: OCRProgressBarProps) {
  const getStatusColor = () => {
    switch (progress.status) {
      case 'error': return 'bg-red-500';
      case 'complete': return 'bg-green-500';
      default: return 'bg-purple-500';
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'loading':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case 'preprocessing':
        return (
          <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'recognizing':
        return (
          <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'extracting':
        return (
          <svg className="w-4 h-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'validating':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'complete':
        return (
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (progress.status === 'idle') return null;

  return (
    <div className="bg-gray-900/80 rounded-lg p-3 mt-3">
      <div className="flex items-center gap-3 mb-2">
        {getStatusIcon()}
        <span className="text-sm text-gray-300">{progress.message}</span>
        <span className="text-xs text-gray-500 ml-auto">{progress.progress}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${progress.progress}%` }}
        />
      </div>
    </div>
  );
}

// ======================================
// ERROR DISPLAY COMPONENT
// ======================================

interface ErrorDisplayProps {
  error: ValidationError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  return (
    <div className={`rounded-lg p-4 ${error.recoverable ? 'bg-yellow-900/30 border border-yellow-500/50' : 'bg-red-900/30 border border-red-500/50'}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${error.recoverable ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
          {error.recoverable ? (
            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className={`font-medium ${error.recoverable ? 'text-yellow-400' : 'text-red-400'}`}>
            {error.message}
          </p>
          {error.suggestion && (
            <p className="text-gray-400 text-sm mt-1">{error.suggestion}</p>
          )}
          <div className="flex gap-2 mt-3">
            {error.recoverable && onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ======================================
// DRAG & DROP WRAPPER COMPONENT
// ======================================

interface DragDropZoneProps {
  onFileDrop: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function DragDropZone({ onFileDrop, accept = 'image/*', maxSize = 10 * 1024 * 1024, disabled = false, children, className = '' }: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
      setDragError(null);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      const acceptTypes = accept.split(',').map(t => t.trim());
      const isValidType = acceptTypes.some(type => {
        if (type === '*/*') return true;
        if (type.endsWith('/*')) {
          const category = type.replace('/*', '');
          return file.type.startsWith(category);
        }
        return file.type === type || file.name.toLowerCase().endsWith(type.replace('*', ''));
      });

      if (!isValidType) {
        setDragError('Invalid file type. Please upload an image or PDF.');
        setTimeout(() => setDragError(null), 3000);
        return;
      }

      if (file.size > maxSize) {
        setDragError(`File too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.`);
        setTimeout(() => setDragError(null), 3000);
        return;
      }

      onFileDrop(file);
    }
  }, [accept, maxSize, disabled, onFileDrop]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative ${className} ${isDragging ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : ''}`}
    >
      {children}
      
      {isDragging && (
        <div className="absolute inset-0 bg-purple-500/20 border-2 border-dashed border-purple-500 rounded-xl flex items-center justify-center z-10">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto text-purple-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-purple-400 font-medium">Drop file here</p>
          </div>
        </div>
      )}

      {dragError && (
        <div className="absolute top-2 left-2 right-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium z-20 animate-pulse">
          {dragError}
        </div>
      )}
    </div>
  );
}

// ======================================
// DOCUMENT TYPE SELECTOR COMPONENT
// ======================================

interface DocumentTypeSelectorProps {
  selectedType: DocumentType;
  onSelect: (type: DocumentType) => void;
}

export function DocumentTypeSelector({ selectedType, onSelect }: DocumentTypeSelectorProps) {
  return (
    <div className="mb-6">
      <label className="block text-gray-400 text-sm mb-3">Document Type</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(Object.entries(DOCUMENT_TYPES) as [DocumentType, typeof DOCUMENT_TYPES[DocumentType]][]).map(([type, config]) => (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selectedType === type
                ? 'border-purple-500 bg-purple-900/20'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-10 h-7 rounded flex items-center justify-center ${
                selectedType === type ? 'bg-purple-500' : 'bg-gray-700'
              }`}>
                {type === 'passport' ? (
                  <svg className={`w-5 h-5 ${selectedType === type ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                ) : (
                  <svg className={`w-5 h-5 ${selectedType === type ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium text-sm ${selectedType === type ? 'text-purple-400' : 'text-white'}`}>
                  {config.label}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {config.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    selectedType === type 
                      ? 'bg-purple-500/20 text-purple-300' 
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {config.requiresBack ? 'Front + Back' : 'Front only'}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ======================================
// DOCUMENT CAPTURE CARD COMPONENT
// ======================================

interface DocumentCaptureCardProps {
  side: 'front' | 'back';
  preview: string | null;
  documentType: DocumentType;
  isRequired: boolean;
  isValidating: boolean;
  ocrProgress: OCRProgress;
  validationResult: DocumentValidationResult | null;
  validationError: ValidationError | null;
  onFileSelect: (file: File) => void;
  onWebcamCapture: () => void;
  onRotate: () => void;
  onRemove: () => void;
  onRetry: () => void;
}

export function DocumentCaptureCard({
  side,
  preview,
  documentType,
  isRequired,
  isValidating,
  ocrProgress,
  validationResult,
  validationError,
  onFileSelect,
  onWebcamCapture,
  onRotate,
  onRemove,
  onRetry,
}: DocumentCaptureCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = DOCUMENT_TYPES[documentType];
  const isMobile = isMobileDevice();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getBorderColor = () => {
    if (!preview) return 'border-gray-600';
    if (isValidating) return 'border-yellow-500';
    if (validationError) return 'border-red-500';
    if (validationResult?.isValid && validationResult.confidence >= 70) return 'border-green-500';
    if (validationResult?.isValid && validationResult.confidence >= 50) return 'border-yellow-500';
    if (validationResult && !validationResult.isValid) return 'border-red-500';
    return 'border-gray-600';
  };

  return (
    <DragDropZone
      onFileDrop={onFileSelect}
      accept="image/*,.pdf"
      disabled={!!preview}
      className={`rounded-xl p-4 border-2 ${preview ? getBorderColor() : 'border-gray-700 border-dashed'} ${
        !isRequired && !preview ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-white text-sm">
          {side === 'front' ? 'Front Side' : 'Back Side'}
          {isRequired && <span className="text-red-400 ml-1">*</span>}
          {!isRequired && <span className="text-gray-500 text-xs ml-2">(Optional)</span>}
        </h4>
        {preview && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRotate}
              className="p-1.5 text-gray-400 hover:text-white rounded transition-colors"
              title="Rotate image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-red-400 hover:text-red-300 rounded transition-colors"
              title="Remove image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {preview ? (
        <div className="relative">
          <div className={`aspect-[3/2] rounded-lg overflow-hidden bg-gray-900 border ${getBorderColor()}`}>
            <img
              src={preview}
              alt={`${side} of document`}
              className="w-full h-full object-contain"
            />
            
            {isValidating && ocrProgress.status !== 'idle' && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center px-4 w-full max-w-xs">
                  <svg className="w-10 h-10 animate-spin text-purple-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-white text-sm mb-2">{ocrProgress.message}</p>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${ocrProgress.progress}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-1">{ocrProgress.progress}%</p>
                </div>
              </div>
            )}
            
            {!isValidating && validationResult && (
              <div className={`absolute top-2 right-2 p-1.5 rounded-full ${
                validationResult.isValid && validationResult.confidence >= 70 ? 'bg-green-500' :
                validationResult.isValid && validationResult.confidence >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}>
                {validationResult.isValid && validationResult.confidence >= 50 ? (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            )}

            {!isValidating && validationError && (
              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
          </div>

          {validationError && (
            <div className="mt-3">
              <ErrorDisplay 
                error={validationError}
                onRetry={validationError.recoverable ? onRetry : undefined}
                onDismiss={onRemove}
              />
            </div>
          )}

          {isValidating && <OCRProgressBar progress={ocrProgress} />}
        </div>
      ) : (
        <div 
          className="aspect-[3/2] bg-gray-800 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-700/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg className="w-10 h-10 text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-400 text-sm">
            {isMobile ? 'Tap to upload' : 'Click or drag to upload'}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {isMobile ? 'or use camera' : 'PNG, JPG, PDF (max 10MB)'}
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        capture={isMobile ? 'environment' : undefined}
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2.5 text-xs font-medium border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {isMobile ? 'Gallery' : 'Upload'}
          </button>
          <button
            type="button"
            onClick={onWebcamCapture}
            className="px-3 py-2.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Camera
          </button>
        </div>
      )}
    </DragDropZone>
  );
}

// ======================================
// VALIDATION RESULT COMPONENT
// ======================================

interface ValidationResultDisplayProps {
  result: DocumentValidationResult;
  documentNumber?: string;
  onReset: () => void;
}

export function ValidationResultDisplay({ result, documentNumber, onReset }: ValidationResultDisplayProps) {
  return (
    <div className={`mt-4 p-4 rounded-lg border ${
      result.isValid 
        ? 'bg-green-500/10 border-green-500/30' 
        : 'bg-yellow-500/10 border-yellow-500/30'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {result.isValid ? (
            <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <h4 className="font-medium text-white">
            {result.isValid ? 'Document Verified' : 'Manual Review Required'}
          </h4>
        </div>
        <span className={`text-lg font-bold ${
          result.confidence >= 70 ? 'text-green-400' :
          result.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {result.confidence}%
        </span>
      </div>

      {/* Confidence Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${
            result.confidence >= 70 ? 'bg-green-500' :
            result.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${result.confidence}%` }}
        />
      </div>

      {/* Simple status message */}
      <p className="text-sm text-gray-400">
        {result.isValid 
          ? 'Your document has been successfully verified and matches the information provided.'
          : 'We could not fully verify your document. Please ensure the image is clear and the information matches your document exactly.'
        }
      </p>

      {/* Re-validate Button */}
      <button
        onClick={onReset}
        className="mt-4 w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
      >
        Re-validate Document
      </button>
    </div>
  );
}

// ======================================
// MOBILE CAMERA COMPONENT
// ======================================

interface MobileCameraProps {
  documentType: DocumentType;
  side: 'front' | 'back';
  forSelfie?: boolean;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export function MobileCamera({ documentType, side, forSelfie = false, onCapture, onClose }: MobileCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(getPreferredFacingMode(forSelfie));
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const guide = getDocumentCaptureGuide(documentType);
  const config = DOCUMENT_TYPES[documentType];
  const isMobile = isMobileDevice();

  useEffect(() => {
    async function checkCameras() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (err) {
        console.error('Error checking cameras:', err);
      }
    }
    checkCameras();
  }, []);

  useEffect(() => {
    async function startCamera() {
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: isMobile ? 1280 : 1920 },
            height: { ideal: isMobile ? 720 : 1080 },
          },
          audio: false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(mediaStream);
        
        const videoTrack = mediaStream.getVideoTracks()[0];
        const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(!!capabilities?.torch);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsReady(true);
          };
        }

        setError(null);
      } catch (err: any) {
        console.error('Camera error:', err);
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permissions in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another application.');
        } else {
          setError('Unable to access camera. Please try again or use file upload.');
        }
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const toggleTorch = useCallback(async () => {
    if (!stream || !torchSupported) return;
    
    const videoTrack = stream.getVideoTracks()[0];
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: !torchEnabled } as MediaTrackConstraintSet]
      });
      setTorchEnabled(!torchEnabled);
    } catch (err) {
      console.error('Torch toggle error:', err);
    }
  }, [stream, torchSupported, torchEnabled]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setIsReady(false);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;
    
    setCountdown(3);
    
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    setCountdown(null);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    const videoAspect = video.videoWidth / video.videoHeight;
    const guideAspect = forSelfie ? 1 : (guide.aspectRatio || 1.5);
    
    let cropWidth: number, cropHeight: number, cropX: number, cropY: number;
    
    if (videoAspect > guideAspect) {
      cropHeight = video.videoHeight * 0.75;
      cropWidth = cropHeight * guideAspect;
      cropX = (video.videoWidth - cropWidth) / 2;
      cropY = (video.videoHeight - cropHeight) / 2;
    } else {
      cropWidth = video.videoWidth * 0.85;
      cropHeight = cropWidth / guideAspect;
      cropX = (video.videoWidth - cropWidth) / 2;
      cropY = (video.videoHeight - cropHeight) / 2;
    }
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    if (forSelfie && facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(
      video,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, canvas.width, canvas.height
    );
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
  }, [isReady, guide, forSelfie, facingMode]);

  const handleConfirm = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
  }, []);

  const handleClose = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  }, [stream, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 flex items-center justify-between safe-area-top">
        <button
          onClick={handleClose}
          className="p-2 text-white hover:text-gray-300 rounded-full"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h3 className="text-white font-medium text-center flex-1">
          {forSelfie ? 'Take Selfie' : `${config.label} - ${side === 'front' ? 'Front' : 'Back'}`}
        </h3>
        <div className="w-10" />
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6 max-w-sm">
              <svg className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-white text-lg mb-2">Camera Error</p>
              <p className="text-gray-400 mb-6">{error}</p>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-500 transition-colors"
              >
                Use File Upload Instead
              </button>
            </div>
          </div>
        ) : capturedImage ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' && !forSelfie ? '' : facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
            
            {/* Guide Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {forSelfie ? (
                <div 
                  className="border-4 border-white border-dashed rounded-full opacity-60"
                  style={{
                    width: '70vmin',
                    height: '70vmin',
                    maxWidth: '300px',
                    maxHeight: '300px',
                  }}
                />
              ) : (
                <div 
                  className="border-4 border-white border-dashed rounded-lg opacity-60"
                  style={{
                    width: '85%',
                    aspectRatio: guide.aspectRatio || 1.5,
                    maxHeight: '75%',
                  }}
                />
              )}
            </div>

            {/* Countdown */}
            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <span className="text-white text-8xl font-bold">{countdown}</span>
                  <p className="text-white text-lg mt-4">Hold still...</p>
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {!isReady && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center">
                  <svg className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-white">Starting camera...</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 safe-area-bottom">
        {capturedImage ? (
          <div className="p-4 flex items-center justify-center gap-4">
            <button
              onClick={handleRetake}
              className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Use Photo
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between max-w-md mx-auto">
              <div className="w-12">
                {torchSupported && (
                  <button
                    onClick={toggleTorch}
                    className={`p-3 rounded-full transition-colors ${torchEnabled ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </button>
                )}
              </div>

              <button
                onClick={handleCapture}
                disabled={!isReady || countdown !== null}
                className="w-20 h-20 rounded-full bg-white disabled:bg-gray-500 flex items-center justify-center hover:bg-gray-200 transition-colors shadow-lg"
              >
                <div className="w-16 h-16 rounded-full border-4 border-gray-900" />
              </button>

              <div className="w-12">
                {hasMultipleCameras && (
                  <button
                    onClick={switchCamera}
                    className="p-3 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {!capturedImage && (
          <div className="px-4 pb-4">
            <div className="bg-gray-800 rounded-lg p-3 max-w-md mx-auto">
              <p className="text-gray-400 text-xs text-center">
                {forSelfie 
                  ? 'Look directly at the camera • Good lighting • No glasses'
                  : 'Good lighting • Hold steady • Avoid glare • Keep flat'
                }
              </p>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
