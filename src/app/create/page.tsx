'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import Header  from '@/components/Header'
import { useKYC, getTierInfo, meetsMinimumTier } from '@/contexts/KYCContext'

import { StepProjectDetails } from '@/components/create/StepProjectDetails'
import { StepMediaLegal } from '@/components/create/StepMediaLegal'
import { StepReview } from '@/components/create/StepReview'
import { StepDeploy } from '@/components/create/StepDeploy'

export interface ProjectData {
  // Basic Info
  projectName: string
  description: string
  category: string
  website: string
  
  // Financials
  amountToRaise: number
  investorSharePercent: number
  projectedROI: number
  roiTimelineMonths: number
  revenueModel: string
  
  // Token Config
  tokenName: string
  tokenSymbol: string
  totalSupply: number
  platformFeePercent: number
  platformFeeAmount: number
  platformTokens: number
  investorTokens: number
  
  // Media
  logoFile: File | null
  bannerFile: File | null
  pitchDeckFile: File | null
  additionalImages: File[]
  videoUrl: string
  
  // Legal
  companyName: string
  companyRegistration: string
  jurisdiction: string
  legalDocuments: File[]
  termsAccepted: boolean
}

const INITIAL_DATA: ProjectData = {
  projectName: '',
  description: '',
  category: '',
  website: '',
  
  amountToRaise: 0,
  investorSharePercent: 0,
  projectedROI: 0,
  roiTimelineMonths: 12,
  revenueModel: '',
  
  tokenName: '',
  tokenSymbol: '',
  totalSupply: 0,
  platformFeePercent: 5,
  platformFeeAmount: 0,
  platformTokens: 0,
  investorTokens: 0,
  
  logoFile: null,
  bannerFile: null,
  pitchDeckFile: null,
  additionalImages: [],
  videoUrl: '',
  
  companyName: '',
  companyRegistration: '',
  jurisdiction: '',
  legalDocuments: [],
  termsAccepted: false,
}

const STEPS = [
  { id: 1, name: 'Project & Financials', description: 'Details & funding' },
  { id: 2, name: 'Media & Legal', description: 'Documents & compliance' },
  { id: 3, name: 'Review', description: 'Verify details' },
  { id: 4, name: 'Deploy', description: 'Create on-chain' },
]

// KYC Gate Component for Create Project
function KYCRequirementGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount()
  const { kycData, tierInfo } = useKYC()
  
  const requiredTier = 'Gold'
  const requiredTierInfo = getTierInfo(requiredTier)

  // Not connected
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">🔗</div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to create a new project on the RWA Launchpad.
          </p>
        </div>
      </div>
    )
  }

  // Loading KYC status
  if (kycData.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Verifying KYC status...</p>
      </div>
    )
  }

  // KYC not approved
  if (kycData.status !== 'Approved') {
    const isPending = ['Pending', 'AutoVerifying', 'ManualReview'].includes(kycData.status)
    const isRejected = kycData.status === 'Rejected'
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="max-w-lg text-center">
          <div className="text-6xl mb-6">
            {isPending ? '⏳' : isRejected ? '❌' : '🔒'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            {isPending ? 'Verification In Progress' : 
             isRejected ? 'KYC Verification Failed' :
             'KYC Verification Required'}
          </h2>
          <p className="text-gray-400 mb-6">
            {isPending 
              ? 'Your KYC verification is being processed. You\'ll be able to create projects once approved with Gold tier or higher.'
              : isRejected
              ? 'Your KYC application was rejected. Please resubmit with correct information.'
              : 'To create projects on RWA Launchpad, you need to complete KYC verification and achieve Gold tier or higher.'
            }
          </p>
          
          {/* Tier Requirements Card */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6 text-left">
            <h3 className="text-lg font-semibold text-white mb-4">Project Creator Requirements</h3>
            <div className="flex items-center gap-4 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
              <span className="text-3xl">{requiredTierInfo.icon}</span>
              <div>
                <div className={`font-semibold ${requiredTierInfo.color}`}>
                  {requiredTierInfo.label} Tier Required
                </div>
                <div className="text-sm text-gray-400">
                  Investment limit: {requiredTierInfo.limit}
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              <p>Gold tier requires:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Valid government ID document</li>
                <li>Selfie verification with face match</li>
                <li>Proof of address document</li>
              </ul>
            </div>
          </div>

          <Link
            href="/kyc"
            className="inline-block px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold rounded-lg transition-all"
          >
            {isPending ? 'View Verification Status' : 'Start KYC Verification'}
          </Link>
        </div>
      </div>
    )
  }

  // KYC approved but tier too low
  if (!meetsMinimumTier(kycData.tier, requiredTier)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="max-w-lg text-center">
          {/* Tier Comparison */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="text-center">
              <div className="text-4xl mb-2">{tierInfo.icon}</div>
              <div className={`text-sm font-medium ${tierInfo.color}`}>Your Tier</div>
              <div className="text-lg font-bold text-white">{tierInfo.label}</div>
            </div>
            <div className="text-3xl text-gray-600">→</div>
            <div className="text-center">
              <div className="text-4xl mb-2">{requiredTierInfo.icon}</div>
              <div className={`text-sm font-medium ${requiredTierInfo.color}`}>Required</div>
              <div className="text-lg font-bold text-white">{requiredTierInfo.label}</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            Upgrade to {requiredTierInfo.label} Tier
          </h2>
          <p className="text-gray-400 mb-6">
            You're currently at <span className={tierInfo.color}>{tierInfo.label}</span> tier. 
            To create projects, you need to upgrade to <span className={requiredTierInfo.color}>{requiredTierInfo.label}</span> tier or higher.
          </p>

          {/* Current vs Required */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div className={`p-4 rounded-lg ${tierInfo.bgColor} border ${tierInfo.borderColor}`}>
                <div className="text-xs text-gray-400 mb-1">Current</div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{tierInfo.icon}</span>
                  <span className={`font-semibold ${tierInfo.color}`}>{tierInfo.label}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">Limit: {tierInfo.limit}</div>
                <div className="text-xs text-red-400 mt-2">Cannot create projects</div>
              </div>
              <div className={`p-4 rounded-lg ${requiredTierInfo.bgColor} border ${requiredTierInfo.borderColor}`}>
                <div className="text-xs text-gray-400 mb-1">Required</div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{requiredTierInfo.icon}</span>
                  <span className={`font-semibold ${requiredTierInfo.color}`}>{requiredTierInfo.label}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">Limit: {requiredTierInfo.limit}</div>
                <div className="text-xs text-green-400 mt-2">Can create projects</div>
              </div>
            </div>
          </div>

          {/* What's needed to upgrade */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6 text-left">
            <div className="text-sm font-medium text-white mb-2">To upgrade to Gold, you need:</div>
            <ul className="text-sm text-gray-400 space-y-1">
              {kycData.tier === 'Bronze' && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Email & wallet verified
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-400">○</span> ID document verification
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gray-500">○</span> Selfie with face match
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gray-500">○</span> Proof of address
                  </li>
                </>
              )}
              {kycData.tier === 'Silver' && (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Email & wallet verified
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> ID document verified
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-yellow-400">○</span> Selfie with face match
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-gray-500">○</span> Proof of address
                  </li>
                </>
              )}
            </ul>
          </div>

          <Link
            href="/kyc"
            className="inline-block px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold rounded-lg transition-all"
          >
            Upgrade to {requiredTierInfo.label}
          </Link>
        </div>
      </div>
    )
  }

  // All checks passed - render the create project form
  return <>{children}</>
}

// Creator Badge Component
function CreatorBadge() {
  const { tierInfo } = useKYC()
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${tierInfo.bgColor} border ${tierInfo.borderColor}`}>
      <span>{tierInfo.icon}</span>
      <span className={`text-sm font-medium ${tierInfo.color}`}>
        Creating as {tierInfo.label}
      </span>
    </div>
  )
}

export default function CreateProjectPage() {
  const { isConnected } = useAccount()
  const [currentStep, setCurrentStep] = useState(1)
  const [projectData, setProjectData] = useState<ProjectData>(INITIAL_DATA)
  const [uploadedUrls, setUploadedUrls] = useState<{
    logo?: string
    banner?: string
    pitchDeck?: string
    legalDocs: string[]
  }>({ legalDocs: [] })

  const updateProjectData = (updates: Partial<ProjectData>) => {
    setProjectData(prev => {
      const newData = { ...prev, ...updates }
      
      // Auto-calculate token economics when amount changes
      if (updates.amountToRaise !== undefined) {
        const amount = updates.amountToRaise
        newData.totalSupply = amount
        newData.platformFeeAmount = amount * 0.05
        newData.platformTokens = amount * 0.05
        newData.investorTokens = amount * 0.95
      }
      
      // Auto-suggest token name from project name
      if (updates.projectName !== undefined && !prev.tokenName) {
        newData.tokenName = `${updates.projectName} Token`
      }
      
      return newData
    })
  }

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, STEPS.length))
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 1))
  const goToStep = (step: number) => {
    if (step < currentStep) setCurrentStep(step)
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <KYCRequirementGate>
          {/* Header with Creator Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Create New Project</h1>
              <p className="text-gray-400">Launch your tokenized investment opportunity</p>
            </div>
            <CreatorBadge />
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => goToStep(step.id)}
                    disabled={step.id > currentStep}
                    className={`flex flex-col items-center ${step.id <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                      ${step.id === currentStep 
                        ? 'bg-blue-600 text-white ring-4 ring-blue-600/30' 
                        : step.id < currentStep 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-700 text-gray-400'}`}
                    >
                      {step.id < currentStep ? '✓' : step.id}
                    </div>
                    <span className={`mt-2 text-sm font-medium hidden sm:block
                      ${step.id === currentStep ? 'text-blue-400' : 'text-gray-500'}`}>
                      {step.name}
                    </span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 rounded ${step.id < currentStep ? 'bg-green-500' : 'bg-gray-700'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 md:p-8">
            {currentStep === 1 && (
              <StepProjectDetails 
                data={projectData} 
                updateData={updateProjectData} 
                onNext={nextStep} 
              />
            )}
            {currentStep === 2 && (
              <StepMediaLegal 
                data={projectData} 
                updateData={updateProjectData}
                uploadedUrls={uploadedUrls}
                setUploadedUrls={setUploadedUrls}
                onNext={nextStep} 
                onBack={prevStep} 
              />
            )}
            {currentStep === 3 && (
              <StepReview 
                data={projectData}
                uploadedUrls={uploadedUrls}
                onNext={nextStep} 
                onBack={prevStep} 
              />
            )}
            {currentStep === 4 && (
              <StepDeploy 
                data={projectData}
                uploadedUrls={uploadedUrls}
                isConnected={isConnected}
              />
            )}
          </div>
        </KYCRequirementGate>
      </main>
    </div>
  )
}
