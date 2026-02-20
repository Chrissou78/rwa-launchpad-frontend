// src/hooks/useChainConfig.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSwitchChain, useChainId } from "wagmi";
import {
  setCurrentChain,
  getCurrentChainId,
  subscribeToChainChanges,
  isCurrentChainDeployed,
  getSupportedChains,
  getDeployedChains,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getContracts,
  getTokens,
  getFees,
  getExplorerUrl,
  getIsTestnet,
  getNativeCurrency,
  SupportedChainId,
  ChainInfo,
  ContractsConfig,
  TokensConfig,
  FeesConfig,
} from "@/config/contracts";

export interface UseChainConfigReturn {
  // Current chain state
  chainId: SupportedChainId;
  chainName: string;
  isSupported: boolean;
  isDeployed: boolean;
  isTestnet: boolean;
  nativeCurrency: string;
  explorerUrl: string;
  
  // Contract data (null if chain not deployed)
  contracts: ContractsConfig | null;
  tokens: TokensConfig | null;
  fees: FeesConfig | null;
  
  // Chain lists
  supportedChains: ChainInfo[];
  deployedChains: ChainInfo[];
  
  // Actions
  switchToChain: (chainId: SupportedChainId) => Promise<void>;
  
  // URL helpers
  getTxUrl: (hash: string) => string;
  getAddressUrl: (address: string) => string;
  
  // Loading state
  isSwitching: boolean;
  switchError: Error | null;
}

export function useChainConfig(): UseChainConfigReturn {
  const { chain: connectedChain, isConnected } = useAccount();
  const wagmiChainId = useChainId();
  const { switchChainAsync, isPending: isSwitchPending, error: switchChainError } = useSwitchChain();
  
  const [chainId, setChainIdState] = useState<SupportedChainId>(getCurrentChainId());
  const [isSupported, setIsSupported] = useState(true);
  const [isDeployed, setIsDeployed] = useState(isCurrentChainDeployed());
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<Error | null>(null);

  // Sync when wallet chain changes (user switches in wallet or we switch programmatically)
  useEffect(() => {
    const walletChainId = connectedChain?.id || wagmiChainId;
    
    if (walletChainId && isConnected) {
      const supportedChains = getSupportedChains();
      const supported = supportedChains.some(c => c.id === walletChainId);
      
      setIsSupported(supported);
      
      if (supported) {
        // Update the global config to match wallet's chain
        setCurrentChain(walletChainId as SupportedChainId);
        setChainIdState(walletChainId as SupportedChainId);
        setIsDeployed(isCurrentChainDeployed());
        
        console.log(`[ChainConfig] Synced to wallet chain: ${walletChainId}`);
      } else {
        console.warn(`[ChainConfig] Wallet on unsupported chain: ${walletChainId}`);
      }
    }
  }, [connectedChain?.id, wagmiChainId, isConnected]);

  // Subscribe to programmatic chain changes (from other sources)
  useEffect(() => {
    return subscribeToChainChanges((newChainId) => {
      setChainIdState(newChainId);
      setIsDeployed(isCurrentChainDeployed());
    });
  }, []);

  // Switch chain function - updates both wallet AND config
  const switchToChain = useCallback(async (targetChainId: SupportedChainId) => {
    setIsSwitching(true);
    setSwitchError(null);

    try {
      // First, switch the wallet
      if (switchChainAsync && isConnected) {
        await switchChainAsync({ chainId: targetChainId });
        console.log(`[ChainConfig] Wallet switched to: ${targetChainId}`);
      }
      
      // Update our global config (this will also trigger via the useEffect above)
      setCurrentChain(targetChainId);
      setChainIdState(targetChainId);
      setIsDeployed(isCurrentChainDeployed());
      
      console.log(`[ChainConfig] Config updated to: ${targetChainId}`);
    } catch (error: any) {
      console.error('[ChainConfig] Switch failed:', error);
      setSwitchError(error);
      throw error;
    } finally {
      setIsSwitching(false);
    }
  }, [switchChainAsync, isConnected]);

  // Get current chain info
  const supportedChains = getSupportedChains();
  const deployedChains = getDeployedChains();
  const currentChain = supportedChains.find(c => c.id === chainId);

  return {
    chainId,
    chainName: currentChain?.name || "Unknown Network",
    isSupported,
    isDeployed,
    isTestnet: getIsTestnet(),
    nativeCurrency: getNativeCurrency(),
    explorerUrl: getExplorerUrl(),
    
    // Only return contract data if chain is deployed
    contracts: isSupported && isDeployed ? getContracts() : null,
    tokens: isSupported && isDeployed ? getTokens() : null,
    fees: isSupported && isDeployed ? getFees() : null,
    
    supportedChains,
    deployedChains,
    
    switchToChain,
    
    getTxUrl: getExplorerTxUrl,
    getAddressUrl: getExplorerAddressUrl,
    
    isSwitching: isSwitching || isSwitchPending,
    switchError: switchError || switchChainError || null,
  };
}
