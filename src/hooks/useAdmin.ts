// src/hooks/useAdmin.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useChainConfig } from './useChainConfig';

export interface AdminUser {
  id: string;
  wallet_address: string;
  role: 'admin' | 'super_admin';
  promoted_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useAdmin() {
  const { address } = useAccount();
  const { chainId } = useChainConfig();
  
  const [role, setRole] = useState<'admin' | 'super_admin' | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  const fetchRole = useCallback(async () => {
    if (!address) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/check', {
        headers: {
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRole(data.role || (data.isAdmin ? (data.isSuperAdmin ? 'super_admin' : 'admin') : null));
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, [address, chainId]);

  const fetchAdmins = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/admin/list', {
        headers: {
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  }, [address, chainId]);

  const refreshAdmins = useCallback(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const promoteUser = useCallback(async (
    targetAddress: string,
    targetRole: 'admin' | 'super_admin'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!address) return { success: false, error: 'Not connected' };

    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || '',
        },
        body: JSON.stringify({ targetAddress, role: targetRole }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        await fetchAdmins();
        return { success: true };
      }
      
      return { success: false, error: data.error || 'Failed to promote user' };
    } catch (error) {
      return { success: false, error: 'An error occurred' };
    }
  }, [address, chainId, fetchAdmins]);

  const demoteUser = useCallback(async (
    targetAddress: string,
    action: 'demote' | 'remove'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!address) return { success: false, error: 'Not connected' };

    try {
      const response = await fetch('/api/admin/demote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || '',
        },
        body: JSON.stringify({ targetAddress, action }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        await fetchAdmins();
        return { success: true };
      }
      
      return { success: false, error: data.error || 'Failed to update user' };
    } catch (error) {
      return { success: false, error: 'An error occurred' };
    }
  }, [address, chainId, fetchAdmins]);

  useEffect(() => {
    fetchRole();
  }, [fetchRole]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdmins();
    }
  }, [isAdmin, fetchAdmins]);

  return {
    role,
    isAdmin,
    isSuperAdmin,
    admins,
    loading,
    promoteUser,
    demoteUser,
    refreshAdmins,
  };
}
