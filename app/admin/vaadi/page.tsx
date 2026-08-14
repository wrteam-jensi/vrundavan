'use client';

import { useRef, useMemo, useState, type FormEvent } from 'react';
import { createFarmCropEntry, deleteFarmCropEntry, updateFarmCropEntry, useFarmCropEntries } from '@/lib/farmCrops';
import { downloadCsv } from '@/lib/csvExport';
import { deleteImage, uploadImage } from '@/lib/crud';
import type { FarmCropEntry } from '@/lib/types';
import CropProfitSummary from '@/components/CropProfitSummary';
import YearlyComparison from '@/components/YearlyComparison';
import CostBreakdownChart from '@/components/CostBreakdownChart';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import '../admin.css';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const CSV_COLUMNS: { key: keyof FarmCropEntry; label: string }[] = [
  { key: 'saleDate', label: 'Sale Date' },
  { key: 'cropName', label: 'Crop' },
  { key: 'seedQty', label: 'Seed Qty' },
  { key: 'seedUnit', label: 'Seed Unit' },
  { key: 'costSeed', label: 'Cost - Seed' },
  { key: 'costFertilizer', label: 'Cost - Khatar' },
  { key: 'costPesticide', label: 'Cost - Dava' },
  { key: 'costLabor', label: 'Cost - Majoor' },
  { key: 'costFuel', label: 'Cost - Fuel' },
  { key: 'costOther', label: 'Cost - Other' },
  { key: 'cost', label: 'Total Cost' },
  { key: 'yieldQty', label: 'Yield Qty' },
  { key: 'yieldUnit', label: 'Yield Unit' },
  { key: 'pricePerUnit', label: 'Price/Unit' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'profit', label: 'Profit' },
  { key: 'note', label: 'Note' },
];

const EMPTY = {
  cropName: '',
  seedQty: 0,
  seedUnit: 'kg',
  costSeed: 0,
  costFertilizer: 0,
  costPesticide: 0,
  costLabor: 0,
  costFuel: 0,
  costOther: 0,
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
  const [yearFilter, setYearFilter] = useState('');
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set());
  const [existingReceipt, setExistingReceipt] = useState<{ url: string; path: string } | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const totalCost =
    Math.round((form.costSeed + form.costFertilizer + form.costPesticide + form.costLabor + form.costFuel + form.costOther) * 100) / 100;
  const revenue = Math.round(form.yieldQty * form.pricePerUnit * 100) / 100;
  const profit = Math.round((revenue - totalCost) * 100) / 100;

  const startEdit = (entry: FarmCropEntry) => {
    setEditingId(entry.id);
    setForm({
      cropName: entry.cropName,
      seedQty: entry.seedQty,
      seedUnit: entry.seedUnit,
      costSeed: entry.costSeed,
      costFertilizer: entry.costFertilizer,
      costPesticide: entry.costPesticide,
      costLabor: entry.costLabor,
      costFuel: entry.costFuel,
      costOther: entry.costOther,
      yieldQty: entry.yieldQty,
      yieldUnit: entry.yieldUnit,
      saleDate: entry.saleDate,
      pricePerUnit: entry.pricePerUnit,
      note: entry.note,
    });
    setExistingReceipt(entry.receiptUrl && entry.receiptPath ? { url: entry.receiptUrl, path: entry.receiptPath } : null);
    setReceiptFile(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
    setExistingReceipt(null);
    setReceiptFile(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let receiptUrl = existingReceipt?.url ?? null;
      let receiptPath = existingReceipt?.path ?? null;

      if (receiptFile) {
        if (existingReceipt) await deleteImage(existingReceipt.path);
        const uploaded = await uploadImage('vaadi-receipts', receiptFile);
        receiptUrl = uploaded.url;
        receiptPath = uploaded.path;
      }

      const data = {
        cropName: form.cropName,
        seedQty: form.seedQty,
        seedUnit: form.seedUnit,
        costSeed: form.costSeed,
        costFertilizer: form.costFertilizer,
        costPesticide: form.costPesticide,
        costLabor: form.costLabor,
        costFuel: form.costFuel,
        costOther: form.costOther,
        cost: totalCost,
        yieldQty: form.yieldQty,
        yieldUnit: form.yieldUnit,
        saleDate: form.saleDate,
        pricePerUnit: form.pricePerUnit,
        revenue,
        profit,
        note: form.note,
        receiptUrl,
        receiptPath,
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

  const onDelete = async (entry: FarmCropEntry) => {
    if (!(await confirm(`Delete this ${entry.cropName} entry?`))) return;
    const { id, ...data } = entry;
    await deleteFarmCropEntry(id);
    let restored = false;
    showToast('Entry deleted.', {
      action: {
        label: 'Undo',
        onClick: async () => {
          restored = true;
          await createFarmCropEntry(data);
          showToast('Entry restored.');
        },
      },
    });
    setTimeout(() => {
      if (!restored && entry.receiptPath) deleteImage(entry.receiptPath);
    }, 5500);
  };

  const filtered = entries.filter(
    (e) => (!cropFilter || e.cropName === cropFilter) && (!yearFilter || e.saleDate.startsWith(yearFilter))
  );

  const cropNames = useMemo(() => Array.from(new Set(entries.map((e) => e.cropName))).sort(), [entries]);
  const years = useMemo(
    () => Array.from(new Set(entries.map((e) => e.saleDate.slice(0, 4)))).sort((a, b) => Number(b) - Number(a)),
    [entries]
  );

  const groupedByYear = useMemo(() => {
    const map = new Map<string, FarmCropEntry[]>();
    for (const e of filtered) {
      const year = e.saleDate.slice(0, 4);
      const arr = map.get(year) ?? [];
      arr.push(e);
      map.set(year, arr);
    }
    return Array.from(map.entries()).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [filtered]);

  const toggleYear = (year: string) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

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
            <div className="admin-field-pair">
              <input type="number" min={0} step="0.01" value={form.seedQty} onChange={(e) => setForm({ ...form, seedQty: Number(e.target.value) })} />
              <input value={form.seedUnit} onChange={(e) => setForm({ ...form, seedUnit: e.target.value })} placeholder="kg" />
            </div>
          </label>
        </div>

        <div className="admin-cost-breakdown-label">Cost Breakdown (₹)</div>
        <div className="admin-form-row">
          <label className="admin-field">
            Seed (Beej)
            <input type="number" min={0} step="0.01" value={form.costSeed} onChange={(e) => setForm({ ...form, costSeed: Number(e.target.value) })} />
          </label>
          <label className="admin-field">
            Fertilizer (Khatar)
            <input type="number" min={0} step="0.01" value={form.costFertilizer} onChange={(e) => setForm({ ...form, costFertilizer: Number(e.target.value) })} />
          </label>
          <label className="admin-field">
            Pesticide (Dava)
            <input type="number" min={0} step="0.01" value={form.costPesticide} onChange={(e) => setForm({ ...form, costPesticide: Number(e.target.value) })} />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field">
            Labor (Majoor)
            <input type="number" min={0} step="0.01" value={form.costLabor} onChange={(e) => setForm({ ...form, costLabor: Number(e.target.value) })} />
          </label>
          <label className="admin-field">
            Fuel (Petrol/Diesel)
            <input type="number" min={0} step="0.01" value={form.costFuel} onChange={(e) => setForm({ ...form, costFuel: Number(e.target.value) })} />
          </label>
          <label className="admin-field">
            Other
            <input type="number" min={0} step="0.01" value={form.costOther} onChange={(e) => setForm({ ...form, costOther: Number(e.target.value) })} />
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field">
            Yield Qty (pak thayu)
            <div className="admin-field-pair">
              <input type="number" min={0} step="0.01" value={form.yieldQty} onChange={(e) => setForm({ ...form, yieldQty: Number(e.target.value) })} />
              <input value={form.yieldUnit} onChange={(e) => setForm({ ...form, yieldUnit: e.target.value })} placeholder="kg" />
            </div>
          </label>
          <label className="admin-field">
            Price / Unit (₹)
            <input type="number" min={0} step="0.01" value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: Number(e.target.value) })} />
          </label>
        </div>
        <div className="admin-form-row">
          <label className="admin-field">
            Sale Date
            <input type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} required />
          </label>
        </div>
        <label className="admin-field admin-field-wide">
          Note (optional)
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        <div className="admin-field admin-field-wide">
          <span style={{ fontSize: 12, color: '#666' }}>Receipt / Bill Photo (optional)</span>
          <input ref={fileInput} type="file" accept="image/*" capture="environment" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
          {existingReceipt && !receiptFile && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Photo attached — choose a file to replace it.</div>}
        </div>

        <div className="admin-form-summary">
          <span>Total Cost: <strong>₹{totalCost}</strong></span>
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

      <CostBreakdownChart entries={filtered} />

      <YearlyComparison entries={entries} />

      <div className="admin-filters">
        <select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>
          <option value="">All Crops</option>
          {cropNames.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {(cropFilter || yearFilter) && (
          <button type="button" className="btn btn-secondary" onClick={() => { setCropFilter(''); setYearFilter(''); }}>
            Clear Filter
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => downloadCsv(`vaadi-${todayStr()}.csv`, CSV_COLUMNS, filtered)}
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {groupedByYear.map(([year, yearEntries]) => {
            const collapsed = collapsedYears.has(year);
            const yearTotals = {
              cost: Math.round(yearEntries.reduce((s, e) => s + e.cost, 0) * 100) / 100,
              revenue: Math.round(yearEntries.reduce((s, e) => s + e.revenue, 0) * 100) / 100,
              profit: Math.round(yearEntries.reduce((s, e) => s + e.profit, 0) * 100) / 100,
            };
            return (
              <div key={year}>
                <button
                  type="button"
                  onClick={() => toggleYear(year)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: '#eef0ea',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1a1a1a',
                  }}
                >
                  <span>{collapsed ? '▸' : '▾'} {year} <span style={{ fontWeight: 400, color: '#888' }}>({yearEntries.length} {yearEntries.length === 1 ? 'entry' : 'entries'})</span></span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    Cost ₹{yearTotals.cost} · Revenue ₹{yearTotals.revenue} · Profit{' '}
                    <span style={{ color: yearTotals.profit >= 0 ? '#2e5339' : '#c0392b' }}>₹{yearTotals.profit}</span>
                  </span>
                </button>

                {!collapsed && (
                  <div className="admin-list">
                    {yearEntries.map((entry) => (
                      <div key={entry.id} className="admin-card">
                        <div className="admin-card-body">
                          <div className="admin-card-title">
                            {entry.cropName} <span className="sub">{entry.saleDate}</span>
                          </div>
                          <div className="admin-card-meta">
                            Seed: {entry.seedQty} {entry.seedUnit} · Yield: {entry.yieldQty} {entry.yieldUnit} · Price ₹{entry.pricePerUnit}/unit
                          </div>
                          <div className="admin-card-meta">
                            Cost — Seed ₹{entry.costSeed} · Khatar ₹{entry.costFertilizer} · Dava ₹{entry.costPesticide} · Majoor ₹{entry.costLabor} · Fuel ₹{entry.costFuel} · Other ₹{entry.costOther}
                          </div>
                          <div className="admin-card-meta">
                            Total Cost ₹{entry.cost} · Revenue ₹{entry.revenue} · Profit{' '}
                            <strong style={{ color: entry.profit >= 0 ? '#2e5339' : '#c0392b' }}>₹{entry.profit}</strong>
                          </div>
                          {entry.note && <div className="admin-card-meta">{entry.note}</div>}
                        </div>
                        {entry.receiptUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.receiptUrl} alt="Receipt" className="admin-card-thumb" style={{ cursor: 'pointer' }} onClick={() => window.open(entry.receiptUrl!, '_blank')} />
                        )}
                        <div className="admin-card-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(entry)}>Edit</button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(entry)}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {groupedByYear.length === 0 && <div className="admin-empty">No entries found.</div>}
        </div>
      )}
    </div>
  );
}
