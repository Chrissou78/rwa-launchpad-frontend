'use client'

import { ProjectData } from '@/app/create/page'

interface Props {
  data: ProjectData
  uploadedUrls: { logo?: string; banner?: string; pitchDeck?: string; legalDocs: string[] }
  onNext: () => void
  onBack: () => void
}

export function StepReview({ data, uploadedUrls, onNext, onBack }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6 text-white">Review Your Project</h2>
      <p className="text-gray-400 mb-6">Please review all information before deploying to the blockchain.</p>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span>📋</span> Basic Information
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Project Name</dt>
            <dd className="font-medium text-white">{data.projectName}</dd>
            <dt className="text-gray-500">Category</dt>
            <dd className="text-gray-300">{data.category}</dd>
            <dt className="text-gray-500">Website</dt>
            <dd className="text-gray-300">{data.website || 'Not provided'}</dd>
          </dl>
          <div className="mt-3">
            <dt className="text-gray-500 text-sm">Description</dt>
            <dd className="mt-1 text-sm text-gray-300">{data.description}</dd>
          </div>
        </div>

        {/* Financials */}
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span>💰</span> Financials
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Amount to Raise</dt>
            <dd className="font-medium text-green-400">${data.amountToRaise.toLocaleString()}</dd>
            <dt className="text-gray-500">Investor Share</dt>
            <dd className="text-gray-300">{data.investorSharePercent}%</dd>
            <dt className="text-gray-500">Projected ROI</dt>
            <dd className="text-gray-300">{data.projectedROI}% over {data.roiTimelineMonths} months</dd>
            <dt className="text-gray-500">Platform Fee</dt>
            <dd className="text-gray-300">${data.platformFeeAmount.toLocaleString()} (5%)</dd>
          </dl>
        </div>

        {/* Token Config */}
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span>🪙</span> Token Configuration
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Token Name</dt>
            <dd className="font-medium text-white">{data.tokenName}</dd>
            <dt className="text-gray-500">Symbol</dt>
            <dd className="font-mono text-gray-300">${data.tokenSymbol}</dd>
            <dt className="text-gray-500">Total Supply</dt>
            <dd className="text-gray-300">{data.totalSupply.toLocaleString()} tokens</dd>
            <dt className="text-gray-500">Investor Tokens</dt>
            <dd className="text-green-400">{data.investorTokens.toLocaleString()} (95%)</dd>
            <dt className="text-gray-500">Platform Tokens</dt>
            <dd className="text-blue-400">{data.platformTokens.toLocaleString()} (5%)</dd>
          </dl>
        </div>

        {/* Legal */}
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span>⚖️</span> Legal Information
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-gray-500">Company Name</dt>
            <dd className="text-gray-300">{data.companyName}</dd>
            <dt className="text-gray-500">Jurisdiction</dt>
            <dd className="text-gray-300">{data.jurisdiction}</dd>
            <dt className="text-gray-500">Registration</dt>
            <dd className="text-gray-300">{data.companyRegistration || 'Not provided'}</dd>
            <dt className="text-gray-500">Documents</dt>
            <dd className="text-gray-300">{data.legalDocuments.length} files uploaded</dd>
          </dl>
        </div>

        {/* Media Preview */}
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <span>🖼️</span> Media
          </h3>
          <div className="flex items-center gap-4">
            {uploadedUrls.logo && (
              <img src={uploadedUrls.logo} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div className="text-sm text-gray-400">
              <p>Logo: {data.logoFile ? <span className="text-green-400">✓ Uploaded</span> : <span className="text-red-400">✗ Missing</span>}</p>
              <p>Banner: {data.bannerFile ? <span className="text-green-400">✓ Uploaded</span> : 'Not provided'}</p>
              <p>Pitch Deck: {data.pitchDeckFile ? <span className="text-green-400">✓ Uploaded</span> : 'Not provided'}</p>
              <p>Additional Images: {data.additionalImages.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
        <p className="text-sm text-yellow-300">
          <strong>⚠️ Important:</strong> Once deployed, the token configuration cannot be changed. 
          Please ensure all information is correct before proceeding.
        </p>
      </div>

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-600 text-gray-300 font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Back to Edit
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          Proceed to Deploy
        </button>
      </div>
    </div>
  )
}