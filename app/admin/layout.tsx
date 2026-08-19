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
  { href: '/admin/crops', labelKey: 'layout.nav.crops', icon: '🥕' },
  { href: '/admin/fruits', labelKey: 'layout.nav.fruits', icon: '🍎' },
];

// first 4 pin to the mobile bottom bar; rest live behind "More"
const TAB_BAR_LINKS = NAV_LINKS.slice(0, 4);
const MORE_LINKS = NAV_LINKS.slice(4);

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const online = useOnlineStatus();
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) router.replace('/admin/login');
    if (user && isLoginPage) router.replace('/admin/dashboard');
  }, [user, loading, isLoginPage, router]);

  useEffect(() => {
    setMoreOpen(false);
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

  const isMoreActive = MORE_LINKS.some((link) => link.href === pathname);

  return (
    <AdminUIProvider>
      <div className="admin-root">
        <header className={`admin-header${scrolled ? ' scrolled' : ''}`}>
          <span className="admin-brand">🌱 {t('layout.brand')}</span>
          <nav className="admin-nav">
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

        <nav className="admin-tabbar">
          {TAB_BAR_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''}>
              <span aria-hidden="true">{link.icon}</span>
              <span>{t(link.labelKey)}</span>
            </a>
          ))}
          <button
            type="button"
            className={isMoreActive ? 'active' : ''}
            onClick={() => setMoreOpen(true)}
          >
            <span aria-hidden="true">⋯</span>
            <span>{t('layout.more')}</span>
          </button>
        </nav>

        {moreOpen && (
          <div className="admin-sheet-backdrop" onClick={() => setMoreOpen(false)}>
            <div className="admin-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="admin-sheet-handle" />
              {MORE_LINKS.map((link) => (
                <a key={link.href} href={link.href} className={pathname === link.href ? 'active' : ''}>
                  <span aria-hidden="true">{link.icon}</span> {t(link.labelKey)}
                </a>
              ))}
              <div className="admin-sheet-divider" />
              <button type="button" onClick={() => setLang(lang === 'en' ? 'gu' : 'en')}>
                <span aria-hidden="true">🌐</span> {t('layout.langToggle')}
              </button>
              <button type="button" className="danger" onClick={() => signOut(auth)}>
                <span aria-hidden="true">🚪</span> {t('layout.signOut')}
              </button>
            </div>
          </div>
        )}
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
