'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createFarmCropEntry, deleteFarmCropEntry, updateFarmCropEntry, useFarmCropEntries } from '@/lib/farmCrops';
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
  cropName: '',
  seedQty: 0,
  seedUnit: 'kg',
  cost: 0,
  yieldQty: 0,
  yieldUnit: 'kg',
  saleDate: todayStr(),
  pricePerUnit: 0,
  note: '',
};

export default function VaadiAdmin() {
  const { showToast, confirm } = useAdminUI();
  const { entries, loading } = useFarmCropEntries();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cropFilter, setCropFilter] = useState('');

  const revenue = Math.round(form.yieldQty * form.pricePerUnit * 100) / 100;
  const profit = Math.round((revenue - form.cost) * 100) / 100;

  const startEdit = (entry: FarmCropEntry) => {
    setEditingId(entry.id);
    setForm({
      cropName: entry.cropName,
      seedQty: entry.seedQty,
      seedUnit: entry.seedUnit,
      cost: entry.cost,
      yieldQty: entry.yieldQty,
      yieldUnit: entry.yieldUnit,
      saleDate: entry.saleDate,
      pricePerUnit: entry.pricePerUnit,
      note: entry.note,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = {
        cropName: form.cropName,
        seedQty: form.seedQty,
        seedUnit: form.seedUnit,
        cost: form.cost,
        yieldQty: form.yieldQty,
        yieldUnit: form.yieldUnit,
        saleDate: form.saleDate,
        pricePerUnit: form.pricePerUnit,
        revenue,
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

  const filtered = entries.filter((e) => !cropFilter || e.cropName === cropFilter);

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
          <label className="admin-field">
            Crop (Pak)
            <input value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} required placeholder="e.g. Wheat, Cotton" />
          </label>
          <label className="admin-field">
            Seed Qty
            <input type="number" min={0} step="0.01" value={form.seedQty} onChange={(e) => setForm({ ...form, seedQty: Number(e.target.value) })} />
          </label>
          <label className="admin-field">
            Seed Unit
            <input value={form.seedUnit} onChange={(e) => setForm({ ...form, seedUnit: e.target.value })} placeholder="kg / bag / mann" />
          </label>
          <label className="admin-field">
            Cost (₹)
            <input type="number" min={0} step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field">
            Yield Qty (pak thayu)
            <input type="number" min={0} step="0.01" value={form.yieldQty} onChange={(e) => setForm({ ...form, yieldQty: Number(e.target.value) })} />
          </label>
          <label className="admin-field">
            Yield Unit
            <input value={form.yieldUnit} onChange={(e) => setForm({ ...form, yieldUnit: e.target.value })} placeholder="kg / quintal / mann" />
          </label>
          <label className="admin-field">
            Sale Date
            <input type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} required />
          </label>
          <label className="admin-field">
            Price / Unit (₹)
            <input type="number" min={0} step="0.01" value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: Number(e.target.value) })} />
          </label>
        </div>
        <label className="admin-field admin-field-wide">
          Note (optional)
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        <div className="admin-form-summary">
          <span>Revenue: <strong>₹{revenue}</strong></span>
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
        <select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>
          <option value="">All Crops</option>
          {cropNames.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {cropFilter && (
          <button type="button" className="btn btn-secondary" onClick={() => setCropFilter('')}>
            Clear Filter
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
                  {entry.cropName} <span className="sub">{entry.saleDate}</span>
                </div>
                <div className="admin-card-meta">
                  Seed: {entry.seedQty} {entry.seedUnit} · Yield: {entry.yieldQty} {entry.yieldUnit} · Price ₹{entry.pricePerUnit}/unit
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
