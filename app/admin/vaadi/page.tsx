'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createFarmCropEntry, deleteFarmCropEntry, updateFarmCropEntry, useFarmCropEntries } from '@/lib/farmCrops';
import { useFarmers } from '@/lib/harvest';
import type { FarmCropEntry } from '@/lib/types';
import CropProfitSummary from '@/components/CropProfitSummary';
import YearlyComparison from '@/components/YearlyComparison';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import '../admin.css';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  farmerId: '',
  cropName: '',
  date: todayStr(),
  cost: 0,
  revenue: 0,
  note: '',
};

export default function VaadiAdmin() {
  const { showToast, confirm } = useAdminUI();
  const { farmers } = useFarmers();
  const { entries, loading } = useFarmCropEntries();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [farmerFilter, setFarmerFilter] = useState('');
  const [cropFilter, setCropFilter] = useState('');

  const profit = Math.round((form.revenue - form.cost) * 100) / 100;

  const startEdit = (entry: FarmCropEntry) => {
    setEditingId(entry.id);
    setForm({
      farmerId: entry.farmerId,
      cropName: entry.cropName,
      date: entry.date,
      cost: entry.cost,
      revenue: entry.revenue,
      note: entry.note,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const farmer = farmers.find((f) => f.id === form.farmerId);
    if (!farmer) return;
    setBusy(true);
    try {
      const data = {
        farmerId: farmer.id,
        farmerName: farmer.name,
        cropName: form.cropName,
        date: form.date,
        cost: form.cost,
        revenue: form.revenue,
        profit,
        note: form.note,
        createdAt: editingId ? (entries.find((e) => e.id === editingId)?.createdAt ?? Date.now()) : Date.now(),
      };
      if (editingId) {
        await updateFarmCropEntry(editingId, data);
        showToast('Entry updated.');
      } else {
        await createFarmCropEntry(data);
        showToast('Entry added.');
      }
      cancelEdit();
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!(await confirm('Delete this entry? This cannot be undone.'))) return;
    await deleteFarmCropEntry(id);
    showToast('Entry deleted.');
  };

  const filtered = entries.filter(
    (e) => (!farmerFilter || e.farmerId === farmerFilter) && (!cropFilter || e.cropName === cropFilter)
  );

  const cropNames = useMemo(() => Array.from(new Set(entries.map((e) => e.cropName))).sort(), [entries]);

  const summary = useMemo(() => {
    const totalCost = filtered.reduce((s, e) => s + e.cost, 0);
    const totalRevenue = filtered.reduce((s, e) => s + e.revenue, 0);
    return {
      totalCost: Math.round(totalCost * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit: Math.round((totalRevenue - totalCost) * 100) / 100,
    };
  }, [filtered]);

  return (
    <div>
      <h1 className="admin-page-title">My Farm (Vaadi)</h1>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Cost</div>
          <div className="admin-stat-value warn">₹{summary.totalCost}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Revenue</div>
          <div className="admin-stat-value">₹{summary.totalRevenue}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Profit</div>
          <div className="admin-stat-value" style={{ color: summary.totalProfit >= 0 ? '#2e5339' : '#c0392b' }}>
            ₹{summary.totalProfit}
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="admin-form">
        <div className="admin-form-row">
          <select value={form.farmerId} onChange={(e) => setForm({ ...form, farmerId: e.target.value })} required>
            <option value="">Select Farmer</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>{f.name} ({f.village})</option>
            ))}
          </select>
          <label className="admin-field">
            Crop (Pak)
            <input value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} required placeholder="e.g. Wheat, Cotton" />
          </label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </div>
        <div className="admin-form-row">
          <label className="admin-field">
            Cost (₹)
            <input type="number" min={0} step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} required />
          </label>
          <label className="admin-field">
            Revenue (₹)
            <input type="number" min={0} step="0.01" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: Number(e.target.value) })} required />
          </label>
          <label className="admin-field">
            Note (optional)
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
        </div>

        <div className="admin-form-summary">
          <span className={profit >= 0 ? 'pending-ok' : 'pending-due'}>Profit: <strong>₹{profit}</strong></span>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editingId ? 'Update Entry' : 'Add Entry'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <CropProfitSummary entries={filtered} />

      <YearlyComparison entries={entries} />

      <div className="admin-filters">
        <select value={farmerFilter} onChange={(e) => setFarmerFilter(e.target.value)}>
          <option value="">All Farmers</option>
          {farmers.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>
          <option value="">All Crops</option>
          {cropNames.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {(farmerFilter || cropFilter) && (
          <button type="button" className="btn btn-secondary" onClick={() => { setFarmerFilter(''); setCropFilter(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : (
        <div className="admin-list">
          {filtered.map((entry) => (
            <div key={entry.id} className="admin-card">
              <div className="admin-card-body">
                <div className="admin-card-title">
                  {entry.farmerName} <span className="sub">{entry.cropName} · {entry.date}</span>
                </div>
                <div className="admin-card-meta">
                  Cost ₹{entry.cost} · Revenue ₹{entry.revenue} · Profit{' '}
                  <strong style={{ color: entry.profit >= 0 ? '#2e5339' : '#c0392b' }}>₹{entry.profit}</strong>
                </div>
                {entry.note && <div className="admin-card-meta">{entry.note}</div>}
              </div>
              <div className="admin-card-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(entry)}>Edit</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(entry.id)}>Delete</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="admin-empty">No entries found.</div>}
        </div>
      )}
    </div>
  );
}
