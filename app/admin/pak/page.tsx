'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createPak, deletePak, updatePak, usePaks } from '@/lib/paks';
import { useVaadis } from '@/lib/vaadis';
import { downloadCsv } from '@/lib/csvExport';
import type { ExpenseCategory, Pak, PakExpense } from '@/lib/types';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import { useLanguage } from '@/lib/i18n';
import '../admin.css';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

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
  note: '',
};

const EMPTY_EXPENSE = {
  date: todayStr(),
  category: 'seed' as ExpenseCategory,
  amount: 0,
  note: '',
};

const EMPTY_HARVEST = {
  harvestedDate: todayStr(),
  yieldQty: 0,
  yieldUnit: 'kg',
  pricePerUnit: 0,
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

export default function PakAdmin() {
  const { t } = useLanguage();
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
  const [harvestId, setHarvestId] = useState<string | null>(null);
  const [harvestForm, setHarvestForm] = useState(EMPTY_HARVEST);

  const CATEGORIES: { key: ExpenseCategory; label: string }[] = [
    { key: 'seed', label: t('pak.category.seed') },
    { key: 'fertilizer', label: t('pak.category.fertilizer') },
    { key: 'pesticide', label: t('pak.category.pesticide') },
    { key: 'labor', label: t('pak.category.labor') },
    { key: 'fuel', label: t('pak.category.fuel') },
    { key: 'other', label: t('pak.category.other') },
  ];

  const CATEGORY_LABEL: Record<ExpenseCategory, string> = Object.fromEntries(
    CATEGORIES.map((c) => [c.key, c.label])
  ) as Record<ExpenseCategory, string>;

  const CSV_COLUMNS: { key: keyof ExpenseCsvRow; label: string }[] = [
    { key: 'vaadiName', label: t('pak.csv.vaadi') },
    { key: 'cropName', label: t('pak.csv.crop') },
    { key: 'plantedDate', label: t('pak.csv.planted') },
    { key: 'harvestedDate', label: t('pak.csv.harvested') },
    { key: 'expenseDate', label: t('pak.csv.expenseDate') },
    { key: 'category', label: t('pak.csv.category') },
    { key: 'amount', label: t('pak.csv.amount') },
    { key: 'note', label: t('pak.csv.note') },
  ];

  const startEdit = (pak: Pak) => {
    setEditingId(pak.id);
    setForm({
      vaadiId: pak.vaadiId,
      cropName: pak.cropName,
      plantedDate: pak.plantedDate,
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
        harvestedDate: existing?.harvestedDate ?? null,
        expenses: existing?.expenses ?? [],
        yieldQty: existing?.yieldQty ?? 0,
        yieldUnit: existing?.yieldUnit ?? 'kg',
        pricePerUnit: existing?.pricePerUnit ?? 0,
        note: form.note,
        createdAt: existing?.createdAt ?? Date.now(),
      };
      if (editingId) {
        await updatePak(editingId, data);
        showToast(t('pak.toast.updated'));
      } else {
        await createPak(data);
        showToast(t('pak.toast.added'));
      }
      cancelEdit();
    } catch {
      showToast(t('pak.toast.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (pak: Pak) => {
    if (!(await confirm(t('pak.confirm.deletePak').replace('{crop}', pak.cropName)))) return;
    const { id, ...data } = pak;
    await deletePak(id);
    showToast(t('pak.toast.deleted'), {
      action: {
        label: t('pak.toast.undo'),
        onClick: async () => {
          await createPak(data);
          showToast(t('pak.toast.restored'));
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
    showToast(t('pak.toast.expenseAdded'));
  };

  const removeExpense = async (pak: Pak, index: number) => {
    if (!(await confirm(t('pak.confirm.removeExpense')))) return;
    const { id, ...data } = pak;
    await updatePak(id, { ...data, expenses: pak.expenses.filter((_, i) => i !== index) });
    showToast(t('pak.toast.expenseRemoved'));
  };

  const startHarvest = (pak: Pak) => {
    setHarvestId(pak.id);
    setHarvestForm({
      harvestedDate: pak.harvestedDate ?? todayStr(),
      yieldQty: pak.yieldQty,
      yieldUnit: pak.yieldUnit,
      pricePerUnit: pak.pricePerUnit,
    });
  };

  const cancelHarvest = () => {
    setHarvestId(null);
    setHarvestForm(EMPTY_HARVEST);
  };

  const saveHarvest = async (pak: Pak, e: FormEvent) => {
    e.preventDefault();
    const { id, ...data } = pak;
    await updatePak(id, {
      ...data,
      harvestedDate: harvestForm.harvestedDate,
      yieldQty: harvestForm.yieldQty,
      yieldUnit: harvestForm.yieldUnit,
      pricePerUnit: harvestForm.pricePerUnit,
    });
    cancelHarvest();
    showToast(t('pak.toast.harvestRecorded'));
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
        return { vaadiId, vaadiName: vaadi?.name ?? t('pak.unassigned'), paks: vaadiPaks, cost, revenue, profit, partnerShares };
      })
      .sort((a, b) => b.cost - a.cost);
  }, [filtered, vaadiById]);

  const exportCsv = () => {
    const rows: ExpenseCsvRow[] = filtered.flatMap((p) => {
      const vaadiName = vaadiById.get(p.vaadiId)?.name ?? t('pak.unassigned');
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
      <h1 className="admin-page-title">{t('pak.title')}</h1>

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('pak.stat.totalCost')}</div>
          <div className="admin-stat-value warn">₹{summary.totalCost}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('pak.stat.totalRevenue')}</div>
          <div className="admin-stat-value">₹{summary.totalRevenue}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">{t('pak.stat.totalProfit')}</div>
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
                  {v.paks.length} {v.paks.length === 1 ? t('pak.unit.pak') : t('pak.unit.paks')} ·{' '}
                  {t('pak.summary.cost').replace('{amount}', String(v.cost))} ·{' '}
                  {t('pak.summary.revenue').replace('{amount}', String(v.revenue))} · {t('pak.summary.profit')}{' '}
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
            {t('pak.field.vaadi')}
            <select value={form.vaadiId} onChange={(e) => setForm({ ...form, vaadiId: e.target.value })} required>
              <option value="" disabled>{t('pak.field.selectVaadi')}</option>
              {vaadis.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            {t('pak.field.crop')}
            <input value={form.cropName} onChange={(e) => setForm({ ...form, cropName: e.target.value })} required placeholder={t('pak.field.cropPlaceholder')} />
          </label>
          <label className="admin-field">
            {t('pak.field.plantedDate')}
            <input type="date" value={form.plantedDate} onChange={(e) => setForm({ ...form, plantedDate: e.target.value })} required />
          </label>
        </div>
        <label className="admin-field admin-field-wide">
          {t('pak.field.note')}
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editingId ? t('pak.button.updatePak') : t('pak.button.addPak')}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              {t('pak.button.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="admin-filters">
        <select value={vaadiFilter} onChange={(e) => setVaadiFilter(e.target.value)}>
          <option value="">{t('pak.filter.allVaadi')}</option>
          {vaadis.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
        <select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}>
          <option value="">{t('pak.filter.allCrops')}</option>
          {cropNames.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="">{t('pak.filter.allYears')}</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t('pak.filter.allStatus')}</option>
          <option value="growing">{t('pak.status.growing')}</option>
          <option value="harvested">{t('pak.status.harvested')}</option>
        </select>
        {(vaadiFilter || cropFilter || yearFilter || statusFilter) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { setVaadiFilter(''); setCropFilter(''); setYearFilter(''); setStatusFilter(''); }}
          >
            {t('pak.filter.clear')}
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={exportCsv}>
          {t('pak.button.exportCsv')}
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
                    {pak.cropName} <span className="sub">({vaadiById.get(pak.vaadiId)?.name ?? t('pak.unassigned')})</span>{' '}
                    <span className="sub">
                      {pak.plantedDate} → {pak.harvestedDate ?? t('pak.status.growing')}
                    </span>
                  </div>
                  <div className="admin-card-meta">
                    {t('pak.summary.totalCost').replace('{amount}', String(cost))}
                    {pak.harvestedDate && (
                      <>
                        {' '}· {t('pak.summary.yield').replace('{qty}', String(pak.yieldQty)).replace('{unit}', pak.yieldUnit)} ·{' '}
                        {t('pak.summary.revenue').replace('{amount}', String(revenue))} · {t('pak.summary.profit')}{' '}
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
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setExpandedId(expanded ? null : pak.id)}>
                    💰 {expanded ? t('pak.button.hideCostEntries') : t('pak.button.addViewCost').replace('{count}', String(pak.expenses.length))}
                  </button>
                  {!pak.harvestedDate && harvestId !== pak.id && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => startHarvest(pak)}>
                      🌾 {t('pak.button.markHarvested')}
                    </button>
                  )}
                  {pak.harvestedDate && harvestId !== pak.id && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => startHarvest(pak)}>
                      ✏️ {t('pak.button.editHarvest')}
                    </button>
                  )}
                  {harvestId === pak.id && (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={cancelHarvest}>
                      {t('pak.button.cancelHarvest')}
                    </button>
                  )}
                  <span style={{ flex: '1 1 auto' }} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(pak)} title={t('pak.action.editPakDetails')} aria-label={t('pak.action.editPakDetails')}>
                    ⚙️
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(pak)} title={t('pak.action.deletePak')} aria-label={t('pak.action.deletePak')}>
                    🗑️
                  </button>
                </div>

                {harvestId === pak.id && (
                  <form onSubmit={(e) => saveHarvest(pak, e)} className="admin-form-row" style={{ marginTop: 12, borderTop: '1px solid #e5e5e0', paddingTop: 12 }}>
                    <label className="admin-field">
                      {t('pak.field.harvestedDate')}
                      <input
                        type="date"
                        value={harvestForm.harvestedDate}
                        onChange={(e) => setHarvestForm({ ...harvestForm, harvestedDate: e.target.value })}
                        required
                      />
                    </label>
                    <label className="admin-field">
                      {t('pak.field.yieldQty')}
                      <div className="admin-field-pair">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={harvestForm.yieldQty}
                          onChange={(e) => setHarvestForm({ ...harvestForm, yieldQty: Number(e.target.value) })}
                        />
                        <input
                          value={harvestForm.yieldUnit}
                          onChange={(e) => setHarvestForm({ ...harvestForm, yieldUnit: e.target.value })}
                          placeholder={t('pak.field.yieldUnitPlaceholder')}
                        />
                      </div>
                    </label>
                    <label className="admin-field">
                      {t('pak.field.pricePerUnit')}
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={harvestForm.pricePerUnit}
                        onChange={(e) => setHarvestForm({ ...harvestForm, pricePerUnit: Number(e.target.value) })}
                      />
                    </label>
                    <div className="admin-form-actions">
                      <button type="submit" className="btn btn-primary btn-sm">{t('pak.button.saveHarvest')}</button>
                    </div>
                  </form>
                )}

                {expanded && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #e5e5e0', paddingTop: 12 }}>
                    <form onSubmit={(e) => addExpense(pak, e)} className="admin-form-row" style={{ marginBottom: 12 }}>
                      <label className="admin-field">
                        {t('pak.field.date')}
                        <input
                          type="date"
                          value={expenseForm.date}
                          onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                          required
                        />
                      </label>
                      <label className="admin-field">
                        {t('pak.field.category')}
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
                        {t('pak.field.amount')}
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
                        {t('pak.field.note')}
                        <input value={expenseForm.note} onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })} />
                      </label>
                      <div className="admin-form-actions">
                        <button type="submit" className="btn btn-primary btn-sm">{t('pak.button.addExpense')}</button>
                      </div>
                    </form>

                    {pak.expenses.length === 0 ? (
                      <div className="admin-empty">{t('pak.empty.noExpenses')}</div>
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
                                {t('pak.button.remove')}
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
          {filtered.length === 0 && <div className="admin-empty">{t('pak.empty.noPaks')}</div>}
        </div>
      )}
    </div>
  );
}
