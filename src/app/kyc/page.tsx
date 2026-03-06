// src/app/kyc/page.tsx
import { KYCSubmissionForm } from "./KYCSubmissionForm";
import Header from "@/components/Header";

export const metadata = {
  title: "KYC Verification | RWA Platform",
  description: "Complete your KYC verification to unlock investment features",
};

export default function KYCPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <main className="py-8">
        <KYCSubmissionForm />
      </main>
    </div>
  );
}
