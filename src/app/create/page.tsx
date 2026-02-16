'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import Header from '@/components/Header'
import { useKYC, getTierInfo, meetsMinimumTier } from '@/contexts/KYCContext'

import StepProjectDetails from '@/components/create/StepProjectDetails'
import StepMilestones from '@/components/create/StepMilestones'
import { ProjectMilestone } from '@/types/project'
import StepMediaLegal from '@/components/create/StepMediaLegal'
import StepReview from '@/components/create/StepReview'
import { StepDeploy } from '@/components/create/StepDeploy'

export interface ProjectData {
  // Basic Info
  projectName: string
  description: string
  category: string
  website: string
  
  // Currency & Financials
  localCurrency: string
  amountToRaiseLocal: number
  amountToRaise: number
  exchangeRate: number
  exchangeRateTimestamp: number
  investorSharePercentage: number
  projectedROI: number
  roiTimelineMonths: number
  revenueModel: string
  
  // Milestones
  milestones: ProjectMilestone[]
  
  // Token Config
  tokenName: string
  tokenSymbol: string
  totalSupply: number
  platformFeePercent: number
  platformFee: number
  platformFeeTokens: number
  investorTokens: number
  
  // Media
  logo: File | null
  banner: File | null
  pitchDeck: File | null
  images: File[]
  videoUrl: string
  
  // Legal
  companyName: string
  registrationNumber: string
  jurisdiction: string
  legalDocuments: File[]
  termsAccepted: boolean
}

const INITIAL_DATA: ProjectData = {
  projectName: '',
  description: '',
  category: '',
  website: '',
  
  localCurrency: 'USD',
  amountToRaiseLocal: 0,
  amountToRaise: 0,
  exchangeRate: 1,
  exchangeRateTimestamp: Date.now(),
  investorSharePercentage: 30,
  projectedROI: 0,
  roiTimelineMonths: 12,
  revenueModel: '',
  milestones: [],
  
  tokenName: '',
  tokenSymbol: '',
  totalSupply: 0,
  platformFeePercent: 5,
  platformFee: 0,
  platformFeeTokens: 0,
  investorTokens: 0,
  
  logo: null,
  banner: null,
  pitchDeck: null,
  images: [],
  videoUrl: '',
  
  companyName: '',
  registrationNumber: '',
  jurisdiction: '',
  legalDocuments: [],
  termsAccepted: false,
}

const STEPS = [
  { id: 'details', title: 'Project & Financials', icon: '📋' },
  { id: 'milestones', title: 'Milestones', icon: '🎯' },
  { id: 'media', title: 'Media & Legal', icon: '📁' },
  { id: 'review', title: 'Review', icon: '✅' },
  { id: 'deploy', title: 'Deploy', icon: '🚀' },
]

// KYC Gate Component
function KYCRequirementGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount()
  const { kycData, tierInfo } = useKYC()
  
  const requiredTier = 'Gold'
  const requiredTierInfo = getTierInfo(requiredTier)

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

  if (kycData.isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Verifying KYC status...</p>
      </div>
    )
  }

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

  if (!meetsMinimumTier(kycData.tier, requiredTier)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
        <div className="max-w-lg text-center">
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

  return <>{children}</>
}

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
  const [currentStep, setCurrentStep] = useState(0) // Changed to 0-based
  const [data, setData] = useState<ProjectData>(INITIAL_DATA) // Renamed to 'data'
  const [uploadedUrls, setUploadedUrls] = useState<{
    logo?: string
    banner?: string
    pitchDeck?: string
    legalDocs?: string[]
    images?: string[]
  }>({})

  // Renamed to 'updateData'
  const updateData = (updates: Partial<ProjectData>) => {
    setData(prev => {
      const newData = { ...prev, ...updates }
      
      // Auto-calculate token economics when USD amount changes
      if (updates.amountToRaise !== undefined) {
        const amount = updates.amountToRaise
        newData.totalSupply = amount
        newData.platformFee = amount * 0.05
        newData.platformFeeTokens = amount * 0.05
        newData.investorTokens = Math.round(amount * (newData.investorSharePercentage / 100))
      }
      
      // Auto-suggest token name from project name
      if (updates.projectName !== undefined && !prev.tokenName) {
        newData.tokenName = `${updates.projectName} Token`
      }
      
      return newData
    })
  }

  const nextStep = () => setCurrentStep(s => Math.min(s + 1, STEPS.length - 1))
  const prevStep = () => setCurrentStep(s => Math.max(s - 1, 0))
  const goToStep = (stepIndex: number) => {
    if (stepIndex <= currentStep) setCurrentStep(stepIndex)
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <KYCRequirementGate>
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
                    onClick={() => goToStep(index)}
                    disabled={index > currentStep}
                    className={`flex flex-col items-center ${index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg transition-colors
                      ${index === currentStep 
                        ? 'bg-blue-600 text-white ring-4 ring-blue-600/30' 
                        : index < currentStep 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-700 text-gray-400'}`}
                    >
                      {index < currentStep ? '✓' : step.icon}
                    </div>
                    <span className={`mt-2 text-xs sm:text-sm font-medium hidden sm:block text-center
                      ${index === currentStep ? 'text-blue-400' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded ${index < currentStep ? 'bg-green-500' : 'bg-gray-700'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-6 md:p-8">
            {currentStep === 0 && (
              <StepProjectDetails
                data={data}
                updateData={updateData}
                onNext={nextStep}
              />
            )}

            {currentStep === 1 && (
              <StepMilestones
                data={data}
                updateData={updateData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {currentStep === 2 && (
              <StepMediaLegal
                data={data}
                updateData={updateData}
                onNext={nextStep}
                onBack={prevStep}
                uploadedUrls={uploadedUrls}
                setUploadedUrls={setUploadedUrls}
              />
            )}

            {currentStep === 3 && (
              <StepReview
                data={data}
                uploadedUrls={uploadedUrls}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}

            {currentStep === 4 && (
              <StepDeploy
                data={data}
                uploadedUrls={uploadedUrls}
                onBack={prevStep}
              />
            )}
          </div>
        </KYCRequirementGate>
      </main>
    </div>
  )
}
