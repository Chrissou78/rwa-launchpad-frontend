// src/app/admin/kyc/components/StatsCards.tsx
'use client';

import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Shield,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { formatNativeCurrency } from '../utils';
import { KYCSettings, PendingSubmission, PendingUpgrade } from '../types';

interface StatsCardsProps {
  pendingSubmissions: PendingSubmission[];
  pendingUpgrades: PendingUpgrade[];
  settings: KYCSettings | null;
  currencySymbol: string;
}

export function StatsCards({ 
  pendingSubmissions, 
  pendingUpgrades, 
  settings,
  currencySymbol 
}: StatsCardsProps) {
  const stats = [
    {
      label: 'Pending Submissions',
      value: pendingSubmissions.length,
      icon: Clock,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/30'
    },
    {
      label: 'Pending Upgrades',
      value: pendingUpgrades.length,
      icon: TrendingUp,
      color: 'text-blue-400',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/30'
    },
    {
      label: 'KYC Fee',
      value: settings ? formatNativeCurrency(settings.kycFee, currencySymbol) : '-',
      icon: DollarSign,
      color: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30'
    },
    {
      label: 'Contract Status',
      value: settings?.isPaused ? 'Paused' : 'Active',
      icon: settings?.isPaused ? AlertTriangle : Shield,
      color: settings?.isPaused ? 'text-red-400' : 'text-green-400',
      bg: settings?.isPaused ? 'bg-red-500/20' : 'bg-green-500/20',
      border: settings?.isPaused ? 'border-red-500/30' : 'border-green-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`${stat.bg} ${stat.border} border rounded-xl p-4`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">{stat.label}</span>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <p className={`text-2xl font-bold ${stat.color}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
