'use client';

import { useState, type FormEvent } from 'react';
import { createFarmer, deleteFarmer, updateFarmer, useFarmers } from '@/lib/harvest';
import type { Farmer } from '@/lib/types';

const EMPTY = { name: '', mobile: '', village: '', farmDetails: '' };

export default function FarmersAdmin() {
  const { farmers, loading } = useFarmers();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startEdit = (f: Farmer) => {
    setEditingId(f.id);
    setForm({ name: f.name, mobile: f.mobile, village: f.village, farmDetails: f.farmDetails });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editingId) {
        await updateFarmer(editingId, form);
      } else {
        await createFarmer(form);
      }
      cancelEdit();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this farmer? Their harvesting history will remain but no longer link to a farmer record.')) return;
    await deleteFarmer(id);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Farmers</h1>

      <form onSubmit={onSubmit} style={{ background: '#fff', padding: 20, borderRadius: 10, marginBottom: 24, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ flex: '1 1 200px', padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
          <input placeholder="Mobile (WhatsApp)" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required style={{ flex: '1 1 160px', padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
          <input placeholder="Village" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} required style={{ flex: '1 1 160px', padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <textarea placeholder="Farm details" value={form.farmDetails} onChange={(e) => setForm({ ...form, farmDetails: e.target.value })} rows={2} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6, fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={busy} style={{ padding: '8px 16px', background: '#2e5339', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
            {editingId ? 'Update' : 'Add Farmer'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {farmers.map((f) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{f.name} <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>({f.village})</span></div>
                <div style={{ fontSize: 13, color: '#666' }}>{f.mobile}{f.farmDetails ? ` — ${f.farmDetails}` : ''}</div>
              </div>
              <button type="button" onClick={() => startEdit(f)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Edit</button>
              <button type="button" onClick={() => onDelete(f.id)} style={{ padding: '6px 12px', border: '1px solid #f0c4c4', color: '#c0392b', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
          {farmers.length === 0 && <p style={{ color: '#888' }}>No farmers yet. Add one above.</p>}
        </div>
      )}
    </div>
  );
}
