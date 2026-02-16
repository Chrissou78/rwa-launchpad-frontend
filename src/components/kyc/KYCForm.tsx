// src/components/kyc/KYCForm.tsx
'use client';

import { useRef, ChangeEvent, DragEvent, useState } from 'react';
import Image from 'next/image';
import { DOCUMENT_TYPES, DocumentType, getDocumentCaptureGuide } from '@/lib/documentValidation';
import {
  KYCTier,
  TIER_CONFIGS,
  TIER_ORDER,
  formatCurrency,
  OcrProgress,
} from '@/types/kyc';
import { DocumentValidationResult } from '@/lib/documentValidation';

// ============================================
// SUB-COMPONENTS
// ============================================

interface TierSelectorProps {
  selectedTier: KYCTier;
  onSelect: (tier: KYCTier) => void;
  currentTier: KYCTier;
}

function TierSelector({ selectedTier, onSelect, currentTier }: TierSelectorProps) {
  const selectableTiers = TIER_ORDER.filter(t => t !== 'None');
  
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-white">Select Verification Tier</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {selectableTiers.map((tier) => {
          const config = TIER_CONFIGS[tier];
          const isSelected = selectedTier === tier;
          const isCurrent = currentTier === tier;
          
          return (
            <button
              key={tier}
              onClick={() => onSelect(tier)}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? `${config.borderColor} ${config.bgColor}`
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div className={`font-semibold ${isSelected ? config.color : 'text-white'}`}>
                {tier}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {formatCurrency(config.limit)}
              </div>
              {isCurrent && (
                <div className="text-xs text-green-400 mt-2">Current</div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Requirements */}
      <div className={`mt-4 p-4 rounded-lg ${TIER_CONFIGS[selectedTier].bgColor} border ${TIER_CONFIGS[selectedTier].borderColor}`}>
        <h4 className={`font-medium ${TIER_CONFIGS[selectedTier].color}`}>
          {selectedTier} Requirements
        </h4>
        <ul className="mt-2 space-y-1">
          {TIER_CONFIGS[selectedTier].requirements.map((req, i) => (
            <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {req}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface DocumentTypeSelectorProps {
  selected: DocumentType;
  onSelect: (type: DocumentType) => void;
}

function DocumentTypeSelector({ selected, onSelect }: DocumentTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-medium text-white">Document Type</h3>
      <div className="grid grid-cols-2 gap-3">
        {Object.values(DOCUMENT_TYPES).map((docType) => (
          <button
            key={docType.id}
            onClick={() => onSelect(docType.id)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selected === docType.id
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 bg-gray-800 hover:border-gray-600'
            }`}
          >
            <div className="font-medium text-white">{docType.label}</div>
            <div className="text-sm text-gray-400 mt-1">{docType.description}</div>
            {docType.requiresBack && (
              <div className="text-xs text-yellow-400 mt-2">Front & back required</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface DocumentCaptureCardProps {
  side: 'front' | 'back';
  image: string | null;
  documentType: DocumentType;
  onFileSelect: (file: File) => void;
  onWebcamClick: () => void;
  onRemove: () => void;
  onRotate: () => void;
}

function DocumentCaptureCard({
  side,
  image,
  documentType,
  onFileSelect,
  onWebcamClick,
  onRemove,
  onRotate,
}: DocumentCaptureCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const guide = getDocumentCaptureGuide(documentType);
  
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };
  
  if (image) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-800">
        <div className="aspect-[3/2] relative">
          <Image
            src={image}
            alt={`Document ${side}`}
            fill
            className="object-contain"
          />
        </div>
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={onRotate}
            className="p-2 bg-gray-900/80 rounded-lg hover:bg-gray-900 transition-colors"
            title="Rotate"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onRemove}
            className="p-2 bg-red-500/80 rounded-lg hover:bg-red-500 transition-colors"
            title="Remove"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500/80 rounded text-xs text-white font-medium">
          {side === 'front' ? 'Front' : 'Back'} captured
        </div>
      </div>
    );
  }
  
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-700 hover:border-gray-600'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        
        <h4 className="text-white font-medium mb-2">
          {side === 'front' ? 'Front of Document' : 'Back of Document'}
        </h4>
        
        <p className="text-sm text-gray-400 mb-4">
          Drag & drop or click to upload
        </p>
        
        <div className="flex justify-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            Choose File
          </button>
          <button
            onClick={onWebcamClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
          >
            Use Camera
          </button>
        </div>
      </div>
    </div>
  );
}

interface ValidationResultProps {
  result: DocumentValidationResult;
  onReset: () => void;
}

function ValidationResult({ result, onReset }: ValidationResultProps) {
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

      <p className="text-sm text-gray-400">
        {result.isValid 
          ? 'Your document has been successfully verified and matches the information provided.'
          : 'We could not fully verify your document. Please ensure the image is clear and the information matches exactly.'
        }
      </p>

      <button
        onClick={onReset}
        className="mt-4 w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
      >
        Re-validate Document
      </button>
    </div>
  );
}

interface OcrProgressBarProps {
  progress: OcrProgress;
}

function OcrProgressBar({ progress }: OcrProgressBarProps) {
  return (
    <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">{progress.stage}</span>
        <span className="text-sm text-gray-400">{progress.percent}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className="h-2 rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}

// ============================================
// MAIN FORM COMPONENT
// ============================================

interface Country {
  code: number;
  name: string;
  alpha2: string;
  alpha3: string;
}

interface KYCFormProps {
  // Personal info
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (v: string) => void;
  countryCode: number;
  setCountryCode: (v: number) => void;
  countries: Country[];
  
  // Document
  documentType: DocumentType;
  setDocumentType: (v: DocumentType) => void;
  documentNumber: string;
  setDocumentNumber: (v: string) => void;
  expiryDate: string;
  setExpiryDate: (v: string) => void;
  documentCapture: { front: string | null; back: string | null };
  documentRequiresBack: boolean;
  handleDocumentFileCapture: (file: File, side: 'front' | 'back') => void;
  handleRemoveImage: (side: 'front' | 'back') => void;
  handleRotateImage: (side: 'front' | 'back') => void;
  openWebcam: (target: 'front' | 'back' | 'selfie') => void;
  
  // Validation
  idValidation: DocumentValidationResult | null;
  isValidatingId: boolean;
  validationError: string | null;
  ocrProgress: OcrProgress | null;
  canValidate: boolean;
  handleValidateDocument: () => void;
  resetValidation: () => void;
  
  // Tier
  selectedTier: KYCTier;
  setSelectedTier: (v: KYCTier) => void;
  currentTier: KYCTier;
  
  // Other uploads
  selfieImage: string | null;
  setSelfieImage: (v: string | null) => void;
  proofOfAddress: string | null;
  setProofOfAddress: (v: string | null) => void;
  accreditedProof: string | null;
  setAccreditedProof: (v: string | null) => void;
  
  // Terms & Submit
  agreedToTerms: boolean;
  setAgreedToTerms: (v: boolean) => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  handleSubmit: () => void;
}

export function KYCForm(props: KYCFormProps) {
  const {
    fullName, setFullName,
    email, setEmail,
    dateOfBirth, setDateOfBirth,
    countryCode, setCountryCode,
    countries,
    documentType, setDocumentType,
    documentNumber, setDocumentNumber,
    expiryDate, setExpiryDate,
    documentCapture,
    documentRequiresBack,
    handleDocumentFileCapture,
    handleRemoveImage,
    handleRotateImage,
    openWebcam,
    idValidation,
    isValidatingId,
    validationError,
    ocrProgress,
    canValidate,
    handleValidateDocument,
    resetValidation,
    selectedTier, setSelectedTier,
    currentTier,
    selfieImage, setSelfieImage,
    proofOfAddress, setProofOfAddress,
    accreditedProof, setAccreditedProof,
    agreedToTerms, setAgreedToTerms,
    canSubmit,
    isSubmitting,
    submitError,
    handleSubmit,
  } = props;

  const selfieInputRef = useRef<HTMLInputElement>(null);
  const poaInputRef = useRef<HTMLInputElement>(null);
  const accreditedInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-8">
      {/* Tier Selection */}
      <section>
        <TierSelector
          selectedTier={selectedTier}
          onSelect={setSelectedTier}
          currentTier={currentTier}
        />
      </section>

      {/* Personal Information */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white">Personal Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="As shown on your document"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Date of Birth <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Country <span className="text-red-400">*</span>
            </label>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Select country...</option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Document Verification */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-white">Document Verification</h3>
        
        {/* Document Type */}
        <DocumentTypeSelector
          selected={documentType}
          onSelect={setDocumentType}
        />
        
        {/* Document Number & Expiry */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Document Number <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="As shown on document"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Expiry Date <span className="text-gray-500">(Optional)</span>
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {/* Document Capture */}
        <div className={`grid gap-4 ${documentRequiresBack ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
          <DocumentCaptureCard
            side="front"
            image={documentCapture.front}
            documentType={documentType}
            onFileSelect={(file) => handleDocumentFileCapture(file, 'front')}
            onWebcamClick={() => openWebcam('front')}
            onRemove={() => handleRemoveImage('front')}
            onRotate={() => handleRotateImage('front')}
          />
          
          {documentRequiresBack && (
            <DocumentCaptureCard
              side="back"
              image={documentCapture.back}
              documentType={documentType}
              onFileSelect={(file) => handleDocumentFileCapture(file, 'back')}
              onWebcamClick={() => openWebcam('back')}
              onRemove={() => handleRemoveImage('back')}
              onRotate={() => handleRotateImage('back')}
            />
          )}
        </div>
        
        {/* Validation Error */}
        {validationError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{validationError}</p>
          </div>
        )}
        
        {/* OCR Progress */}
        {ocrProgress && <OcrProgressBar progress={ocrProgress} />}
        
        {/* Validate Button */}
        {!idValidation && !isValidatingId && (
          <div>
            {canValidate ? (
              <button
                onClick={handleValidateDocument}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Validate Document
              </button>
            ) : (
              <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
                <p className="text-gray-400 text-sm">
                  Please fill in your name, date of birth, country, and upload document image(s) to validate.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Validating Spinner */}
        {isValidatingId && !ocrProgress && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-400">Validating document...</span>
          </div>
        )}
        
        {/* Validation Result */}
        {idValidation && (
          <ValidationResult result={idValidation} onReset={resetValidation} />
        )}
      </section>

      {/* Selfie - Required for Silver+ */}
      {(selectedTier === 'Silver' || selectedTier === 'Gold' || selectedTier === 'Diamond') && (
        <section className="space-y-4">
          <h3 className="text-lg font-medium text-white">Selfie Verification</h3>
          
          <input
            ref={selfieInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => setSelfieImage(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
            className="hidden"
          />
          
          {selfieImage ? (
            <div className="relative max-w-xs">
              <div className="aspect-square relative rounded-lg overflow-hidden border border-gray-700">
                <Image src={selfieImage} alt="Selfie" fill className="object-cover" />
              </div>
              <button
                onClick={() => setSelfieImage(null)}
                className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-lg hover:bg-red-500"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => selfieInputRef.current?.click()}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
              >
                Upload Selfie
              </button>
              <button
                onClick={() => openWebcam('selfie')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm"
              >
                Take Selfie
              </button>
            </div>
          )}
        </section>
      )}

      {/* Proof of Address - Required for Gold+ */}
      {(selectedTier === 'Gold' || selectedTier === 'Diamond') && (
        <section className="space-y-4">
          <h3 className="text-lg font-medium text-white">Proof of Address</h3>
          <p className="text-sm text-gray-400">
            Upload a utility bill, bank statement, or government letter dated within the last 3 months.
          </p>
          
          <input
            ref={poaInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => setProofOfAddress(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
            className="hidden"
          />
          
          {proofOfAddress ? (
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-400 text-sm">Document uploaded</span>
              <button
                onClick={() => setProofOfAddress(null)}
                className="ml-auto text-gray-400 hover:text-white text-sm"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => poaInputRef.current?.click()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
            >
              Upload Document
            </button>
          )}
        </section>
      )}

      {/* Accredited Investor - Required for Diamond */}
      {selectedTier === 'Diamond' && (
        <section className="space-y-4">
          <h3 className="text-lg font-medium text-white">Accredited Investor Verification</h3>
          <p className="text-sm text-gray-400">
            Upload documentation proving accredited investor status (e.g., CPA letter, brokerage statement).
          </p>
          
          <input
            ref={accreditedInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => setAccreditedProof(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
            className="hidden"
          />
          
          {accreditedProof ? (
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-green-400 text-sm">Document uploaded</span>
              <button
                onClick={() => setAccreditedProof(null)}
                className="ml-auto text-gray-400 hover:text-white text-sm"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              onClick={() => accreditedInputRef.current?.click()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
            >
              Upload Document
            </button>
          )}
        </section>
      )}

      {/* Terms & Submit */}
      <section className="space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300">
            I confirm that all information provided is accurate and I agree to the{' '}
            <a href="/terms" className="text-blue-400 hover:underline">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</a>.
          </span>
        </label>
        
        {submitError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{submitError}</p>
          </div>
        )}
        
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className={`w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors flex items-center justify-center gap-2 ${
            canSubmit && !isSubmitting
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Submitting...
            </>
          ) : (
            <>
              Submit KYC Application
            </>
          )}
        </button>
      </section>
    </div>
  );
}
