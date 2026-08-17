'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import '../admin.css';

function AdminLoginForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/admin');
    } catch {
      setError(t('login.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login-wrap">
      <form onSubmit={onSubmit} className="admin-login-card">
        <div className="admin-login-title">{t('login.title')}</div>
        <div className="admin-login-sub">{t('login.subtitle')}</div>

        <div className="admin-login-field">
          <label htmlFor="email">{t('login.email')}</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="admin-login-field">
          <label htmlFor="password">{t('login.password')}</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <div className="admin-login-error">{error}</div>}

        <button type="submit" disabled={busy} className="btn btn-primary btn-block">
          {busy ? t('login.signingIn') : t('login.signIn')}
        </button>
      </form>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <LanguageProvider>
      <AdminLoginForm />
    </LanguageProvider>
  );
}
