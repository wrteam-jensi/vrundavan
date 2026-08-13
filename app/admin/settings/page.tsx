'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { updateRatePerHour, useRatePerHour } from '@/lib/useSettings';

export default function SettingsAdmin() {
  const rate = useRatePerHour();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (rate != null) setValue(String(rate));
  }, [rate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await updateRatePerHour(Number(value));
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Settings</h1>
      <form onSubmit={onSubmit} style={{ background: '#fff', padding: 20, borderRadius: 10, display: 'grid', gap: 10 }}>
        <label style={{ fontSize: 13, color: '#666' }}>
          Default Rate per Hour (₹)
          <input
            type="number"
            min={0}
            step="0.01"
            value={value}
            onChange={(e) => { setValue(e.target.value); setSaved(false); }}
            required
            style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6, marginTop: 4 }}
          />
        </label>
        <button type="submit" disabled={busy} style={{ padding: '8px 16px', background: '#2e5339', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
          {busy ? 'Saving…' : 'Save'}
        </button>
        {saved && <p style={{ color: '#2e5339', fontSize: 13 }}>Saved.</p>}
      </form>
    </div>
  );
}
