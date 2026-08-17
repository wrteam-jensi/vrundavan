'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/useAuth';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { AdminUIProvider } from '@/components/AdminUI';
import { LanguageProvider, useLanguage, type DictKey } from '@/lib/i18n';
import './admin.css';

const NAV_LINKS: { href: string; labelKey: DictKey; icon: string }[] = [
  { href: '/admin/dashboard', labelKey: 'layout.nav.dashboard', icon: '🏠' },
  { href: '/admin/harvesting', labelKey: 'layout.nav.harvesting', icon: '🌾' },
  { href: '/admin/farmers', labelKey: 'layout.nav.farmers', icon: '👨‍🌾' },
  { href: '/admin/pak', labelKey: 'layout.nav.pak', icon: '🌱' },
  { href: '/admin/vaadis', labelKey: 'layout.nav.vaadis', icon: '🏞️' },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const online = useOnlineStatus();
  const { lang, setLang, t } = useLanguage();

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
    return <div className="admin-loading">{t('layout.loading')}</div>;
  }

  return (
    <AdminUIProvider>
      <div className="admin-root">
        <header className={`admin-header${scrolled ? ' scrolled' : ''}`}>
          <span className="admin-brand">🌱 {t('layout.brand')}</span>
          <button
            type="button"
            className="admin-menu-toggle"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={t('layout.toggleMenu')}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          <nav className={`admin-nav${menuOpen ? ' open' : ''}`}>
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''}>
                <span aria-hidden="true">{link.icon}</span> {t(link.labelKey)}
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="admin-lang-toggle"
            onClick={() => setLang(lang === 'en' ? 'gu' : 'en')}
          >
            {t('layout.langToggle')}
          </button>
          <button type="button" className="admin-signout" onClick={() => signOut(auth)}>
            {t('layout.signOut')}
          </button>
        </header>
        {!online && <div className="admin-offline-banner">{t('layout.offline')}</div>}
        <main className="admin-main">{children}</main>
      </div>
    </AdminUIProvider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AdminShell>{children}</AdminShell>
    </LanguageProvider>
  );
}
