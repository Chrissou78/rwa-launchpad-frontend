// src/app/admin/components/ProjectContractsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { CONTRACTS } from '@/config/contracts';
import { RWALaunchpadFactoryABI } from '@/config/abis';
import { publicClient } from '../client';
import { Project, DeploymentRecord } from '../constants';
import { getExplorerUrl, truncateAddress } from '../helpers';
import ContractRow from './ContractRow';

interface ProjectContractsModalProps {
  project: Project;
  onClose: () => void;
}

export default function ProjectContractsModal({ project, onClose }: ProjectContractsModalProps) {
  const [deployment, setDeployment] = useState<DeploymentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeployment = async () => {
      try {
        const data = await publicClient.readContract({
          address: CONTRACTS.RWALaunchpadFactory as `0x${string}`,
          abi: RWALaunchpadFactoryABI,
          functionName: 'getDeployment',
          args: [BigInt(project.id)],
        });
        setDeployment(data as DeploymentRecord);
      } catch (error) {
        console.error('Error fetching deployment:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeployment();
  }, [project.id]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">{project.name || `Project #${project.id}`}</h3>
            <p className="text-gray-400 text-sm">Deployed Contract Addresses</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="ml-3 text-gray-400">Loading contracts...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <ContractRow label="Security Token" address={deployment?.securityToken || project.securityToken} type="core" />
              <ContractRow label="Escrow Vault" address={deployment?.escrowVault || project.escrowVault} type="core" />
              <ContractRow label="Compliance" address={deployment?.compliance} type="module" />
              <ContractRow label="Dividend Distributor" address={deployment?.dividendDistributor} type="module" />
              <ContractRow label="Max Balance Module" address={deployment?.maxBalanceModule} type="module" />
              <ContractRow label="Lockup Module" address={deployment?.lockupModule} type="module" />

              {deployment && deployment.deployedAt > 0n && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Deployed by</p>
                      <a href={getExplorerUrl(deployment.deployer)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-mono">
                        {truncateAddress(deployment.deployer)}
                      </a>
                    </div>
                    <div>
                      <p className="text-gray-400">Deployed at</p>
                      <p className="text-white">{new Date(Number(deployment.deployedAt) * 1000).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Status</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${deployment.active ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'}`}>
                        {deployment.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
