'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createHarvestEntry,
  deleteHarvestEntry,
  hoursBetween,
  updateHarvestEntry,
  useFarmers,
  useHarvestEntries,
  whatsAppUrl,
} from '@/lib/harvest';
import { updateRatePerHour, useRatePerHour } from '@/lib/useSettings';
import type { HarvestEntry } from '@/lib/types';
import MonthlyStatement from '@/components/MonthlyStatement';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import '../admin.css';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = (rate: number) => ({
  farmerId: '',
  date: todayStr(),
  startTime: '08:00',
  endTime: '12:00',
  ratePerHour: rate,
  advanceAmount: 0,
  paidAmount: 0,
  note: '',
});

export default function HarvestingAdmin() {
  const { showToast, confirm } = useAdminUI();
  const { farmers } = useFarmers();
  const { entries, loading } = useHarvestEntries();
  const rate = useRatePerHour();
  const [form, setForm] = useState(emptyForm(0));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [farmerFilter, setFarmerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [rateBusy, setRateBusy] = useState(false);
  const [rateEditing, setRateEditing] = useState(false);

  useEffect(() => {
    if (rate != null && !editingId) setForm((f) => ({ ...f, ratePerHour: rate }));
  }, [rate, editingId]);

  useEffect(() => {
    if (rate != null) setRateInput(String(rate));
  }, [rate]);

  const hours = hoursBetween(form.startTime, form.endTime);
  const total = Math.round(hours * form.ratePerHour * 100) / 100;
  const pending = Math.round((total - form.advanceAmount - form.paidAmount) * 100) / 100;

  const startEdit = (entry: HarvestEntry) => {
    setEditingId(entry.id);
    setForm({
      farmerId: entry.farmerId,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      ratePerHour: entry.ratePerHour,
      advanceAmount: entry.advanceAmount,
      paidAmount: entry.paidAmount,
      note: entry.note,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm(rate ?? 0));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const farmer = farmers.find((f) => f.id === form.farmerId);
    if (!farmer || hours <= 0) return;
    setBusy(true);
    try {
      const data = {
        farmerId: farmer.id,
        farmerName: farmer.name,
        farmerMobile: farmer.mobile,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        hours,
        ratePerHour: form.ratePerHour,
        totalAmount: total,
        advanceAmount: form.advanceAmount,
        paidAmount: form.paidAmount,
        pendingAmount: pending,
        note: form.note,
        createdAt: editingId ? (entries.find((e) => e.id === editingId)?.createdAt ?? Date.now()) : Date.now(),
      };
      if (editingId) {
        await updateHarvestEntry(editingId, data);
        showToast('Entry updated.');
      } else {
        await createHarvestEntry(data);
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
    if (!(await confirm('Delete this harvesting entry? This cannot be undone.'))) return;
    await deleteHarvestEntry(id);
    showToast('Entry deleted.');
  };

  const onSaveRate = async () => {
    setRateBusy(true);
    try {
      await updateRatePerHour(Number(rateInput));
      setRateEditing(false);
      showToast('Default rate updated.');
    } finally {
      setRateBusy(false);
    }
  };

  const filtered = entries.filter(
    (e) =>
      (!farmerFilter || e.farmerId === farmerFilter) &&
      (!dateFilter || e.date === dateFilter) &&
      (!pendingOnly || e.pendingAmount > 0)
  );

  const summary = useMemo(() => {
    const today = todayStr();
    const todayEntries = entries.filter((e) => e.date === today);
    return {
      todayHours: todayEntries.reduce((s, e) => s + e.hours, 0),
      todayAmount: todayEntries.reduce((s, e) => s + e.totalAmount, 0),
      totalHours: entries.reduce((s, e) => s + e.hours, 0),
      totalEarnings: entries.reduce((s, e) => s + e.totalAmount, 0),
      totalPending: entries.reduce((s, e) => s + e.pendingAmount, 0),
    };
  }, [entries]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <h1 className="admin-page-title" style={{ marginBottom: 0 }}>Harvesting</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {rateEditing ? (
            <>
              <label className="admin-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, fontSize: 13 }}>
                Default Rate/Hour (₹)
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  style={{ width: 100 }}
                />
              </label>
              <button type="button" className="btn btn-primary btn-sm" disabled={rateBusy} onClick={onSaveRate}>
                {rateBusy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRateEditing(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRateEditing(true)}>
              Default Rate: ₹{rate ?? '—'}/hr
            </button>
          )}
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Today's Hours</div>
          <div className="admin-stat-value">{summary.todayHours}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Today's Amount</div>
          <div className="admin-stat-value">₹{summary.todayAmount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Hours</div>
          <div className="admin-stat-value">{summary.totalHours}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Earnings</div>
          <div className="admin-stat-value">₹{summary.totalEarnings}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Pending</div>
          <div className="admin-stat-value warn">₹{summary.totalPending}</div>
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
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </div>
        <div className="admin-form-row">
          <label className="admin-field">
            Start Time
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
          </label>
          <label className="admin-field">
            End Time
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
          </label>
          <label className="admin-field">
            Rate / Hour (₹)
            <input type="number" min={0} step="0.01" value={form.ratePerHour} onChange={(e) => setForm({ ...form, ratePerHour: Number(e.target.value) })} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field">
            Advance (₹)
            <input type="number" min={0} step="0.01" value={form.advanceAmount} onChange={(e) => setForm({ ...form, advanceAmount: Number(e.target.value) })} />
          </label>
          <label className="admin-field">
            Paid Now (₹)
            <input type="number" min={0} step="0.01" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: Number(e.target.value) })} />
          </label>
          <label className="admin-field">
            Note (optional)
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
        </div>

        <div className="admin-form-summary">
          <span>Hours: <strong>{hours}</strong></span>
          <span>Total: <strong>₹{total}</strong></span>
          <span className={pending > 0 ? 'pending-due' : 'pending-ok'}>Pending: <strong>₹{pending}</strong></span>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || hours <= 0}>
            {editingId ? 'Update Entry' : 'Add Entry'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <MonthlyStatement farmers={farmers} entries={entries} />

      <div className="admin-filters">
        <select value={farmerFilter} onChange={(e) => setFarmerFilter(e.target.value)}>
          <option value="">All Farmers</option>
          {farmers.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        <button
          type="button"
          className={`btn btn-sm ${pendingOnly ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setPendingOnly((p) => !p)}
        >
          Pending Payment Only
        </button>
        {(farmerFilter || dateFilter || pendingOnly) && (
          <button type="button" className="btn btn-secondary" onClick={() => { setFarmerFilter(''); setDateFilter(''); setPendingOnly(false); }}>
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : (
        <div className="admin-list">
          {filtered.map((entry) => (
            <div key={entry.id} className="admin-card">
              <div className="admin-card-body">
                <div className="admin-card-title">
                  {entry.farmerName} <span className="sub">{entry.date} · {entry.startTime}–{entry.endTime}</span>
                </div>
                <div className="admin-card-meta">
                  {entry.hours}h × ₹{entry.ratePerHour} = ₹{entry.totalAmount}
                  {' · '}Advance ₹{entry.advanceAmount} · Paid ₹{entry.paidAmount} · Pending{' '}
                  <strong style={{ color: entry.pendingAmount > 0 ? '#c0392b' : '#2e5339' }}>₹{entry.pendingAmount}</strong>
                </div>
                {entry.note && <div className="admin-card-meta">{entry.note}</div>}
              </div>
              <div className="admin-card-actions">
                <a href={whatsAppUrl(entry)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm">
                  Send WhatsApp
                </a>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(entry)}>Edit</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(entry.id)}>Delete</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="admin-empty">No harvesting entries found.</div>}
        </div>
      )}
    </div>
  );
}
