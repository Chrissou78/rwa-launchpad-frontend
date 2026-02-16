// src/hooks/useAdmin.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export type AdminRole = 'super_admin' | 'admin' | null;

export interface AdminUser {
  id: string;
  wallet_address: string;
  role: 'super_admin' | 'admin';
  promoted_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useAdmin() {
  const { address, isConnected } = useAccount();
  const [role, setRole] = useState<AdminRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isSuperAdmin = role === 'super_admin';

  // Fetch current user's admin role
  const fetchRole = useCallback(async () => {
    if (!address) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/role', {
        headers: {
          'x-wallet-address': address
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRole(data.role);
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Error fetching admin role:', error);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Fetch all admins
  const fetchAdmins = useCallback(async () => {
    if (!address || !isAdmin) {
      setAdmins([]);
      return;
    }

    try {
      const response = await fetch('/api/admin/list', {
        headers: {
          'x-wallet-address': address
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  }, [address, isAdmin]);

  // Promote user to admin
  const promoteUser = async (targetAddress: string, targetRole: 'admin' | 'super_admin') => {
    if (!address) return { success: false, error: 'Not connected' };

    try {
      const response = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address
        },
        body: JSON.stringify({ targetAddress, role: targetRole })
      });

      const data = await response.json();

      if (response.ok) {
        await fetchAdmins();
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Demote or remove admin
  const demoteUser = async (targetAddress: string, action: 'demote' | 'remove') => {
    if (!address) return { success: false, error: 'Not connected' };

    try {
      const response = await fetch('/api/admin/demote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address
        },
        body: JSON.stringify({ targetAddress, action })
      });

      const data = await response.json();

      if (response.ok) {
        await fetchAdmins();
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Error demoting user:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

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
    isLoading,
    admins,
    promoteUser,
    demoteUser,
    refreshAdmins: fetchAdmins
  };
}
