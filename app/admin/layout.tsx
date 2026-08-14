'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { AdminUIProvider } from '@/components/AdminUI';
import './admin.css';

const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/admin/harvesting', label: 'Harvesting', icon: '🌾' },
  { href: '/admin/farmers', label: 'Farmers', icon: '👨‍🌾' },
  { href: '/admin/pak', label: 'Pak', icon: '🌱' },
  { href: '/admin/vaadis', label: 'Vaadis', icon: '🏞️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const online = useOnlineStatus();

  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) router.replace('/admin/login');
    if (user && isLoginPage) router.replace('/admin/dashboard');
  }, [user, loading, isLoginPage, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isLoginPage) return children;

  if (loading || !user) {
    return <div className="admin-loading">Loading…</div>;
  }

  return (
    <AdminUIProvider>
      <div className="admin-root">
        <header className={`admin-header${scrolled ? ' scrolled' : ''}`}>
          <span className="admin-brand">🌱 Vrundavan Admin</span>
          <button
            type="button"
            className="admin-menu-toggle"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          <nav className={`admin-nav${menuOpen ? ' open' : ''}`}>
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''}>
                <span aria-hidden="true">{link.icon}</span> {link.label}
              </a>
            ))}
          </nav>
          <button type="button" className="admin-signout" onClick={() => signOut(auth)}>
            Sign Out
          </button>
        </header>
        {!online && <div className="admin-offline-banner">📡 Offline — changes will sync when back online</div>}
        <main className="admin-main">{children}</main>
      </div>
    </AdminUIProvider>
  );
}
