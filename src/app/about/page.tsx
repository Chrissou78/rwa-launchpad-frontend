import { redirect } from 'next/navigation';

// Redirect /about to /about/company
export default function AboutPage() {
  redirect('/about/company');
}