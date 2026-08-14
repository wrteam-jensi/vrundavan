'use client';

import { useState, type FormEvent } from 'react';
import { createFarmer, deleteFarmer, updateFarmer, useFarmers } from '@/lib/harvest';
import type { Farmer } from '@/lib/types';
import '../admin.css';

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
    <div>
      <h1 className="admin-page-title">Farmers</h1>

      <form onSubmit={onSubmit} className="admin-form">
        <div className="admin-form-row">
          <label className="admin-field">
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="admin-field">
            Mobile (WhatsApp)
            <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
          </label>
          <label className="admin-field">
            Village
            <input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} required />
          </label>
        </div>
        <label className="admin-field admin-field-wide">
          Farm details
          <textarea value={form.farmDetails} onChange={(e) => setForm({ ...form, farmDetails: e.target.value })} rows={2} />
        </label>
        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editingId ? 'Update' : 'Add Farmer'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="admin-list">
          {farmers.map((f) => (
            <div key={f.id} className="admin-card">
              <div className="admin-card-body">
                <div className="admin-card-title">{f.name} <span className="sub">({f.village})</span></div>
                <div className="admin-card-meta">{f.mobile}{f.farmDetails ? ` — ${f.farmDetails}` : ''}</div>
              </div>
              <div className="admin-card-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(f)}>Edit</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(f.id)}>Delete</button>
              </div>
            </div>
          ))}
          {farmers.length === 0 && <div className="admin-empty">No farmers yet. Add one above.</div>}
        </div>
      )}
    </div>
  );
}
