// src/app/api/notifications/preferences/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
export async function GET(request: NextRequest) {
  const address = request.headers.get('x-wallet-address');
  
  if (!address) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_address', address.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Transform database format to frontend format
    const response = data ? {
      preferences: data.preferences || [],
      globalSettings: data.global_settings || {
        emailDigest: 'realtime',
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        timezone: 'UTC',
        soundEnabled: true,
        desktopNotifications: true,
      },
      contactInfo: data.contact_info || {
        email: '',
        phone: '',
        emailVerified: false,
        phoneVerified: false,
      },
    } : null;

    return NextResponse.json(response || {});
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const address = request.headers.get('x-wallet-address');
  
  if (!address) {
    return NextResponse.json({ error: 'Wallet address required' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_address: address.toLowerCase(),
        preferences: body.preferences,
        global_settings: body.globalSettings,
        contact_info: body.contactInfo,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_address',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error saving notification preferences:', error);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
}