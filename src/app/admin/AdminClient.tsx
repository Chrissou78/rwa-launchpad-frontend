// src/app/admin/AdminClient.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { useAccount, usePublicClient } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWAProjectNFTABI, RWAEscrowVaultABI } from '@/config/abis';
import { Project, AdminTab, KYCStats, TokenizationStats, TradeStats, DisputeStats } from './constants';
import { convertIPFSUrl } from './helpers';
import {
  LayoutDashboard,
  FolderKanban,
  CreditCard,
  UserCheck,
  FileCode,
  Factory,
  Settings,
  Loader2,
  Wallet,
  Shield,
  Coins,
  Users,
  Ship,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
  ArrowRightLeft,
  ExternalLink,
  Globe,
} from 'lucide-react';

// Import all tab components
import { AdminOverview, PlatformContracts } from './components';
import KYCManagement from './kyc/KYCManagement';
import ProjectManagement from './projects/ProjectManagement';
import OffChainPayments from './offchain/OffChainPayments';
import FactorySettings from './settings/FactorySettings';
import PlatformSettings from './settings/PlatformSettings';
import TokenizationManagement from './tokenization/TokenizationManagement';
import TradeManagement from './trade/TradeManagement';
import DisputeManagement from './trade/DisputeManagement';

// ============================================================================
// CONSTANTS
// ============================================================================

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'projects', label: 'Launchpad', icon: <FolderKanban className="w-4 h-4" /> },
  { id: 'tokenization', label: 'Tokenization', icon: <Coins className="w-4 h-4" /> },
  { id: 'trade', label: 'Trade', icon: <Ship className="w-4 h-4" /> },
  { id: 'disputes', label: 'Disputes', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'offchain', label: 'Off-Chain', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'kyc', label: 'KYC', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'contracts', label: 'Contracts', icon: <FileCode className="w-4 h-4" /> },
  { id: 'factory', label: 'Factory', icon: <Factory className="w-4 h-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

// Default stats
const DEFAULT_KYC_STATS: KYCStats = { total: 0, pending: 0, approved: 0, rejected: 0 };
const DEFAULT_TOKENIZATION_STATS: TokenizationStats = { total: 0, pending: 0, inProgress: 0, completed: 0 };
const DEFAULT_TRADE_STATS: TradeStats = { 
  totalDeals: 0, activeDeals: 0, completedDeals: 0, disputedDeals: 0, 
  totalVolume: 0, pendingVolume: 0, inEscrow: 0, averageDealSize: 0 
};
const DEFAULT_DISPUTE_STATS: DisputeStats = { 
  total: 0, pending: 0, inMediation: 0, inArbitration: 0, resolved: 0, 
  totalValue: 0, valueAtRisk: 0, avgResolutionTime: 0 
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function AdminClient() {
  // ... ALL YOUR EXISTING ADMIN PAGE CODE GOES HERE
  // (Copy everything from your current AdminPage component)
  
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    isTestnet,
    isDeployed,
    switchToChain,
    isSwitching,
    getDeployedChains
  } = useChainConfig();

  // ... rest of your component
}
