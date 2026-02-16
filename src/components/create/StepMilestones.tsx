'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProjectMilestone } from '@/types/project';
import { getCurrencyByCode, formatCurrencyAmount } from '@/types/currency';

interface StepMilestonesProps {
  data: {
    milestones: ProjectMilestone[];
    amountToRaise: number;
    amountToRaiseLocal: number;
    localCurrency: string;
    projectName: string;
  };
  updateData: (updates: { milestones: ProjectMilestone[] }) => void;
  onNext: () => void;
  onBack: () => void;
}

// Preset templates for common project types
const MILESTONE_TEMPLATES = {
  'Real Estate': [
    { title: 'Land Acquisition', description: 'Purchase land and secure permits', percentage: 30, deliverables: ['Land deed', 'Building permits', 'Environmental clearance'] },
    { title: 'Foundation & Structure', description: 'Complete foundation and structural work', percentage: 25, deliverables: ['Foundation completion certificate', 'Structural inspection report'] },
    { title: 'Construction Phase', description: 'Building construction and utilities', percentage: 30, deliverables: ['Construction progress photos', 'Utilities connection certificates'] },
    { title: 'Completion & Handover', description: 'Final finishing and project handover', percentage: 15, deliverables: ['Occupancy certificate', 'Final inspection report', 'Handover documentation'] },
  ],
  'Agriculture': [
    { title: 'Land Preparation', description: 'Prepare land for cultivation', percentage: 20, deliverables: ['Soil analysis report', 'Land preparation photos'] },
    { title: 'Planting & Infrastructure', description: 'Plant crops and set up irrigation', percentage: 30, deliverables: ['Planting completion report', 'Irrigation system documentation'] },
    { title: 'Growth & Maintenance', description: 'Crop maintenance and monitoring', percentage: 25, deliverables: ['Growth progress reports', 'Pest management records'] },
    { title: 'Harvest & Distribution', description: 'Harvest and sell produce', percentage: 25, deliverables: ['Harvest records', 'Sales documentation', 'Revenue reports'] },
  ],
  'Technology': [
    { title: 'Research & Design', description: 'Complete research and product design', percentage: 20, deliverables: ['Technical specifications', 'Design mockups', 'Architecture documentation'] },
    { title: 'Development Phase 1', description: 'Core product development', percentage: 30, deliverables: ['Alpha release', 'Test reports', 'Code repository access'] },
    { title: 'Development Phase 2', description: 'Feature completion and testing', percentage: 30, deliverables: ['Beta release', 'QA reports', 'User testing results'] },
    { title: 'Launch & Operations', description: 'Product launch and initial operations', percentage: 20, deliverables: ['Launch announcement', 'User metrics', 'Operational reports'] },
  ],
  'Default': [
    { title: 'Phase 1 - Initiation', description: 'Project setup and initial work', percentage: 25, deliverables: ['Project plan', 'Initial deliverables'] },
    { title: 'Phase 2 - Development', description: 'Main project development', percentage: 35, deliverables: ['Progress report', 'Development deliverables'] },
    { title: 'Phase 3 - Execution', description: 'Project execution and implementation', percentage: 25, deliverables: ['Implementation report', 'Execution deliverables'] },
    { title: 'Phase 4 - Completion', description: 'Final delivery and project closure', percentage: 15, deliverables: ['Final report', 'Project completion certificate'] },
  ],
};

export default function StepMilestones({ data, updateData, onNext, onBack }: StepMilestonesProps) {
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [newDeliverable, setNewDeliverable] = useState<{ [key: string]: string }>({});
  
  const currency = getCurrencyByCode(data.localCurrency);
  const totalPercentage = data.milestones.reduce((sum, m) => sum + m.percentageOfFunds, 0);
  const isValid = totalPercentage === 100 && data.milestones.length >= 2;

  // Calculate amounts for a milestone
  const calculateAmounts = (percentage: number) => ({
    usd: (data.amountToRaise * percentage) / 100,
    local: (data.amountToRaiseLocal * percentage) / 100,
  });

  // Add a new milestone
  const addMilestone = () => {
    const remainingPercentage = Math.max(0, 100 - totalPercentage);
    const newMilestone: ProjectMilestone = {
      id: uuidv4(),
      title: `Milestone ${data.milestones.length + 1}`,
      description: '',
      percentageOfFunds: remainingPercentage,
      targetDate: '',
      deliverables: [],
      amountUSD: calculateAmounts(remainingPercentage).usd,
      amountLocal: calculateAmounts(remainingPercentage).local,
    };
    updateData({ milestones: [...data.milestones, newMilestone] });
    setExpandedMilestone(newMilestone.id);
  };

  // Remove a milestone
  const removeMilestone = (id: string) => {
    updateData({ milestones: data.milestones.filter(m => m.id !== id) });
    if (expandedMilestone === id) {
      setExpandedMilestone(null);
    }
  };

  // Update a milestone
  const updateMilestone = (id: string, updates: Partial<ProjectMilestone>) => {
    updateData({
      milestones: data.milestones.map(m => {
        if (m.id !== id) return m;
        const updated = { ...m, ...updates };
        if (updates.percentageOfFunds !== undefined) {
          const amounts = calculateAmounts(updates.percentageOfFunds);
          updated.amountUSD = amounts.usd;
          updated.amountLocal = amounts.local;
        }
        return updated;
      }),
    });
  };

  // Add deliverable to milestone
  const addDeliverable = (milestoneId: string) => {
    const text = newDeliverable[milestoneId]?.trim();
    if (!text) return;
    
    const milestone = data.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      updateMilestone(milestoneId, {
        deliverables: [...milestone.deliverables, text],
      });
      setNewDeliverable({ ...newDeliverable, [milestoneId]: '' });
    }
  };

  // Remove deliverable from milestone
  const removeDeliverable = (milestoneId: string, index: number) => {
    const milestone = data.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      updateMilestone(milestoneId, {
        deliverables: milestone.deliverables.filter((_, i) => i !== index),
      });
    }
  };

  // Apply a preset template
  const applyTemplate = (templateName: string) => {
    const template = MILESTONE_TEMPLATES[templateName as keyof typeof MILESTONE_TEMPLATES] || MILESTONE_TEMPLATES['Default'];
    const milestones: ProjectMilestone[] = template.map((t, index) => {
      const amounts = calculateAmounts(t.percentage);
      // Calculate target date (spread evenly over next 12 months)
      const monthsFromNow = Math.ceil((index + 1) * (12 / template.length));
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + monthsFromNow);
      
      return {
        id: uuidv4(),
        title: t.title,
        description: t.description,
        percentageOfFunds: t.percentage,
        targetDate: targetDate.toISOString().split('T')[0],
        deliverables: [...t.deliverables],
        amountUSD: amounts.usd,
        amountLocal: amounts.local,
      };
    });
    updateData({ milestones });
  };

  // Distribute percentages evenly
  const distributeEvenly = () => {
    if (data.milestones.length === 0) return;
    const evenPercentage = Math.floor(100 / data.milestones.length);
    const remainder = 100 - (evenPercentage * data.milestones.length);
    
    updateData({
      milestones: data.milestones.map((m, index) => {
        const percentage = index === data.milestones.length - 1 
          ? evenPercentage + remainder 
          : evenPercentage;
        const amounts = calculateAmounts(percentage);
        return {
          ...m,
          percentageOfFunds: percentage,
          amountUSD: amounts.usd,
          amountLocal: amounts.local,
        };
      }),
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-6 border border-purple-500/20">
        <h3 className="text-xl font-semibold text-white mb-2">Project Milestones</h3>
        <p className="text-gray-400">
          Define the milestones for your project. Funds will be released progressively as each milestone is approved.
          The total percentage must equal 100%.
        </p>
        
        {/* Funding Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Total Funding</div>
            <div className="text-lg font-bold text-white">${data.amountToRaise.toLocaleString()}</div>
            {data.localCurrency !== 'USD' && (
              <div className="text-xs text-gray-500">
                {formatCurrencyAmount(data.amountToRaiseLocal, data.localCurrency)}
              </div>
            )}
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Milestones</div>
            <div className="text-lg font-bold text-white">{data.milestones.length}</div>
            <div className="text-xs text-gray-500">Minimum 2 required</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Allocated</div>
            <div className={`text-lg font-bold ${totalPercentage === 100 ? 'text-green-400' : totalPercentage > 100 ? 'text-red-400' : 'text-yellow-400'}`}>
              {totalPercentage}%
            </div>
            <div className="text-xs text-gray-500">{100 - totalPercentage}% remaining</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Status</div>
            <div className={`text-lg font-bold ${isValid ? 'text-green-400' : 'text-yellow-400'}`}>
              {isValid ? 'Ready' : 'Incomplete'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm text-gray-400 mb-2">Apply Template</label>
          <select
            onChange={(e) => e.target.value && applyTemplate(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white"
            defaultValue=""
          >
            <option value="">Select a template...</option>
            {Object.keys(MILESTONE_TEMPLATES).filter(k => k !== 'Default').map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
            <option value="Default">Generic (4 phases)</option>
          </select>
        </div>
        
        <div className="flex items-end gap-2">
          <button
            onClick={addMilestone}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Milestone
          </button>
          
          {data.milestones.length >= 2 && (
            <button
              onClick={distributeEvenly}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Distribute Evenly
            </button>
          )}
        </div>
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        {data.milestones.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-dashed border-gray-600">
            <svg className="w-12 h-12 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-gray-400 mb-4">No milestones defined yet</p>
            <button
              onClick={() => applyTemplate('Default')}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Start with a template
            </button>
          </div>
        ) : (
          data.milestones.map((milestone, index) => {
            const isExpanded = expandedMilestone === milestone.id;
            const amounts = calculateAmounts(milestone.percentageOfFunds);
            
            return (
              <div
                key={milestone.id}
                className={`bg-gray-800 rounded-xl border transition-all ${
                  isExpanded ? 'border-blue-500' : 'border-gray-700'
                }`}
              >
                {/* Milestone Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <span className="text-blue-400 font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{milestone.title || 'Untitled Milestone'}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="text-green-400 font-medium">{milestone.percentageOfFunds}%</span>
                        <span>•</span>
                        <span>${amounts.usd.toLocaleString()}</span>
                        {data.localCurrency !== 'USD' && (
                          <>
                            <span>•</span>
                            <span>{formatCurrencyAmount(amounts.local, data.localCurrency)}</span>
                          </>
                        )}
                        {milestone.targetDate && (
                          <>
                            <span>•</span>
                            <span>{new Date(milestone.targetDate).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{milestone.deliverables.length} deliverables</span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-700 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Title */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Title</label>
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={(e) => updateMilestone(milestone.id, { title: e.target.value })}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          placeholder="Milestone title"
                        />
                      </div>
                      
                      {/* Target Date */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Target Date</label>
                        <input
                          type="date"
                          value={milestone.targetDate}
                          onChange={(e) => updateMilestone(milestone.id, { targetDate: e.target.value })}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Description</label>
                      <textarea
                        value={milestone.description}
                        onChange={(e) => updateMilestone(milestone.id, { description: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none"
                        rows={2}
                        placeholder="Describe what will be achieved in this milestone..."
                      />
                    </div>
                    
                    {/* Percentage & Amount */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Percentage of Funds</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={milestone.percentageOfFunds}
                            onChange={(e) => updateMilestone(milestone.id, { 
                              percentageOfFunds: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) 
                            })}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 pr-8 text-white"
                            min="1"
                            max="100"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Amount (USD)</label>
                        <div className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-green-400 font-medium">
                          ${amounts.usd.toLocaleString()}
                        </div>
                      </div>
                      {data.localCurrency !== 'USD' && (
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Amount ({data.localCurrency})</label>
                          <div className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-blue-400 font-medium">
                            {formatCurrencyAmount(amounts.local, data.localCurrency)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Deliverables */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Deliverables</label>
                      <div className="space-y-2">
                        {milestone.deliverables.map((deliverable, dIndex) => (
                          <div key={dIndex} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="flex-1 text-gray-300">{deliverable}</span>
                            <button
                              onClick={() => removeDeliverable(milestone.id, dIndex)}
                              className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newDeliverable[milestone.id] || ''}
                            onChange={(e) => setNewDeliverable({ ...newDeliverable, [milestone.id]: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && addDeliverable(milestone.id)}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
                            placeholder="Add a deliverable..."
                          />
                          <button
                            onClick={() => addDeliverable(milestone.id)}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => removeMilestone(milestone.id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove Milestone
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Validation Message */}
      {data.milestones.length > 0 && !isValid && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-yellow-400 font-medium">Please fix the following:</p>
            <ul className="text-sm text-yellow-400/80 mt-1 list-disc list-inside">
              {data.milestones.length < 2 && <li>At least 2 milestones are required</li>}
              {totalPercentage !== 100 && (
                <li>
                  Total percentage must equal 100% (currently {totalPercentage}%, 
                  {totalPercentage < 100 ? ` need ${100 - totalPercentage}% more` : ` remove ${totalPercentage - 100}%`})
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`px-8 py-3 rounded-lg font-semibold transition-all ${
            isValid
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Media & Legal
        </button>
      </div>
    </div>
  );
}
