'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import './admin.css';

const NAV_LINKS = [
  { href: '/admin/harvesting', label: 'Harvesting' },
  { href: '/admin/farmers', label: 'Farmers' },
  { href: '/admin', label: 'Produce' },
  { href: '/admin/crops', label: 'Crops' },
  { href: '/admin/fruits', label: 'Fruits' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) router.replace('/admin/login');
    if (user && isLoginPage) router.replace('/admin');
  }, [user, loading, isLoginPage, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isLoginPage) return children;

  if (loading || !user) {
    return <div className="admin-loading">Loading…</div>;
  }

  return (
    <div className="admin-root">
      <header className="admin-header">
        <span className="admin-brand">Vrundavan Admin</span>
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
              {link.label}
            </a>
          ))}
        </nav>
        <button type="button" className="admin-signout" onClick={() => signOut(auth)}>
          Sign Out
        </button>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
