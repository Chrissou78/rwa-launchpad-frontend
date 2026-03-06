import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, isSuperAdmin, getAdminRole } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json({ isAdmin: false, isSuperAdmin: false, role: null });
    }

    const role = await getAdminRole(walletAddress);
    const adminCheck = role === 'admin' || role === 'super_admin';
    const superAdminCheck = role === 'super_admin';

    return NextResponse.json({ 
      isAdmin: adminCheck, 
      isSuperAdmin: superAdminCheck,
      role 
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false, isSuperAdmin: false, role: null });
  }
}
