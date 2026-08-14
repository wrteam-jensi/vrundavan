'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createPak, deletePak, updatePak, usePaks } from '@/lib/paks';
import { useVaadis } from '@/lib/vaadis';
import { downloadCsv } from '@/lib/csvExport';
import type { ExpenseCategory, Pak, PakExpense } from '@/lib/types';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import '../admin.css';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const CATEGORIES: { key: ExpenseCategory; label: string }[] = [
  { key: 'seed', label: 'Seed (Beej)' },
  { key: 'fertilizer', label: 'Fertilizer (Khatar)' },
  { key: 'pesticide', label: 'Pesticide (Dava)' },
  { key: 'labor', label: 'Labor (Majoor)' },
  { key: 'fuel', label: 'Fuel' },
  { key: 'other', label: 'Other' },
];

const CATEGORY_LABEL: Record<ExpenseCategory, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
) as Record<ExpenseCategory, string>;

function totalCost(pak: Pak) {
  return Math.round(pak.expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;
}

function revenueOf(pak: Pak) {
  return Math.round(pak.yieldQty * pak.pricePerUnit * 100) / 100;
}

const EMPTY_PAK = {
  vaadiId: '',
  cropName: '',
  plantedDate: todayStr(),
  harvestedDate: '' as string,
  yieldQty: 0,
  yieldUnit: 'kg',
  pricePerUnit: 0,
  note: '',
};

const EMPTY_EXPENSE = {
  date: todayStr(),
  category: 'seed' as ExpenseCategory,
  amount: 0,
  note: '',
};

type ExpenseCsvRow = {
  vaadiName: string;
  cropName: string;
  plantedDate: string;
  harvestedDate: string;
  expenseDate: string;
  category: string;
  amount: number;
  note: string;
};

const CSV_COLUMNS: { key: keyof ExpenseCsvRow; label: string }[] = [
  { key: 'vaadiName', label: 'Vaadi' },
  { key: 'cropName', label: 'Crop (Pak)' },
  { key: 'plantedDate', label: 'Vavayo (Planted)' },
  { key: 'harvestedDate', label: 'Nikdyo (Harvested)' },
  { key: 'expenseDate', label: 'Expense Date' },
  { key: 'category', label: 'Category' },
  { key: 'amount', label: 'Amount' },
  { key: 'note', label: 'Note' },
];

export default function PakAdmin() {
  const { showToast, confirm } = useAdminUI();
  const { paks, loading } = usePaks();
  const { vaadis } = useVaadis();
  const vaadiById = useMemo(() => new Map(vaadis.map((v) => [v.id, v])), [vaadis]);
  const [form, setForm] = useState(EMPTY_PAK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [vaadiFilter, setVaadiFilter] = useState('');
  const [cropFilter, setCropFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);

  const startEdit = (pak: Pak) => {
    setEditingId(pak.id);
    setForm({
      vaadiId: pak.vaadiId,
      cropName: pak.cropName,
      plantedDate: pak.plantedDate,
      harvestedDate: pak.harvestedDate ?? '',
      yieldQty: pak.yieldQty,
      yieldUnit: pak.yieldUnit,
      pricePerUnit: pak.pricePerUnit,
      note: pak.note,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_PAK);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const existing = editingId ? paks.find((p) => p.id === editingId) : null;
      const data = {
        vaadiId: form.vaadiId,
        cropName: form.cropName,
        plantedDate: form.plantedDate,
        harvestedDate: form.harvestedDate || null,
        expenses: existing?.expenses ?? [],
        yieldQty: form.yieldQty,
        yieldUnit: form.yieldUnit,
        pricePerUnit: form.pricePerUnit,
        note: form.note,
        createdAt: existing?.createdAt ?? Date.now(),
      };
      if (editingId) {
        await updatePak(editingId, data);
        showToast('Pak updated.');
      } else {
        await createPak(data);
        showToast('Pak added.');
      }
      cancelEdit();
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (pak: Pak) => {
    if (!(await confirm(`Delete this ${pak.cropName} pak and all its expenses?`))) return;
    const { id, ...data } = pak;
    await deletePak(id);
    showToast('Pak deleted.', {
      action: {
        label: 'Undo',
        onClick: async () => {
          await createPak(data);
          showToast('Pak restored.');
        },
      },
    });
  };

  const addExpense = async (pak: Pak, e: FormEvent) => {
    e.preventDefault();
    const expense: PakExpense = { ...expenseForm };
    const { id, ...data } = pak;
    await updatePak(id, { ...data, expenses: [...pak.expenses, expense] });
    setExpenseForm({ ...EMPTY_EXPENSE, date: expenseForm.date });
    showToast('Expense added.');
  };

  const removeExpense = async (pak: Pak, index: number) => {
    if (!(await confirm('Remove this expense entry?'))) return;
    const { id, ...data } = pak;
    await updatePak(id, { ...data, expenses: pak.expenses.filter((_, i) => i !== index) });
    showToast('Expense removed.');
  };

  const cropNames = useMemo(() => Array.from(new Set(paks.map((p) => p.cropName))).sort(), [paks]);
  const years = useMemo(
    () => Array.from(new Set(paks.map((p) => p.plantedDate.slice(0, 4)))).sort((a, b) => Number(b) - Number(a)),
    [paks]
  );

  const filtered = paks.filter(
    (p) =>
      (!vaadiFilter || p.vaadiId === vaadiFilter) &&
      (!cropFilter || p.cropName === cropFilter) &&
      (!yearFilter || p.plantedDate.startsWith(yearFilter)) &&
      (!statusFilter || (statusFilter === 'growing' ? !p.harvestedDate : !!p.harvestedDate))
  );

  const summary = useMemo(() => {
    const cost = filtered.reduce((s, p) => s + totalCost(p), 0);
    const revenue = filtered.reduce((s, p) => s + revenueOf(p), 0);
    return {
      totalCost: Math.round(cost * 100) / 100,
      totalRevenue: Math.round(revenue * 100) / 100,
      totalProfit: Math.round((revenue - cost) * 100) / 100,
    };
  }, [filtered]);

  const byVaadi = useMemo(() => {
    const map = new Map<string, Pak[]>();
    for (const p of filtered) {
      const arr = map.get(p.vaadiId) ?? [];
      arr.push(p);
      map.set(p.vaadiId, arr);
    }
    return Array.from(map.entries())
      .map(([vaadiId, vaadiPaks]) => {
        const cost = Math.round(vaadiPaks.reduce((s, p) => s + totalCost(p), 0) * 100) / 100;
        const revenue = Math.round(vaadiPaks.reduce((s, p) => s + revenueOf(p), 0) * 100) / 100;
        const profit = Math.round((revenue - cost) * 100) / 100;
        const vaadi = vaadiById.get(vaadiId);
        const partnerShares = (vaadi?.partners ?? []).map((p) => ({
          ...p,
          amount: Math.round((profit * p.sharePercent) / 100 * 100) / 100,
        }));
        return { vaadiId, vaadiName: vaadi?.name ?? '(Unassigned)', paks: vaadiPaks, cost, revenue, profit, partnerShares };
      })
      .sort((a, b) => b.cost - a.cost);
  }, [filtered, vaadiById]);

  const exportCsv = () => {
    const rows: ExpenseCsvRow[] = filtered.flatMap((p) => {
      const vaadiName = vaadiById.get(p.vaadiId)?.name ?? '(Unassigned)';
      return p.expenses.length
        ? p.expenses.map((ex) => ({
            vaadiName,
            cropName: p.cropName,
            plantedDate: p.plantedDate,
            harvestedDate: p.harvestedDate ?? '',
            expenseDate: ex.date,
            category: CATEGORY_LABEL[ex.category],
            amount: ex.amount,
            note: ex.note,
          }))
        : [
            {
              vaadiName,
              cropName: p.cropName,
              plantedDate: p.plantedDate,
              harvestedDate: p.harvestedDate ?? '',
              expenseDate: '',
              category: '',
              amount: 0,
              note: '',
            },
          ];
    });
    downloadCsv(`pak-${todayStr()}.csv`, CSV_COLUMNS, rows);
  };

  return (
    <div>
      <h1 className="admin-page-title">Pak (Crop Cycles)</h1>

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

      {byVaadi.length > 0 && (
        <div className="admin-list" style={{ marginBottom: 16 }}>
          {byVaadi.map((v) => (
            <div key={v.vaadiId} className="admin-card">
              <div className="admin-card-body">
                <div className="admin-card-title">{v.vaadiName}</div>
                <div className="admin-card-meta">
                  {v.paks.length} {v.paks.length === 1 ? 'pak' : 'paks'} · Cost ₹{v.cost} · Revenue ₹{v.revenue} · Profit{' '}
                  <strong style={{ color: v.profit >= 0 ? '#2e5339' : '#c0392b' }}>₹{v.profit}</strong>
                </div>
                {v.partnerShares.length > 0 && (
                  <div className="admin-card-meta">
                    {v.partnerShares.map((p) => `${p.name} ${p.sharePercent}% → ₹${p.amount}`).join(' · ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="admin-form">
        <div className="admin-form-row">
          <label className="admin-field">
            Vaadi
            <select value={form.vaadiId} onChange={(e) => setForm({ ...form, vaadiId: e.target.value })} required>
              <option value="" disabled>Select vaadi</option>
              {vaadis.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            Crop (Pak)
            <input value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} required placeholder="e.g. Wheat, Cotton" />
          </label>
          <label className="admin-field">
            Vavayo (Planted Date)
            <input type="date" value={form.plantedDate} onChange={(e) => setForm({ ...form, plantedDate: e.target.value })} required />
          </label>
          <label className="admin-field">
            Nikdyo (Harvested Date)
            <input type="date" value={form.harvestedDate} onChange={(e) => setForm({ ...form, harvestedDate: e.target.value })} />
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field">
            Yield Qty
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
        <label className="admin-field admin-field-wide">
          Note (optional)
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editingId ? 'Update Pak' : 'Add Pak'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="admin-filters">
        <select value={vaadiFilter} onChange={(e) => setVaadiFilter(e.target.value)}>
          <option value="">All Vaadi</option>
          {vaadis.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
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
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="growing">Growing</option>
          <option value="harvested">Harvested</option>
        </select>
        {(vaadiFilter || cropFilter || yearFilter || statusFilter) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setVaadiFilter(''); setCropFilter(''); setYearFilter(''); setStatusFilter(''); }}
          >
            Clear Filter
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : (
        <div className="admin-list">
          {filtered.map((pak) => {
            const cost = totalCost(pak);
            const revenue = revenueOf(pak);
            const profit = Math.round((revenue - cost) * 100) / 100;
            const expanded = expandedId === pak.id;
            const catTotals = CATEGORIES.map((c) => ({
              ...c,
              amount: Math.round(pak.expenses.filter((e) => e.category === c.key).reduce((s, e) => s + e.amount, 0) * 100) / 100,
            })).filter((c) => c.amount > 0);

            return (
              <div key={pak.id} className="admin-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="admin-card-body">
                  <div className="admin-card-title">
                    {pak.cropName} <span className="sub">({vaadiById.get(pak.vaadiId)?.name ?? '(Unassigned)'})</span>{' '}
                    <span className="sub">
                      {pak.plantedDate} → {pak.harvestedDate ?? 'Growing'}
                    </span>
                  </div>
                  <div className="admin-card-meta">
                    Total Cost ₹{cost}
                    {pak.harvestedDate && (
                      <>
                        {' '}· Yield {pak.yieldQty} {pak.yieldUnit} · Revenue ₹{revenue} · Profit{' '}
                        <strong style={{ color: profit >= 0 ? '#2e5339' : '#c0392b' }}>₹{profit}</strong>
                      </>
                    )}
                  </div>
                  {catTotals.length > 0 && (
                    <div className="admin-card-meta">
                      {catTotals.map((c) => `${c.label} ₹${c.amount}`).join(' · ')}
                    </div>
                  )}
                  {pak.note && <div className="admin-card-meta">{pak.note}</div>}
                </div>

                <div className="admin-card-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExpandedId(expanded ? null : pak.id)}>
                    {expanded ? 'Hide Expenses' : `Expenses (${pak.expenses.length})`}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(pak)}>Edit</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(pak)}>Delete</button>
                </div>

                {expanded && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #e5e5e0', paddingTop: 12 }}>
                    <form onSubmit={(e) => addExpense(pak, e)} className="admin-form-row" style={{ marginBottom: 12 }}>
                      <label className="admin-field">
                        Date
                        <input
                          type="date"
                          value={expenseForm.date}
                          onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                          required
                        />
                      </label>
                      <label className="admin-field">
                        Category
                        <select
                          value={expenseForm.category}
                          onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="admin-field">
                        Amount (₹)
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={expenseForm.amount}
                          onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                          required
                        />
                      </label>
                      <label className="admin-field">
                        Note (optional)
                        <input value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })} />
                      </label>
                      <div className="admin-form-actions">
                        <button type="submit" className="btn btn-primary btn-sm">Add Expense</button>
                      </div>
                    </form>

                    {pak.expenses.length === 0 ? (
                      <div className="admin-empty">No expenses yet.</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 6 }}>
                        {[...pak.expenses]
                          .map((ex, i) => ({ ex, i }))
                          .sort((a, b) => b.ex.date.localeCompare(a.ex.date))
                          .map(({ ex, i }) => (
                            <div
                              key={i}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f0f0ec' }}
                            >
                              <span>
                                {ex.date} · {CATEGORY_LABEL[ex.category]} · ₹{ex.amount}
                                {ex.note && <span style={{ color: '#888' }}> — {ex.note}</span>}
                              </span>
                              <button type="button" className="btn btn-danger btn-sm" onClick={() => removeExpense(pak, i)}>
                                Remove
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="admin-empty">No paks found.</div>}
        </div>
      )}
    </div>
  );
}
