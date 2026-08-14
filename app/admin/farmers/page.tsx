'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createFarmer, deleteFarmer, updateFarmer, useFarmers, useHarvestEntries } from '@/lib/harvest';
import type { Farmer } from '@/lib/types';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import '../admin.css';

const EMPTY = { name: '', mobile: '', village: '', farmDetails: '' };

export default function FarmersAdmin() {
  const { showToast, confirm } = useAdminUI();
  const { farmers, loading } = useFarmers();
  const { entries } = useHarvestEntries();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'pending'>('name');

  const pendingByFarmer = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) map.set(e.farmerId, (map.get(e.farmerId) ?? 0) + e.pendingAmount);
    return map;
  }, [entries]);

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
        showToast('Farmer updated.');
      } else {
        await createFarmer(form);
        showToast('Farmer added.');
      }
      cancelEdit();
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!(await confirm('Delete this farmer? Their harvesting history will remain but no longer link to a farmer record.'))) return;
    await deleteFarmer(id);
    showToast('Farmer deleted.');
  };

  const visibleFarmers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? farmers.filter((f) => f.name.toLowerCase().includes(q) || f.village.toLowerCase().includes(q))
      : farmers;
    const sorted = [...filtered];
    if (sortBy === 'pending') {
      sorted.sort((a, b) => (pendingByFarmer.get(b.id) ?? 0) - (pendingByFarmer.get(a.id) ?? 0));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [farmers, search, sortBy, pendingByFarmer]);

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

      <div className="admin-filters">
        <input placeholder="Search by name or village…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'pending')}>
          <option value="name">Sort: Name</option>
          <option value="pending">Sort: Pending Amount</option>
        </select>
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : (
        <div className="admin-list">
          {visibleFarmers.map((f) => {
            const pending = pendingByFarmer.get(f.id) ?? 0;
            return (
              <div key={f.id} className="admin-card">
                <div className="admin-card-body">
                  <div className="admin-card-title">
                    <a href={`/admin/farmers/${f.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{f.name}</a> <span className="sub">({f.village})</span>
                  </div>
                  <div className="admin-card-meta">{f.mobile}{f.farmDetails ? ` — ${f.farmDetails}` : ''}</div>
                  {pending > 0 && (
                    <div className="admin-card-meta">
                      Pending: <strong style={{ color: '#c0392b' }}>₹{Math.round(pending * 100) / 100}</strong>
                    </div>
                  )}
                </div>
                <div className="admin-card-actions">
                  <a href={`/admin/farmers/${f.id}`} className="btn btn-secondary btn-sm">View</a>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(f)}>Edit</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(f.id)}>Delete</button>
                </div>
              </div>
            );
          })}
          {visibleFarmers.length === 0 && <div className="admin-empty">No farmers found.</div>}
        </div>
      )}
    </div>
  );
}
