// src/components/admin/PendingKYCRequests.tsx
'use client';

import { useState, useEffect } from 'react';

interface DocumentUrls {
  idDocumentFrontUrl: string | null;
  idDocumentBackUrl: string | null;
  selfieUrl: string | null;
  addressProofUrl: string | null;
  accreditedProofUrl: string | null;
}

interface DocumentInfo {
  hasIdDocument: boolean;
  hasIdDocumentBack: boolean;
  hasSelfie: boolean;
  hasAddressProof: boolean;
  hasAccreditedProof: boolean;
}

interface ValidationScores {
  faceScore?: number;
  idValidationConfidence?: number;
  idValidationPassed?: boolean;
  livenessScore?: number;
  livenessPassed?: boolean;
}

interface PersonalInfo {
  fullName?: string;
  email?: string;
  dateOfBirth?: string;
  countryCode?: number;
  documentType?: string;
  documentNumber?: string;
  expiryDate?: string;
}

interface KYCSubmission {
  id: string;
  walletAddress: string;
  currentLevel: number;
  requestedLevel: number;
  submittedAt: number;
  status: string;
  isUpgrade: boolean;
  personalInfo?: PersonalInfo;
  documents: DocumentInfo;
  documentUrls: DocumentUrls;
  validationScores: ValidationScores;
}

const TIER_NAMES = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'];
const TIER_COLORS: Record<string, string> = {
  'None': 'bg-gray-500',
  'Bronze': 'bg-amber-600',
  'Silver': 'bg-gray-400',
  'Gold': 'bg-yellow-500',
  'Diamond': 'bg-purple-500'
};

export default function PendingKYCRequests() {
  const [activeTab, setActiveTab] = useState<'submissions' | 'upgrades'>('submissions');
  const [pendingSubmissions, setPendingSubmissions] = useState<KYCSubmission[]>([]);
  const [pendingUpgrades, setPendingUpgrades] = useState<KYCSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentModal, setDocumentModal] = useState<{ url: string; type: string; name: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/kyc/admin/pending');
      const data = await response.json();
      
      if (data.success) {
        setPendingSubmissions(data.pendingSubmissions || []);
        setPendingUpgrades(data.pendingUpgrades || []);
      } else {
        setError(data.error || 'Failed to load pending requests');
      }
    } catch (err) {
      setError('Failed to fetch pending requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleApprove = async (submission: KYCSubmission) => {
    if (!confirm(`Approve ${submission.isUpgrade ? 'upgrade' : 'KYC'} for ${submission.walletAddress}?`)) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/kyc/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: submission.walletAddress,
          requestedLevel: submission.requestedLevel,
          isUpgrade: submission.isUpgrade
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Approved successfully!');
        setSelectedSubmission(null);
        fetchPendingRequests();
      } else {
        alert(`Failed to approve: ${result.error}`);
      }
    } catch (err) {
      alert('Error processing approval');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (submission: KYCSubmission, reason: string) => {
    if (!confirm(`Reject ${submission.isUpgrade ? 'upgrade' : 'KYC'} for ${submission.walletAddress}?`)) return;
    
    setProcessing(true);
    try {
      const response = await fetch('/api/kyc/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: submission.walletAddress,
          isUpgrade: submission.isUpgrade,
          reason
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Rejected successfully!');
        setSelectedSubmission(null);
        fetchPendingRequests();
      } else {
        alert(`Failed to reject: ${result.error}`);
      }
    } catch (err) {
      alert('Error processing rejection');
    } finally {
      setProcessing(false);
    }
  };

  const openDocumentModal = (url: string, type: string, name: string) => {
    setDocumentModal({ url, type, name });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderDocumentPreview = (url: string | null, label: string, type: string) => {
    if (!url) return null;
    
    const isPDF = type.toLowerCase().includes('proof') || type.toLowerCase().includes('accredited');
    
    return (
      <div className="border rounded-lg p-3 bg-gray-50">
        <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
        <div 
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => openDocumentModal(url, type, label)}
        >
          {isPDF ? (
            <div className="w-full h-32 bg-gray-200 rounded flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-600">PDF Document</span>
              </div>
            </div>
          ) : (
            <img 
              src={url} 
              alt={label}
              className="w-full h-32 object-cover rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-document.png';
              }}
            />
          )}
        </div>
        <button
          onClick={() => window.open(url, '_blank')}
          className="mt-2 text-xs text-purple-600 hover:text-purple-800"
        >
          Open in new tab
        </button>
      </div>
    );
  };

  const renderSubmissionCard = (submission: KYCSubmission) => {
    const currentTier = TIER_NAMES[submission.currentLevel] || 'None';
    const requestedTier = TIER_NAMES[submission.requestedLevel] || 'Unknown';
    
    return (
      <div 
        key={submission.id}
        className={`border rounded-lg p-4 cursor-pointer transition-all ${
          selectedSubmission?.id === submission.id 
            ? 'border-purple-500 bg-purple-50' 
            : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
        onClick={() => setSelectedSubmission(submission)}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-mono text-sm font-medium">{shortenAddress(submission.walletAddress)}</p>
            <p className="text-xs text-gray-500">{formatDate(submission.submittedAt)}</p>
          </div>
          <span className={`px-2 py-1 rounded text-xs text-white ${
            submission.status === 'Pending' ? 'bg-yellow-500' : 
            submission.status === 'Approved' ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {submission.status}
          </span>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2 py-1 rounded text-xs text-white ${TIER_COLORS[currentTier]}`}>
            {currentTier}
          </span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          <span className={`px-2 py-1 rounded text-xs text-white ${TIER_COLORS[requestedTier]}`}>
            {requestedTier}
          </span>
        </div>
        
        {submission.personalInfo?.fullName && (
          <p className="text-sm text-gray-700">{submission.personalInfo.fullName}</p>
        )}
        
        <div className="mt-2 flex gap-1 flex-wrap">
          {submission.documents.hasIdDocument && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">ID</span>
          )}
          {submission.documents.hasSelfie && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Selfie</span>
          )}
          {submission.documents.hasAddressProof && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">Address</span>
          )}
          {submission.documents.hasAccreditedProof && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">Accredited</span>
          )}
        </div>
        
        {submission.validationScores && (
          <div className="mt-2 text-xs text-gray-500">
            {submission.validationScores.idValidationConfidence !== undefined && (
              <span className="mr-2">ID: {submission.validationScores.idValidationConfidence}%</span>
            )}
            {submission.validationScores.faceScore !== undefined && (
              <span className="mr-2">Face: {submission.validationScores.faceScore}%</span>
            )}
            {submission.validationScores.livenessScore !== undefined && (
              <span>Liveness: {submission.validationScores.livenessScore}%</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDetailView = () => {
    if (!selectedSubmission) return null;
    
    const currentTier = TIER_NAMES[selectedSubmission.currentLevel] || 'None';
    const requestedTier = TIER_NAMES[selectedSubmission.requestedLevel] || 'Unknown';
    
    return (
      <div className="border rounded-lg bg-white p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-semibold">
              {selectedSubmission.isUpgrade ? 'Upgrade Request' : 'New Submission'}
            </h3>
            <p className="font-mono text-sm text-gray-600">{selectedSubmission.walletAddress}</p>
          </div>
          <button 
            onClick={() => setSelectedSubmission(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Tier Change */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Tier Change</p>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded text-white font-medium ${TIER_COLORS[currentTier]}`}>
              {currentTier}
            </span>
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className={`px-3 py-1.5 rounded text-white font-medium ${TIER_COLORS[requestedTier]}`}>
              {requestedTier}
            </span>
          </div>
        </div>
        
        {/* Personal Info */}
        {selectedSubmission.personalInfo && (
          <div className="mb-6">
            <h4 className="font-medium mb-3">Personal Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {selectedSubmission.personalInfo.fullName && (
                <div>
                  <p className="text-gray-500">Full Name</p>
                  <p className="font-medium">{selectedSubmission.personalInfo.fullName}</p>
                </div>
              )}
              {selectedSubmission.personalInfo.email && (
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium">{selectedSubmission.personalInfo.email}</p>
                </div>
              )}
              {selectedSubmission.personalInfo.dateOfBirth && (
                <div>
                  <p className="text-gray-500">Date of Birth</p>
                  <p className="font-medium">{selectedSubmission.personalInfo.dateOfBirth}</p>
                </div>
              )}
              {selectedSubmission.personalInfo.documentType && (
                <div>
                  <p className="text-gray-500">Document Type</p>
                  <p className="font-medium">{selectedSubmission.personalInfo.documentType}</p>
                </div>
              )}
              {selectedSubmission.personalInfo.documentNumber && (
                <div>
                  <p className="text-gray-500">Document Number</p>
                  <p className="font-medium">{selectedSubmission.personalInfo.documentNumber}</p>
                </div>
              )}
              {selectedSubmission.personalInfo.expiryDate && (
                <div>
                  <p className="text-gray-500">Expiry Date</p>
                  <p className="font-medium">{selectedSubmission.personalInfo.expiryDate}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Validation Scores */}
        {selectedSubmission.validationScores && (
          <div className="mb-6">
            <h4 className="font-medium mb-3">Validation Results</h4>
            <div className="grid grid-cols-3 gap-4">
              {selectedSubmission.validationScores.idValidationConfidence !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {selectedSubmission.validationScores.idValidationConfidence}%
                  </p>
                  <p className="text-xs text-gray-500">ID Confidence</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                    selectedSubmission.validationScores.idValidationPassed 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedSubmission.validationScores.idValidationPassed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              )}
              {selectedSubmission.validationScores.faceScore !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {selectedSubmission.validationScores.faceScore}%
                  </p>
                  <p className="text-xs text-gray-500">Face Score</p>
                </div>
              )}
              {selectedSubmission.validationScores.livenessScore !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {selectedSubmission.validationScores.livenessScore}%
                  </p>
                  <p className="text-xs text-gray-500">Liveness</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                    selectedSubmission.validationScores.livenessPassed 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedSubmission.validationScores.livenessPassed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Documents */}
        <div className="mb-6">
          <h4 className="font-medium mb-3">Submitted Documents</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {renderDocumentPreview(
              selectedSubmission.documentUrls.idDocumentFrontUrl,
              'ID Document (Front)',
              'idDocumentFront'
            )}
            {renderDocumentPreview(
              selectedSubmission.documentUrls.idDocumentBackUrl,
              'ID Document (Back)',
              'idDocumentBack'
            )}
            {renderDocumentPreview(
              selectedSubmission.documentUrls.selfieUrl,
              'Selfie',
              'selfie'
            )}
            {renderDocumentPreview(
              selectedSubmission.documentUrls.addressProofUrl,
              'Proof of Address',
              'addressProof'
            )}
            {renderDocumentPreview(
              selectedSubmission.documentUrls.accreditedProofUrl,
              'Accredited Investor Proof',
              'accreditedProof'
            )}
          </div>
          
          {!selectedSubmission.documents.hasIdDocument && 
           !selectedSubmission.documents.hasSelfie && 
           !selectedSubmission.documents.hasAddressProof && 
           !selectedSubmission.documents.hasAccreditedProof && (
            <p className="text-gray-500 text-sm">No documents submitted</p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={() => handleApprove(selectedSubmission)}
            disabled={processing}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={() => {
              const reason = prompt('Enter rejection reason:');
              if (reason) handleReject(selectedSubmission, reason);
            }}
            disabled={processing}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processing ? 'Processing...' : 'Reject'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={fetchPendingRequests}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const currentList = activeTab === 'submissions' ? pendingSubmissions : pendingUpgrades;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Pending KYC Requests</h2>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'submissions'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          New Submissions ({pendingSubmissions.length})
        </button>
        <button
          onClick={() => setActiveTab('upgrades')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'upgrades'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Upgrade Requests ({pendingUpgrades.length})
        </button>
      </div>
      
      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="space-y-4">
          {currentList.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No pending {activeTab === 'submissions' ? 'submissions' : 'upgrade requests'}
            </p>
          ) : (
            currentList.map(renderSubmissionCard)
          )}
        </div>
        
        {/* Detail View */}
        <div>
          {selectedSubmission ? (
            renderDetailView()
          ) : (
            <div className="border rounded-lg p-8 text-center text-gray-500">
              Select a submission to view details
            </div>
          )}
        </div>
      </div>
      
      {/* Document Modal */}
      {documentModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setDocumentModal(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-medium">{documentModal.name}</h3>
              <div className="flex gap-2">
                <a
                  href={documentModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                >
                  Open in new tab
                </a>
                <button 
                  onClick={() => setDocumentModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4">
              {documentModal.type.toLowerCase().includes('proof') || documentModal.type.toLowerCase().includes('accredited') ? (
                <iframe
                  src={documentModal.url}
                  className="w-full h-[70vh]"
                  title={documentModal.name}
                />
              ) : (
                <img 
                  src={documentModal.url} 
                  alt={documentModal.name}
                  className="max-w-full h-auto"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
