// src/lib/admin.ts
import { getSupabaseAdmin } from './supabase';
import { NextRequest, NextResponse } from 'next/server';

export type AdminRole = 'super_admin' | 'admin' | null;

export interface AdminUser {
  id: string;
  wallet_address: string;
  role: 'super_admin' | 'admin';
  promoted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminActivityLog {
  id: string;
  action: string;
  actor_address: string;
  target_address: string | null;
  details: any;
  created_at: string;
}

// Get admin role for a wallet address
export async function getAdminRole(walletAddress: string): Promise<AdminRole> {
  try {
    const supabase = getSupabaseAdmin();
    const normalized = walletAddress.toLowerCase();

    const { data, error } = await supabase
      .from('admin_roles')
      .select('role')
      .eq('wallet_address', normalized)
      .single();

    if (error || !data) {
      return null;
    }

    return data.role as AdminRole;
  } catch (err) {
    console.error('Failed to get admin role:', err);
    return null;
  }
}

export async function validateAdminAccess(request: NextRequest): Promise<{
  isValid: boolean;
  walletAddress: string | null;
  error?: NextResponse;
}> {
  const walletAddress = request.headers.get('x-wallet-address');
  
  if (!walletAddress) {
    return {
      isValid: false,
      walletAddress: null,
      error: NextResponse.json({ error: 'Wallet address required' }, { status: 401 }),
    };
  }

  const adminCheck = await isAdmin(walletAddress);
  
  if (!adminCheck) {
    return {
      isValid: false,
      walletAddress,
      error: NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 }),
    };
  }

  return {
    isValid: true,
    walletAddress,
  };
}

// Check if wallet is any type of admin
export async function isAdmin(walletAddress: string): Promise<boolean> {
  const role = await getAdminRole(walletAddress);
  return role === 'admin' || role === 'super_admin';
}

// Check if wallet is super admin
export async function isSuperAdmin(walletAddress: string): Promise<boolean> {
  const role = await getAdminRole(walletAddress);
  return role === 'super_admin';
}

// Get all admins
export async function getAllAdmins(): Promise<AdminUser[]> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('admin_roles')
      .select('*')
      .order('role', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching admins:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to get admins:', err);
    return [];
  }
}

// Promote user to admin
export async function promoteToAdmin(
  targetAddress: string,
  promotedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const normalizedTarget = targetAddress.toLowerCase();
    const normalizedPromoter = promotedBy.toLowerCase();

    // Check if promoter is super admin
    const promoterRole = await getAdminRole(normalizedPromoter);
    if (promoterRole !== 'super_admin') {
      return { success: false, error: 'Only super admins can promote users' };
    }

    // Check if target is already an admin
    const existingRole = await getAdminRole(normalizedTarget);
    if (existingRole) {
      return { success: false, error: 'User is already an admin' };
    }

    // Add as admin
    const { error } = await supabase
      .from('admin_roles')
      .insert({
        wallet_address: normalizedTarget,
        role: 'admin',
        promoted_by: normalizedPromoter
      });

    if (error) {
      console.error('Error promoting to admin:', error);
      return { success: false, error: 'Failed to promote user' };
    }

    // Log activity
    await logAdminActivity('promote_admin', normalizedPromoter, normalizedTarget, {
      new_role: 'admin'
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to promote to admin:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Promote admin to super admin
export async function promoteToSuperAdmin(
  targetAddress: string,
  promotedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const normalizedTarget = targetAddress.toLowerCase();
    const normalizedPromoter = promotedBy.toLowerCase();

    // Check if promoter is super admin
    const promoterRole = await getAdminRole(normalizedPromoter);
    if (promoterRole !== 'super_admin') {
      return { success: false, error: 'Only super admins can promote to super admin' };
    }

    // Check current role
    const currentRole = await getAdminRole(normalizedTarget);
    if (currentRole === 'super_admin') {
      return { success: false, error: 'User is already a super admin' };
    }

    if (currentRole === 'admin') {
      // Update existing admin to super admin
      const { error } = await supabase
        .from('admin_roles')
        .update({ role: 'super_admin', promoted_by: normalizedPromoter })
        .eq('wallet_address', normalizedTarget);

      if (error) {
        console.error('Error promoting to super admin:', error);
        return { success: false, error: 'Failed to promote user' };
      }
    } else {
      // Insert new super admin
      const { error } = await supabase
        .from('admin_roles')
        .insert({
          wallet_address: normalizedTarget,
          role: 'super_admin',
          promoted_by: normalizedPromoter
        });

      if (error) {
        console.error('Error promoting to super admin:', error);
        return { success: false, error: 'Failed to promote user' };
      }
    }

    // Log activity
    await logAdminActivity('promote_super_admin', normalizedPromoter, normalizedTarget, {
      previous_role: currentRole,
      new_role: 'super_admin'
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to promote to super admin:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Demote super admin to admin
export async function demoteToAdmin(
  targetAddress: string,
  demotedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const normalizedTarget = targetAddress.toLowerCase();
    const normalizedDemoter = demotedBy.toLowerCase();

    // Check if demoter is super admin
    const demoterRole = await getAdminRole(normalizedDemoter);
    if (demoterRole !== 'super_admin') {
      return { success: false, error: 'Only super admins can demote users' };
    }

    // Check target's current role
    const targetRole = await getAdminRole(normalizedTarget);
    if (targetRole !== 'super_admin') {
      return { success: false, error: 'User is not a super admin' };
    }

    // Prevent self-demotion if you're the only super admin
    const allAdmins = await getAllAdmins();
    const superAdmins = allAdmins.filter(a => a.role === 'super_admin');
    if (superAdmins.length <= 1 && normalizedTarget === normalizedDemoter) {
      return { success: false, error: 'Cannot demote yourself - you are the only super admin' };
    }

    // Demote to admin
    const { error } = await supabase
      .from('admin_roles')
      .update({ role: 'admin' })
      .eq('wallet_address', normalizedTarget);

    if (error) {
      console.error('Error demoting to admin:', error);
      return { success: false, error: 'Failed to demote user' };
    }

    // Log activity
    await logAdminActivity('demote_to_admin', normalizedDemoter, normalizedTarget, {
      previous_role: 'super_admin',
      new_role: 'admin'
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to demote to admin:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Remove admin entirely
export async function removeAdmin(
  targetAddress: string,
  removedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const normalizedTarget = targetAddress.toLowerCase();
    const normalizedRemover = removedBy.toLowerCase();

    // Check if remover is super admin
    const removerRole = await getAdminRole(normalizedRemover);
    if (removerRole !== 'super_admin') {
      return { success: false, error: 'Only super admins can remove admins' };
    }

    // Check target's current role
    const targetRole = await getAdminRole(normalizedTarget);
    if (!targetRole) {
      return { success: false, error: 'User is not an admin' };
    }

    // Prevent removing super admins (they must be demoted first)
    if (targetRole === 'super_admin') {
      return { success: false, error: 'Cannot remove a super admin. Demote to admin first.' };
    }

    // Cannot remove yourself
    if (normalizedTarget === normalizedRemover) {
      return { success: false, error: 'Cannot remove yourself' };
    }

    // Remove admin
    const { error } = await supabase
      .from('admin_roles')
      .delete()
      .eq('wallet_address', normalizedTarget);

    if (error) {
      console.error('Error removing admin:', error);
      return { success: false, error: 'Failed to remove admin' };
    }

    // Log activity
    await logAdminActivity('remove_admin', normalizedRemover, normalizedTarget, {
      previous_role: targetRole
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to remove admin:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Log admin activity
export async function logAdminActivity(
  action: string,
  actorAddress: string,
  targetAddress: string | null,
  details?: any
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    await supabase
      .from('admin_activity_log')
      .insert({
        action,
        actor_address: actorAddress.toLowerCase(),
        target_address: targetAddress?.toLowerCase() || null,
        details
      });
  } catch (err) {
    console.error('Failed to log admin activity:', err);
  }
}

// Get admin activity log
export async function getAdminActivityLog(limit: number = 50): Promise<AdminActivityLog[]> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from('admin_activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching activity log:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Failed to get activity log:', err);
    return [];
  }
}