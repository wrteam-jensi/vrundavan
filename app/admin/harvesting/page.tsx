'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createHarvestEntry,
  deleteHarvestEntry,
  hoursBetween,
  markEntriesPaid,
  updateHarvestEntry,
  useFarmers,
  useHarvestEntries,
  whatsAppFarmerUrl,
} from '@/lib/harvest';
import { updateRatePerHour, useRatePerHour } from '@/lib/useSettings';
import { downloadCsv } from '@/lib/csvExport';
import type { HarvestEntry } from '@/lib/types';
import MonthlyStatement from '@/components/MonthlyStatement';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import { useLanguage } from '@/lib/i18n';
import '../admin.css';

function useCsvColumns(): { key: keyof HarvestEntry; label: string }[] {
  const { t } = useLanguage();
  return [
    { key: 'date', label: t('harvesting.csv.date') },
    { key: 'farmerName', label: t('harvesting.csv.farmer') },
    { key: 'startTime', label: t('harvesting.csv.startTime') },
    { key: 'endTime', label: t('harvesting.csv.endTime') },
    { key: 'hours', label: t('harvesting.csv.hours') },
    { key: 'ratePerHour', label: t('harvesting.csv.ratePerHour') },
    { key: 'totalAmount', label: t('harvesting.csv.totalAmount') },
    { key: 'advanceAmount', label: t('harvesting.csv.advance') },
    { key: 'paidAmount', label: t('harvesting.csv.paid') },
    { key: 'pendingAmount', label: t('harvesting.csv.pending') },
    { key: 'note', label: t('harvesting.csv.note') },
  ];
}

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
  const { t } = useLanguage();
  const CSV_COLUMNS = useCsvColumns();
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [markingPaid, setMarkingPaid] = useState(false);

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

  const repeatLastEntry = () => {
    if (entries.length === 0) return;
    const last = entries[0];
    setEditingId(null);
    setForm({
      farmerId: last.farmerId,
      date: todayStr(),
      startTime: last.startTime,
      endTime: last.endTime,
      ratePerHour: last.ratePerHour,
      advanceAmount: 0,
      paidAmount: 0,
      note: '',
    });
    showToast(t('harvesting.toast.prefilled').replace('{name}', last.farmerName));
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
        showToast(t('harvesting.toast.entryUpdated'));
      } else {
        await createHarvestEntry(data);
        showToast(t('harvesting.toast.entryAdded'));
      }
      cancelEdit();
    } catch {
      showToast(t('harvesting.toast.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (entry: HarvestEntry) => {
    if (
      !(await confirm(
        t('harvesting.confirm.delete').replace('{name}', entry.farmerName).replace('{date}', entry.date)
      ))
    )
      return;
    const { id, ...data } = entry;
    await deleteHarvestEntry(id);
    showToast(t('harvesting.toast.entryDeleted'), {
      action: {
        label: t('harvesting.toast.undo'),
        onClick: async () => {
          await createHarvestEntry(data);
          showToast(t('harvesting.toast.entryRestored'));
        },
      },
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onMarkSelectedPaid = async () => {
    const selected = entries.filter((e) => selectedIds.has(e.id));
    if (selected.length === 0) return;
    const unit = selected.length === 1 ? t('harvesting.unit.entry') : t('harvesting.unit.entries');
    if (!(await confirm(t('harvesting.confirm.markPaid').replace('{count}', String(selected.length)).replace('{unit}', unit))))
      return;
    setMarkingPaid(true);
    try {
      await markEntriesPaid(selected);
      showToast(t('harvesting.toast.markedPaid').replace('{count}', String(selected.length)).replace('{unit}', unit));
      setSelectedIds(new Set());
    } catch {
      showToast(t('harvesting.toast.error'), 'error');
    } finally {
      setMarkingPaid(false);
    }
  };

  const onSaveRate = async () => {
    setRateBusy(true);
    try {
      await updateRatePerHour(Number(rateInput));
      setRateEditing(false);
      showToast(t('harvesting.toast.rateUpdated'));
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

  const groupedByFarmer = useMemo(() => {
    const map = new Map<string, { farmerId: string; farmerName: string; entries: HarvestEntry[]; pendingTotal: number }>();
    for (const e of filtered) {
      const g = map.get(e.farmerId) ?? { farmerId: e.farmerId, farmerName: e.farmerName, entries: [], pendingTotal: 0 };
      g.entries.push(e);
      g.pendingTotal = Math.round((g.pendingTotal + e.pendingAmount) * 100) / 100;
      map.set(e.farmerId, g);
    }
    for (const g of map.values()) {
      g.entries.sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));
    }
    return Array.from(map.values());
  }, [filtered]);

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
        <h1 className="admin-page-title" style={{ marginBottom: 0 }}>{t('harvesting.title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {rateEditing ? (
            <>
              <label className="admin-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, fontSize: 13 }}>
                {t('harvesting.defaultRateLabel')}
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
                {rateBusy ? t('harvesting.saving') : t('harvesting.save')}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRateEditing(false)}>
                {t('harvesting.cancel')}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRateEditing(true)}>
              {t('harvesting.defaultRateButton').replace('{rate}', String(rate ?? '—'))}
            </button>
          )}
        </div>
      </div>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('harvesting.stat.todayHours')}</div>
          <div className="admin-stat-value">{summary.todayHours}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('harvesting.stat.todayAmount')}</div>
          <div className="admin-stat-value">₹{summary.todayAmount}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('harvesting.stat.totalHours')}</div>
          <div className="admin-stat-value">{summary.totalHours}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('harvesting.stat.totalEarnings')}</div>
          <div className="admin-stat-value">₹{summary.totalEarnings}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('harvesting.stat.totalPending')}</div>
          <div className="admin-stat-value warn">₹{summary.totalPending}</div>
        </div>
      </div>

      {entries.length > 0 && !editingId && (
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginBottom: 10 }} onClick={repeatLastEntry}>
          {t('harvesting.repeatLastEntry').replace('{name}', entries[0].farmerName)}
        </button>
      )}

      <form onSubmit={onSubmit} className="admin-form">
        <div className="admin-form-row">
          <select value={form.farmerId} onChange={(e) => setForm({ ...form, farmerId: e.target.value })} required>
            <option value="">{t('harvesting.selectFarmer')}</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>{f.name} ({f.village})</option>
            ))}
          </select>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </div>
        <div className="admin-form-row">
          <label className="admin-field">
            {t('harvesting.startTime')}
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
          </label>
          <label className="admin-field">
            {t('harvesting.endTime')}
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
          </label>
          <label className="admin-field">
            {t('harvesting.ratePerHour')}
            <input type="number" min={0} step="0.01" value={form.ratePerHour} onChange={(e) => setForm({ ...form, ratePerHour: Number(e.target.value) })} required />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field">
            {t('harvesting.advance')}
            <input type="number" min={0} step="0.01" value={form.advanceAmount} onChange={(e) => setForm({ ...form, advanceAmount: Number(e.target.value) })} />
          </label>
          <label className="admin-field">
            {t('harvesting.paidNow')}
            <input type="number" min={0} step="0.01" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: Number(e.target.value) })} />
          </label>
          <label className="admin-field">
            {t('harvesting.noteOptional')}
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </label>
        </div>

        <div className="admin-form-summary">
          <span>{t('harvesting.summary.hours')} <strong>{hours}</strong></span>
          <span>{t('harvesting.summary.total')} <strong>₹{total}</strong></span>
          <span className={pending > 0 ? 'pending-due' : 'pending-ok'}>{t('harvesting.summary.pending')} <strong>₹{pending}</strong></span>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || hours <= 0}>
            {editingId ? t('harvesting.updateEntry') : t('harvesting.addEntry')}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              {t('harvesting.cancel')}
            </button>
          )}
        </div>
      </form>

      <MonthlyStatement farmers={farmers} entries={entries} />

      <div className="admin-filters">
        <select value={farmerFilter} onChange={(e) => setFarmerFilter(e.target.value)}>
          <option value="">{t('harvesting.allFarmers')}</option>
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
          {t('harvesting.pendingPaymentOnly')}
        </button>
        {(farmerFilter || dateFilter || pendingOnly) && (
          <button type="button" className="btn btn-secondary" onClick={() => { setFarmerFilter(''); setDateFilter(''); setPendingOnly(false); }}>
            {t('harvesting.clearFilters')}
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => downloadCsv(`harvesting-${todayStr()}.csv`, CSV_COLUMNS, filtered)}
        >
          {t('harvesting.exportCsv')}
        </button>
        {filtered.some((e) => e.pendingAmount > 0) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSelectedIds(new Set(filtered.filter((e) => e.pendingAmount > 0).map((e) => e.id)))}
          >
            {t('harvesting.selectAllPending')}
          </button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="admin-bulk-bar">
          <span>{t('harvesting.selectedCount').replace('{count}', String(selectedIds.size))}</span>
          <button type="button" className="btn btn-primary btn-sm" disabled={markingPaid} onClick={onMarkSelectedPaid}>
            {markingPaid ? t('harvesting.marking') : t('harvesting.markSelectedPaid')}
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(new Set())}>
            {t('harvesting.clearSelection')}
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={4} />
      ) : (
        <div className="admin-list">
          {groupedByFarmer.map((g) => (
            <div key={g.farmerId} className="admin-farmer-group">
              <div className="admin-farmer-group-header">
                <strong>{g.farmerName}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className={g.pendingTotal > 0 ? 'pending-due' : 'pending-ok'}>
                    {t('harvesting.card.pending')} <strong>₹{g.pendingTotal}</strong>
                  </span>
                  <a
                    href={whatsAppFarmerUrl(g.farmerName, g.entries[0].farmerMobile, g.entries, entries)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-whatsapp btn-sm"
                  >
                    {t('harvesting.sendWhatsApp')}
                  </a>
                </div>
              </div>
              {g.entries.map((entry) => (
                <div key={entry.id} className="admin-entry-row">
                  {entry.pendingAmount > 0 && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleSelect(entry.id)}
                      style={{ width: 18, height: 18, flexShrink: 0 }}
                      aria-label={t('harvesting.selectEntryAria').replace('{name}', entry.farmerName)}
                    />
                  )}
                  <div className="admin-card-body">
                    <div className="admin-card-title">
                      {entry.date} <span className="sub">{entry.startTime}–{entry.endTime}</span>
                    </div>
                    <div className="admin-card-meta">
                      {entry.hours}h × ₹{entry.ratePerHour} = ₹{entry.totalAmount}
                      {' · '}{t('harvesting.card.advance')} ₹{entry.advanceAmount} · {t('harvesting.card.paid')} ₹{entry.paidAmount} · {t('harvesting.card.pending')}{' '}
                      <strong style={{ color: entry.pendingAmount > 0 ? '#c0392b' : '#2e5339' }}>₹{entry.pendingAmount}</strong>
                    </div>
                    {entry.note && <div className="admin-card-meta">{entry.note}</div>}
                  </div>
                  <div className="admin-card-actions">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(entry)}>{t('harvesting.edit')}</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(entry)}>{t('harvesting.delete')}</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {filtered.length === 0 && <div className="admin-empty">{t('harvesting.noEntriesFound')}</div>}
        </div>
      )}
    </div>
  );
}
