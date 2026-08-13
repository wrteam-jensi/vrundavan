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
import { useRatePerHour } from '@/lib/useSettings';
import type { HarvestEntry } from '@/lib/types';

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
  const { farmers } = useFarmers();
  const { entries, loading } = useHarvestEntries();
  const rate = useRatePerHour();
  const [form, setForm] = useState(emptyForm(0));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [farmerFilter, setFarmerFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (rate != null && !editingId) setForm((f) => ({ ...f, ratePerHour: rate }));
  }, [rate, editingId]);

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
      } else {
        await createHarvestEntry(data);
      }
      cancelEdit();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this harvesting entry?')) return;
    await deleteHarvestEntry(id);
  };

  const filtered = entries.filter(
    (e) => (!farmerFilter || e.farmerId === farmerFilter) && (!dateFilter || e.date === dateFilter)
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

  const cardStyle = { background: '#fff', padding: 16, borderRadius: 10, flex: '1 1 160px' };

  return (
    <div style={{ maxWidth: 960 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Harvesting</h1>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#888' }}>Today's Hours</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.todayHours}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#888' }}>Today's Amount</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>₹{summary.todayAmount}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#888' }}>Total Hours</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.totalHours}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#888' }}>Total Earnings</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>₹{summary.totalEarnings}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: '#888' }}>Total Pending</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#c0392b' }}>₹{summary.totalPending}</div>
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ background: '#fff', padding: 20, borderRadius: 10, marginBottom: 24, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={form.farmerId} onChange={(e) => setForm({ ...form, farmerId: e.target.value })} required style={{ flex: '1 1 200px', padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
            <option value="">Select Farmer</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>{f.name} ({f.village})</option>
            ))}
          </select>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required style={{ flex: '1 1 140px', padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 140px', fontSize: 12, color: '#666' }}>
            Start Time
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6, marginTop: 4 }} />
          </label>
          <label style={{ flex: '1 1 140px', fontSize: 12, color: '#666' }}>
            End Time
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6, marginTop: 4 }} />
          </label>
          <label style={{ flex: '1 1 140px', fontSize: 12, color: '#666' }}>
            Rate / Hour (₹)
            <input type="number" min={0} step="0.01" value={form.ratePerHour} onChange={(e) => setForm({ ...form, ratePerHour: Number(e.target.value) })} required style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6, marginTop: 4 }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 140px', fontSize: 12, color: '#666' }}>
            Advance (₹)
            <input type="number" min={0} step="0.01" value={form.advanceAmount} onChange={(e) => setForm({ ...form, advanceAmount: Number(e.target.value) })} style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6, marginTop: 4 }} />
          </label>
          <label style={{ flex: '1 1 140px', fontSize: 12, color: '#666' }}>
            Paid Now (₹)
            <input type="number" min={0} step="0.01" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: Number(e.target.value) })} style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6, marginTop: 4 }} />
          </label>
          <input placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} style={{ flex: '1 1 200px', padding: 8, border: '1px solid #ddd', borderRadius: 6, alignSelf: 'flex-end' }} />
        </div>

        <div style={{ display: 'flex', gap: 20, fontSize: 14, background: '#f4f4f0', padding: '10px 14px', borderRadius: 8 }}>
          <span>Hours: <strong>{hours}</strong></span>
          <span>Total: <strong>₹{total}</strong></span>
          <span>Pending: <strong style={{ color: pending > 0 ? '#c0392b' : '#2e5339' }}>₹{pending}</strong></span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={busy || hours <= 0} style={{ padding: '8px 16px', background: '#2e5339', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
            {editingId ? 'Update Entry' : 'Add Entry'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={farmerFilter} onChange={(e) => setFarmerFilter(e.target.value)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
          <option value="">All Farmers</option>
          {farmers.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }} />
        {(farmerFilter || dateFilter) && (
          <button type="button" onClick={() => { setFarmerFilter(''); setDateFilter(''); }} style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filtered.map((entry) => (
            <div key={entry.id} style={{ background: '#fff', padding: 12, borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600 }}>{entry.farmerName} <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}>{entry.date} · {entry.startTime}–{entry.endTime}</span></div>
                  <div style={{ fontSize: 13, color: '#666' }}>
                    {entry.hours}h × ₹{entry.ratePerHour} = ₹{entry.totalAmount}
                    {' · '}Advance ₹{entry.advanceAmount} · Paid ₹{entry.paidAmount} · Pending <strong style={{ color: entry.pendingAmount > 0 ? '#c0392b' : '#2e5339' }}>₹{entry.pendingAmount}</strong>
                  </div>
                  {entry.note && <div style={{ fontSize: 12, color: '#999' }}>{entry.note}</div>}
                </div>
                <a href={whatsAppUrl(entry)} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', border: '1px solid #25D366', color: '#128C7E', borderRadius: 6, background: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                  Send WhatsApp
                </a>
                <button type="button" onClick={() => startEdit(entry)} style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Edit</button>
                <button type="button" onClick={() => onDelete(entry.id)} style={{ padding: '6px 12px', border: '1px solid #f0c4c4', color: '#c0392b', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: '#888' }}>No harvesting entries found.</p>}
        </div>
      )}
    </div>
  );
}
