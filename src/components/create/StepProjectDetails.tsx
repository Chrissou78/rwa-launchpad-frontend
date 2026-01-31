'use client'

import { ProjectData } from '@/app/create/page'

interface Props {
  data: ProjectData
  updateData: (updates: Partial<ProjectData>) => void
  onNext: () => void
}

const CATEGORIES = [
  'Real Estate',
  'Startups & Equity',
  'Renewable Energy',
  'Agriculture',
  'Art & Collectibles',
  'Infrastructure',
  'Commodities',
  'Other',
]

export function StepProjectDetails({ data, updateData, onNext }: Props) {
  const isValid = 
    data.projectName && 
    data.description && 
    data.category && 
    data.amountToRaise > 0 && 
    data.investorSharePercent > 0 &&
    data.tokenName &&
    data.tokenSymbol

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid) onNext()
  }

  const platformFee = data.amountToRaise * 0.05
  const netToProject = data.amountToRaise * 0.95

  const suggestSymbol = () => {
    const words = data.projectName.split(' ').filter(w => w.length > 0)
    if (words.length >= 2) {
      return words.map(w => w[0]).join('').toUpperCase().slice(0, 4)
    }
    return data.projectName.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-2xl font-semibold mb-6 text-white">Project Details & Financials</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Basic Info */}
        <div className="space-y-5">
          <h3 className="text-lg font-medium text-blue-400 border-b border-gray-700 pb-2">Project Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={data.projectName}
              onChange={(e) => updateData({ projectName: e.target.value })}
              placeholder="e.g., Green Energy Park Madrid"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category *
            </label>
            <select
              value={data.category}
              onChange={(e) => updateData({ category: e.target.value })}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="" className="bg-gray-900">Select a category</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={data.description}
              onChange={(e) => updateData({ description: e.target.value })}
              placeholder="Describe your project, its purpose, and why investors should be interested..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-gray-500">{data.description.length}/2000</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Website (optional)
            </label>
            <input
              type="url"
              value={data.website}
              onChange={(e) => updateData({ website: e.target.value })}
              placeholder="https://yourproject.com"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right Column - Financials & Token */}
        <div className="space-y-5">
          <h3 className="text-lg font-medium text-green-400 border-b border-gray-700 pb-2">Funding & Token</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount to Raise (USD) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500">$</span>
              <input
                type="number"
                value={data.amountToRaise || ''}
                onChange={(e) => updateData({ amountToRaise: parseFloat(e.target.value) || 0 })}
                placeholder="100000"
                min="1000"
                step="100"
                className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Investor Share (%) *
              </label>
              <input
                type="number"
                value={data.investorSharePercent || ''}
                onChange={(e) => updateData({ investorSharePercent: parseFloat(e.target.value) || 0 })}
                placeholder="20"
                min="1"
                max="100"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Projected ROI (%)
              </label>
              <input
                type="number"
                value={data.projectedROI || ''}
                onChange={(e) => updateData({ projectedROI: parseFloat(e.target.value) || 0 })}
                placeholder="15"
                min="0"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Name *
              </label>
              <input
                type="text"
                value={data.tokenName}
                onChange={(e) => updateData({ tokenName: e.target.value })}
                placeholder="e.g., Green Energy Token"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Symbol *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={data.tokenSymbol}
                  onChange={(e) => updateData({ tokenSymbol: e.target.value.toUpperCase().slice(0, 6) })}
                  placeholder="GREP"
                  maxLength={6}
                  className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  required
                />
                <button
                  type="button"
                  onClick={() => updateData({ tokenSymbol: suggestSymbol() })}
                  className="px-3 py-3 border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-700 text-xs transition-colors"
                  title="Auto-suggest"
                >
                  ✨
                </button>
              </div>
            </div>
          </div>

          {/* Token Economics Preview */}
          {data.amountToRaise > 0 && (
            <div className="p-4 bg-gradient-to-r from-blue-900/30 to-green-900/30 border border-blue-700/50 rounded-lg">
              <h4 className="font-medium text-blue-300 mb-3 text-sm">Token Economics</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-900/50 p-2 rounded">
                  <div className="text-gray-500 text-xs">Total Supply</div>
                  <div className="font-bold text-white">{data.amountToRaise.toLocaleString()}</div>
                </div>
                <div className="bg-gray-900/50 p-2 rounded">
                  <div className="text-gray-500 text-xs">Platform Fee (5%)</div>
                  <div className="font-bold text-blue-400">${platformFee.toLocaleString()}</div>
                </div>
                <div className="bg-gray-900/50 p-2 rounded">
                  <div className="text-gray-500 text-xs">Investor Tokens</div>
                  <div className="font-bold text-green-400">{data.investorTokens.toLocaleString()}</div>
                </div>
                <div className="bg-gray-900/50 p-2 rounded">
                  <div className="text-gray-500 text-xs">Net to Project</div>
                  <div className="font-bold text-green-400">${netToProject.toLocaleString()}</div>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">1 Token = $1 USD</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="submit"
          disabled={!isValid}
          className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          Continue to Media & Legal
        </button>
      </div>
    </form>
  )
}
