'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) router.replace('/admin/login');
    if (user && isLoginPage) router.replace('/admin');
  }, [user, loading, isLoginPage, router]);

  if (isLoginPage) return children;

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f0' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: '#fff', borderBottom: '1px solid #e5e5e0' }}>
        <nav style={{ display: 'flex', gap: 20, fontSize: 14, fontWeight: 600, flexWrap: 'wrap' }}>
          <a href="/admin/harvesting">Harvesting</a>
          <a href="/admin/farmers">Farmers</a>
          <a href="/admin">Produce</a>
          <a href="/admin/crops">Crops</a>
          <a href="/admin/fruits">Fruits</a>
          <a href="/admin/settings">Settings</a>
        </nav>
        <button
          type="button"
          onClick={() => signOut(auth)}
          style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}
        >
          Sign Out
        </button>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
