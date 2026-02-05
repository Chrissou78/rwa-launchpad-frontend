'use client';

import { useAccount, useConnect, useDisconnect, useChainId, useReconnect } from 'wagmi';
import { polygonAmoy } from '@/config/wagmi';
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// Wallet icons
const walletIcons: Record<string, string> = {
  metaMask: '🦊',
  'io.metamask': '🦊',
  phantom: '👻',
  'app.phantom': '👻',
  coinbaseWallet: '🔵',
  coinbaseWalletSDK: '🔵',
  walletConnect: '🔗',
  injected: '💼',
  'app.subwallet': '📱',
};

const walletNames: Record<string, string> = {
  metaMask: 'MetaMask',
  'io.metamask': 'MetaMask',
  phantom: 'Phantom',
  'app.phantom': 'Phantom',
  coinbaseWallet: 'Coinbase Wallet',
  coinbaseWalletSDK: 'Coinbase Wallet',
  walletConnect: 'WalletConnect',
  injected: 'Browser Wallet',
  'app.subwallet': 'SubWallet',
};

// Connect Modal Context
interface ConnectModalContextType {
  openConnectModal: () => void;
  closeConnectModal: () => void;
  isOpen: boolean;
  isConnecting: boolean;
}

const ConnectModalContext = createContext<ConnectModalContextType | null>(null);

export function useConnectModal() {
  const context = useContext(ConnectModalContext);
  const [isOpen, setIsOpen] = useState(false);
  const { isPending } = useConnect();
  
  if (!context) {
    return {
      openConnectModal: () => setIsOpen(true),
      closeConnectModal: () => setIsOpen(false),
      isOpen,
      isConnecting: isPending,
    };
  }
  
  return context;
}

export function ConnectModalProvider({ children }: { children: ReactNode }) {
  const { isPending } = useConnect();
  const [isOpen, setIsOpen] = useState(false);

  const openConnectModal = useCallback(() => setIsOpen(true), []);
  const closeConnectModal = useCallback(() => setIsOpen(false), []);

  return (
    <ConnectModalContext.Provider value={{ 
      openConnectModal, 
      closeConnectModal, 
      isOpen, 
      isConnecting: isPending 
    }}>
      {children}
      {isOpen && <WalletModal onClose={closeConnectModal} />}
    </ConnectModalContext.Provider>
  );
}

// Wallet Selection Modal
function WalletModal({ onClose }: { onClose: () => void }) {
  const { connect, connectors, isPending, error } = useConnect();
  const { isConnected, address } = useAccount();
  const { reconnect } = useReconnect();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Close on successful connection
  useEffect(() => {
    if (isConnected && address) {
      console.log('Connected to:', address);
      onClose();
    }
  }, [isConnected, address, onClose]);

  // Filter connectors - keep unique ones, prioritize specific over generic
  const availableConnectors = connectors
    .filter((connector, index, self) => {
      const isFirst = index === self.findIndex(c => c.id === connector.id);
      // Skip generic 'injected' if we have specific ones
      if (connector.id === 'injected') {
        const hasSpecific = self.some(c => 
          c.id !== 'injected' && c.type === 'injected'
        );
        return !hasSpecific;
      }
      return isFirst;
    })
    // Remove duplicates by name (e.g., two MetaMask entries)
    .filter((connector, index, self) => {
      const name = walletNames[connector.id] || connector.name;
      const firstWithName = self.findIndex(c => 
        (walletNames[c.id] || c.name) === name
      );
      return index === firstWithName;
    });

  const handleConnect = async (connector: typeof connectors[0]) => {
    console.log('Attempting to connect with:', connector.id, connector.name);
    setConnectingId(connector.id);
    setLocalError(null);

    // First try to reconnect if already authorized
    try {
      // Check if this connector is already connected
      const provider = await connector.getProvider?.();
      if (provider) {
        // Try getting accounts - if we have them, we're already connected
        const accounts = await (provider as any).request?.({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          console.log('Already have accounts, reconnecting...');
          reconnect();
          onClose();
          return;
        }
      }
    } catch (e) {
      console.log('Provider check failed, proceeding with connect:', e);
    }

    // Proceed with normal connect
    connect(
      { connector },
      {
        onSuccess: (data) => {
          console.log('Connection successful:', data);
          setConnectingId(null);
          onClose();
        },
        onError: (err) => {
          console.error('Connection failed:', err);
          setConnectingId(null);
          
          // Handle "already connected" by just closing
          if (err.message?.includes('already connected')) {
            reconnect();
            onClose();
            return;
          }
          
          setLocalError(err.message || 'Connection failed');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Error display */}
        {(error || localError) && (
          <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{localError || error?.message}</p>
          </div>
        )}
        
        {/* Wallet List */}
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {availableConnectors.map((connector) => {
            const isConnecting = connectingId === connector.id;
            const icon = walletIcons[connector.id] || '💼';
            const name = walletNames[connector.id] || connector.name;
            
            return (
              <button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className="w-full flex items-center gap-4 p-4 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 group"
              >
                <span className="text-3xl">{icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-white font-semibold group-hover:text-blue-400 transition-colors">
                    {name}
                  </div>
                </div>
                {isConnecting ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <p className="text-gray-400 text-sm text-center">
            By connecting, you agree to the Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Connect Button
export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const [showModal, setShowModal] = useState(false);

  const context = useContext(ConnectModalContext);
  const openModal = context ? context.openConnectModal : () => setShowModal(true);
  const closeModal = context ? context.closeConnectModal : () => setShowModal(false);
  const isModalOpen = context ? context.isOpen : showModal;

  if (isConnected && address) {
    const isWrongNetwork = chainId !== polygonAmoy.id;
    
    return (
      <div className="flex items-center gap-3">
        {isWrongNetwork && (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
            Wrong Network
          </span>
        )}
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-gray-300 text-sm hidden sm:inline">
            {polygonAmoy.name}
          </span>
          <span className="text-white font-mono text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <button
            onClick={() => disconnect()}
            className="text-gray-400 hover:text-red-400 transition-colors ml-1 p-1"
            title="Disconnect"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={openModal}
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/25"
      >
        Connect Wallet
      </button>
      
      {!context && isModalOpen && <WalletModal onClose={closeModal} />}
    </>
  );
}
