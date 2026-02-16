'use client'

import { useRef, useState } from 'react'
import { ProjectData } from '@/app/create/page'

interface Props {
  data: ProjectData
  updateData: (updates: Partial<ProjectData>) => void
  uploadedUrls: { logo?: string; banner?: string; pitchDeck?: string; legalDocs: string[] }
  setUploadedUrls: React.Dispatch<React.SetStateAction<typeof uploadedUrls>>
  onNext: () => void
  onBack: () => void
}

const JURISDICTIONS = [
  'United States',
  'United Kingdom',
  'European Union',
  'Switzerland',
  'Singapore',
  'United Arab Emirates',
  'Cayman Islands',
  'British Virgin Islands',
  'Other',
]

export function StepMediaLegal({ data, updateData, uploadedUrls, setUploadedUrls, onNext, onBack }: Props) {
  const logoRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)
  const pitchDeckRef = useRef<HTMLInputElement>(null)
  const docsRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState<{
    logo: boolean
    banner: boolean
    pitchDeck: boolean
    legalDocs: boolean
  }>({
    logo: false,
    banner: false,
    pitchDeck: false,
    legalDocs: false,
  })

  const [uploadErrors, setUploadErrors] = useState<{
    logo?: string
    banner?: string
    pitchDeck?: string
    legalDocs?: string
  }>({})

  // Upload file to IPFS
  const uploadToIPFS = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/ipfs/upload-file', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      return result.ipfsUri // Returns ipfs://Qm...
    } catch (error: any) {
      console.error('IPFS upload error:', error)
      throw error
    }
  }

  const handleFileChange = async (type: 'logo' | 'banner' | 'pitchDeck', file: File | null) => {
    if (!file) return

    // Clear previous error
    setUploadErrors(prev => ({ ...prev, [type]: undefined }))

    // Validate file size
    const maxSizes: Record<string, number> = {
      logo: 2 * 1024 * 1024,      // 2MB
      banner: 5 * 1024 * 1024,    // 5MB
      pitchDeck: 20 * 1024 * 1024, // 20MB
    }

    if (file.size > maxSizes[type]) {
      setUploadErrors(prev => ({ 
        ...prev, 
        [type]: `File too large. Max ${maxSizes[type] / 1024 / 1024}MB` 
      }))
      return
    }

    // Store the file locally for display
    updateData({ [`${type}File`]: file })
    
    // Create local preview URL
    const localUrl = URL.createObjectURL(file)

    // Start uploading to IPFS
    setUploading(prev => ({ ...prev, [type]: true }))

    try {
      const ipfsUri = await uploadToIPFS(file)
      
      if (ipfsUri) {
        // Store IPFS URL for contract deployment
        setUploadedUrls(prev => ({ ...prev, [type]: ipfsUri }))
        console.log(`${type} uploaded to IPFS:`, ipfsUri)
      }
    } catch (error: any) {
      console.error(`Failed to upload ${type}:`, error)
      setUploadErrors(prev => ({ 
        ...prev, 
        [type]: error.message || 'Upload failed. Please try again.' 
      }))
      // Keep local preview even if IPFS upload fails
      setUploadedUrls(prev => ({ ...prev, [type]: localUrl }))
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }))
    }
  }

  const handleLegalDocs = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploadErrors(prev => ({ ...prev, legalDocs: undefined }))
    setUploading(prev => ({ ...prev, legalDocs: true }))

    const newFiles: File[] = []
    const newUrls: string[] = []

    try {
      for (const file of Array.from(files)) {
        // Validate size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          console.warn(`Skipping ${file.name} - too large`)
          continue
        }

        newFiles.push(file)

        try {
          const ipfsUri = await uploadToIPFS(file)
          if (ipfsUri) {
            newUrls.push(ipfsUri)
            console.log(`Legal doc uploaded to IPFS:`, ipfsUri)
          }
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error)
          // Continue with other files
        }
      }

      updateData({ legalDocuments: [...data.legalDocuments, ...newFiles] })
      setUploadedUrls(prev => ({ 
        ...prev, 
        legalDocs: [...(prev.legalDocs || []), ...newUrls] 
      }))
    } catch (error: any) {
      setUploadErrors(prev => ({ 
        ...prev, 
        legalDocs: 'Some files failed to upload' 
      }))
    } finally {
      setUploading(prev => ({ ...prev, legalDocs: false }))
    }
  }

  const removeDoc = (index: number) => {
    const newDocs = [...data.legalDocuments]
    newDocs.splice(index, 1)
    updateData({ legalDocuments: newDocs })

    const newUrls = [...uploadedUrls.legalDocs]
    newUrls.splice(index, 1)
    setUploadedUrls(prev => ({ ...prev, legalDocs: newUrls }))
  }

  // Get display URL (convert IPFS to gateway for preview)
  const getDisplayUrl = (ipfsUrl?: string): string | undefined => {
    if (!ipfsUrl) return undefined
    if (ipfsUrl.startsWith('ipfs://')) {
      return `https://gateway.pinata.cloud/ipfs/${ipfsUrl.replace('ipfs://', '')}`
    }
    return ipfsUrl
  }

  const isUploading = uploading.logo || uploading.banner || uploading.pitchDeck || uploading.legalDocs
  const isValid = data.logoFile !== null && data.companyName && data.jurisdiction && data.termsAccepted && !isUploading

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 text-white">Media & Legal Information</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Media */}
        <div className="space-y-5">
          <h3 className="text-lg font-medium text-purple-400 border-b border-gray-700 pb-2">Media & Documents</h3>
          
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Logo *
            </label>
            <div 
              onClick={() => !uploading.logo && logoRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors bg-gray-900/50 aspect-square max-w-[200px] ${
                uploading.logo ? 'border-blue-500 cursor-wait' : 'border-gray-600 hover:border-blue-500'
              }`}
            >
              {uploading.logo ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-blue-400 text-sm">Uploading to IPFS...</p>
                </div>
              ) : uploadedUrls.logo ? (
                <div className="relative h-full">
                  <img 
                    src={getDisplayUrl(uploadedUrls.logo)} 
                    alt="Logo" 
                    className="w-full h-full object-cover rounded-lg" 
                  />
                  {uploadedUrls.logo.startsWith('ipfs://') && (
                    <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                      ✓ IPFS
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-gray-400 text-sm">Click to upload</p>
                  <p className="text-xs text-gray-500 mt-1">1:1 ratio</p>
                  <p className="text-xs text-gray-600">400×400px min</p>
                  <p className="text-xs text-gray-600">PNG, JPG, max 2MB</p>
                </div>
              )}
            </div>
            {uploadErrors.logo && (
              <p className="text-red-400 text-xs mt-1">{uploadErrors.logo}</p>
            )}
            <input 
              ref={logoRef} 
              type="file" 
              accept="image/png,image/jpeg,image/webp" 
              onChange={(e) => handleFileChange('logo', e.target.files?.[0] || null)} 
              className="hidden" 
            />
          </div>

          {/* Banner */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Banner Image (optional)
            </label>
            <div 
              onClick={() => !uploading.banner && bannerRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors bg-gray-900/50 aspect-[3/1] w-full ${
                uploading.banner ? 'border-blue-500 cursor-wait' : 'border-gray-600 hover:border-blue-500'
              }`}
            >
              {uploading.banner ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-blue-400 text-sm">Uploading to IPFS...</p>
                </div>
              ) : uploadedUrls.banner ? (
                <div className="relative h-full">
                  <img 
                    src={getDisplayUrl(uploadedUrls.banner)} 
                    alt="Banner" 
                    className="w-full h-full object-cover rounded-lg" 
                  />
                  {uploadedUrls.banner.startsWith('ipfs://') && (
                    <div className="absolute bottom-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                      ✓ IPFS
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-4xl mb-2">🖼️</div>
                  <p className="text-gray-400 text-sm">Click to upload banner</p>
                  <p className="text-xs text-gray-500 mt-1">3:1 ratio (landscape)</p>
                  <p className="text-xs text-gray-600">1200×400px recommended</p>
                  <p className="text-xs text-gray-600">PNG, JPG, max 5MB</p>
                </div>
              )}
            </div>
            {uploadErrors.banner && (
              <p className="text-red-400 text-xs mt-1">{uploadErrors.banner}</p>
            )}
            <input 
              ref={bannerRef} 
              type="file" 
              accept="image/png,image/jpeg,image/webp" 
              onChange={(e) => handleFileChange('banner', e.target.files?.[0] || null)} 
              className="hidden" 
            />
          </div>

          {/* Pitch Deck */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Pitch Deck (optional)
            </label>
            <div 
              onClick={() => !uploading.pitchDeck && pitchDeckRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors bg-gray-900/50 ${
                uploading.pitchDeck ? 'border-blue-500 cursor-wait' : 'border-gray-600 hover:border-blue-500'
              }`}
            >
              {uploading.pitchDeck ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-400 text-sm">Uploading to IPFS...</span>
                </div>
              ) : data.pitchDeckFile ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <span className="text-2xl">📄</span>
                  <span className="text-gray-300 text-sm truncate max-w-[200px]">{data.pitchDeckFile.name}</span>
                  <span className="text-xs text-gray-500">({(data.pitchDeckFile.size / 1024 / 1024).toFixed(1)}MB)</span>
                  {uploadedUrls.pitchDeck?.startsWith('ipfs://') && (
                    <span className="bg-green-500 text-white text-xs px-1 rounded">✓ IPFS</span>
                  )}
                </div>
              ) : (
                <>
                  <div className="text-3xl mb-1">📊</div>
                  <p className="text-gray-400 text-sm">Upload pitch deck</p>
                  <p className="text-xs text-gray-600">PDF, max 20MB</p>
                </>
              )}
            </div>
            {uploadErrors.pitchDeck && (
              <p className="text-red-400 text-xs mt-1">{uploadErrors.pitchDeck}</p>
            )}
            <input 
              ref={pitchDeckRef} 
              type="file" 
              accept=".pdf" 
              onChange={(e) => handleFileChange('pitchDeck', e.target.files?.[0] || null)} 
              className="hidden" 
            />
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Video URL (optional)
            </label>
            <input
              type="url"
              value={data.videoUrl}
              onChange={(e) => updateData({ videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-600 mt-1">YouTube or Vimeo link</p>
          </div>
        </div>

        {/* Right Column - Legal */}
        <div className="space-y-5">
          <h3 className="text-lg font-medium text-yellow-400 border-b border-gray-700 pb-2">Legal & Compliance</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company / Entity Name *
            </label>
            <input
              type="text"
              value={data.companyName}
              onChange={(e) => updateData({ companyName: e.target.value })}
              placeholder="Your Company Ltd."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Registration Number (optional)
            </label>
            <input
              type="text"
              value={data.companyRegistration}
              onChange={(e) => updateData({ companyRegistration: e.target.value })}
              placeholder="e.g., 12345678"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Jurisdiction *
            </label>
            <select
              value={data.jurisdiction}
              onChange={(e) => updateData({ jurisdiction: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="" className="bg-gray-900">Select jurisdiction</option>
              {JURISDICTIONS.map(j => (
                <option key={j} value={j} className="bg-gray-900">{j}</option>
              ))}
            </select>
          </div>

          {/* Legal Documents */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Legal Documents (optional)
            </label>
            <div 
              onClick={() => !uploading.legalDocs && docsRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors bg-gray-900/50 ${
                uploading.legalDocs ? 'border-blue-500 cursor-wait' : 'border-gray-600 hover:border-blue-500'
              }`}
            >
              {uploading.legalDocs ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-400 text-sm">Uploading to IPFS...</span>
                </div>
              ) : (
                <>
                  <div className="text-3xl mb-1">📁</div>
                  <p className="text-gray-400 text-sm">Upload legal documents</p>
                  <p className="text-xs text-gray-600">PDF, max 10MB each</p>
                </>
              )}
            </div>
            {uploadErrors.legalDocs && (
              <p className="text-red-400 text-xs mt-1">{uploadErrors.legalDocs}</p>
            )}
            <input 
              ref={docsRef} 
              type="file" 
              accept=".pdf" 
              multiple 
              onChange={(e) => handleLegalDocs(e.target.files)} 
              className="hidden" 
            />
            
            {data.legalDocuments.length > 0 && (
              <div className="mt-2 space-y-1">
                {data.legalDocuments.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-900 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300 truncate">📄 {file.name}</span>
                      {uploadedUrls.legalDocs[i]?.startsWith('ipfs://') && (
                        <span className="bg-green-500 text-white text-xs px-1 rounded">✓ IPFS</span>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeDoc(i)} 
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Terms */}
          <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.termsAccepted}
                onChange={(e) => updateData({ termsAccepted: e.target.checked })}
                className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">
                I confirm that all information is accurate and I agree to the{' '}
                <a href="/terms" className="text-blue-400 underline">Terms of Service</a> and{' '}
                <a href="/privacy" className="text-blue-400 underline">Privacy Policy</a>. *
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Upload Status */}
      {isUploading && (
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-400">Uploading files to IPFS... Please wait.</span>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 border border-gray-600 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? 'Uploading...' : 'Review Project'}
        </button>
      </div>
    </div>
  )
}

export default StepMediaLegal;
