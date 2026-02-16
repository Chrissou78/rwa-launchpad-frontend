// src/app/admin/identity/IdentityManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { isAddress } from 'viem';
import { RWASecurityTokenABI, IdentityRegistryABI } from '@/config/abis';
import { publicClient } from '../client';
import { Project, ZERO_ADDRESS, COUNTRY_CODES } from '../constants';
import { getExplorerUrl } from '../helpers';

interface IdentityManagementProps {
  projects: Project[];
}

export default function IdentityManagement({ projects }: IdentityManagementProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [userAddress, setUserAddress] = useState('');
  const [identityContract, setIdentityContract] = useState(ZERO_ADDRESS);
  const [countryCode, setCountryCode] = useState('840');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [identityRegistry, setIdentityRegistry] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const { writeContract, data: txHash, reset: resetTx } = useWriteContract();
  const { isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txSuccess) {
      setProcessing(false);
      setResult({ success: true, message: 'Identity registered successfully!' });
      checkVerificationStatus();
      resetTx();
    }
  }, [txSuccess]);

  const projectsWithToken = projects.filter(p => p.securityToken !== ZERO_ADDRESS);

  const loadIdentityRegistry = async (project: Project) => {
    setSelectedProject(project);
    setIdentityRegistry(null);
    setIsVerified(null);
    setResult(null);

    try {
      const registry = await publicClient.readContract({
        address: project.securityToken as `0x${string}`,
        abi: RWASecurityTokenABI,
        functionName: 'identityRegistry',
      });
      setIdentityRegistry(registry as string);
    } catch (error) {
      console.error('Error loading identity registry:', error);
      setResult({ success: false, message: 'Failed to load identity registry' });
    }
  };

  const checkVerificationStatus = async () => {
    if (!identityRegistry || !userAddress || !isAddress(userAddress)) return;

    try {
      const verified = await publicClient.readContract({
        address: identityRegistry as `0x${string}`,
        abi: IdentityRegistryABI,
        functionName: 'isVerified',
        args: [userAddress as `0x${string}`],
      });
      setIsVerified(verified as boolean);
    } catch (error) {
      console.error('Error checking verification:', error);
    }
  };

  useEffect(() => {
    if (identityRegistry && userAddress && isAddress(userAddress)) {
      checkVerificationStatus();
    }
  }, [identityRegistry, userAddress]);

  const handleRegisterIdentity = async () => {
    if (!identityRegistry || !userAddress || !isAddress(userAddress)) return;

    setProcessing(true);
    setResult(null);

    try {
      writeContract({
        address: identityRegistry as `0x${string}`,
        abi: IdentityRegistryABI,
        functionName: 'registerIdentity',
        args: [userAddress as `0x${string}`, identityContract as `0x${string}`, parseInt(countryCode)],
      });
    } catch (error) {
      setResult({ success: false, message: 'Failed to register identity' });
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Identity Management</h2>

      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Select Project</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsWithToken.map(project => (
            <button
              key={project.id}
              onClick={() => loadIdentityRegistry(project)}
              className={`p-4 rounded-lg text-left transition-colors ${selectedProject?.id === project.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              <p className="text-white font-medium">{project.name || `Project #${project.id}`}</p>
              <p className="text-gray-400 text-sm">Token: {project.securityToken.slice(0, 10)}...</p>
            </button>
          ))}
        </div>
      </div>

      {selectedProject && identityRegistry && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Register Identity</h3>

          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <p className="text-gray-400 text-xs">Identity Registry</p>
            <a href={getExplorerUrl(identityRegistry)} target="_blank" rel="noopener noreferrer" className="text-blue-400 font-mono text-sm break-all hover:underline">
              {identityRegistry}
            </a>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">User Address</label>
              <input
                type="text"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
              {isVerified !== null && (
                <p className={`mt-2 text-sm ${isVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isVerified ? '✓ Already verified' : '⚠ Not yet verified'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Identity Contract (optional)</label>
              <input
                type="text"
                value={identityContract}
                onChange={(e) => setIdentityContract(e.target.value)}
                placeholder="0x0000..."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Country Code</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                {Object.entries(COUNTRY_CODES).map(([code, name]) => (
                  <option key={code} value={code}>{name} ({code})</option>
                ))}
              </select>
            </div>

            {result && (
              <div className={`p-3 rounded-lg ${result.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {result.message}
              </div>
            )}

            <button
              onClick={handleRegisterIdentity}
              disabled={processing || !userAddress || !isAddress(userAddress) || isVerified === true}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium"
            >
              {processing ? 'Processing...' : 'Register Identity'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
