// src/app/admin/page.tsx
// This is a SERVER component - DO NOT add 'use client' here

// Force dynamic rendering - prevents static generation errors
export const dynamic = 'force-dynamic';

// Import the client component
import AdminClient from './AdminClient';

export default function AdminPage() {
  return <AdminClient />;
}