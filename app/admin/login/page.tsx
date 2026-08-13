'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AdminLogin() {
  const router = useRouter();
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
      setError('Invalid email or password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f0' }}>
      <form onSubmit={onSubmit} style={{ width: 340, background: '#fff', padding: 32, borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,.08)' }}>
        <h1 style={{ fontSize: 20, marginBottom: 24 }}>Vrundavan Farm Admin</h1>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: '8px 10px', marginBottom: 16, border: '1px solid #ddd', borderRadius: 6 }}
        />
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: '8px 10px', marginBottom: 16, border: '1px solid #ddd', borderRadius: 6 }}
        />
        {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={busy}
          style={{ width: '100%', padding: '10px 0', background: '#2e5339', color: '#fff', border: 0, borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}
        >
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
