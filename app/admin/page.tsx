'use client';

import { useState, type FormEvent } from 'react';
import { useCollection } from '@/lib/useCollection';
import { createDoc, deleteDocById, updateDocById } from '@/lib/crud';
import type { ProduceItem } from '@/lib/types';

const EMPTY = { emoji: '', name: '', tag: '', desc: '' };

export default function ProduceAdmin() {
  const { items, loading } = useCollection<ProduceItem>('produce');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startEdit = (item: ProduceItem) => {
    setEditingId(item.id);
    setForm({ emoji: item.emoji, name: item.name, tag: item.tag, desc: item.desc });
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
        await updateDocById('produce', editingId, form);
      } else {
        await createDoc('produce', form);
      }
      cancelEdit();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await deleteDocById('produce', id);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Produce Categories</h1>

      <form onSubmit={onSubmit} style={{ background: '#fff', padding: 20, borderRadius: 10, marginBottom: 24, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input placeholder="Emoji" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} required style={{ width: 60, padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
          <input placeholder="Tag" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} required style={{ width: 140, padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <textarea placeholder="Description" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} required rows={2} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6, fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={busy} style={{ padding: '8px 16px', background: '#2e5339', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
            {editingId ? 'Update' : 'Add'}
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
          {items.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: 12, borderRadius: 8 }}>
              <span style={{ fontSize: 24 }}>{item.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{item.name} <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>({item.tag})</span></div>
                <div style={{ fontSize: 13, color: '#666' }}>{item.desc}</div>
              </div>
              <button onClick={() => startEdit(item)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => onDelete(item.id)} style={{ padding: '6px 12px', border: '1px solid #f0c4c4', color: '#c0392b', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
