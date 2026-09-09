'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createShop, deleteShop, shopRollup, updateShop, useShops } from '@/lib/shops';
import { usePaks } from '@/lib/paks';
import type { Shop } from '@/lib/types';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import { useLanguage } from '@/lib/i18n';
import '../admin.css';

const EMPTY = { name: '', village: '', mobile: '', note: '' };

export default function ShopsAdmin() {
  const { t } = useLanguage();
  const { showToast, confirm } = useAdminUI();
  const { shops, loading } = useShops();
  const { paks } = usePaks();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'spent'>('name');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const rollups = useMemo(
    () => new Map(shops.map((s) => [s.id, shopRollup(s, paks)])),
    [shops, paks]
  );

  const startEdit = (s: Shop) => {
    setEditingId(s.id);
    setForm({ name: s.name, village: s.village, mobile: s.mobile, note: s.note });
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
        const existing = shops.find((s) => s.id === editingId);
        await updateShop(editingId, { ...form, createdAt: existing?.createdAt ?? Date.now() });
        showToast(t('shops.toast.updated'));
      } else {
        await createShop({ ...form, createdAt: Date.now() });
        showToast(t('shops.toast.added'));
      }
      cancelEdit();
    } catch {
      showToast(t('shops.toast.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (shop: Shop) => {
    const spent = rollups.get(shop.id)?.count ?? 0;
    const message = spent
      ? t('shops.confirm.deleteWithPurchases').replace('{name}', shop.name).replace('{count}', String(spent))
      : t('shops.confirm.delete').replace('{name}', shop.name);
    if (!(await confirm(message))) return;
    const { id, ...data } = shop;
    await deleteShop(id);
    showToast(t('shops.toast.deleted'), {
      action: {
        label: t('shops.undo'),
        onClick: async () => {
          await createShop(data);
          showToast(t('shops.toast.restored'));
        },
      },
    });
  };

  const visibleShops = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? shops.filter((s) => s.name.toLowerCase().includes(q) || s.village.toLowerCase().includes(q))
      : shops;
    const sorted = [...filtered];
    if (sortBy === 'spent') {
      sorted.sort((a, b) => (rollups.get(b.id)?.total ?? 0) - (rollups.get(a.id)?.total ?? 0));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [shops, search, sortBy, rollups]);

  const grandTotal = useMemo(
    () => Math.round(visibleShops.reduce((s, shop) => s + (rollups.get(shop.id)?.total ?? 0), 0) * 100) / 100,
    [visibleShops, rollups]
  );

  return (
    <div>
      <h1 className="admin-page-title">{t('shops.title')}</h1>

      <form onSubmit={onSubmit} className="admin-form">
        <div className="admin-form-row">
          <label className="admin-field">
            {t('shops.field.name')}
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="admin-field">
            {t('shops.field.village')}
            <input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
          </label>
          <label className="admin-field">
            {t('shops.field.mobile')}
            <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </label>
        </div>
        <label className="admin-field admin-field-wide">
          {t('shops.field.note')}
          <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
        </label>
        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editingId ? t('shops.update') : t('shops.addShop')}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              {t('shops.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="admin-filters">
        <input placeholder={t('shops.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'spent')}>
          <option value="name">{t('shops.sortName')}</option>
          <option value="spent">{t('shops.sortSpent')}</option>
        </select>
      </div>

      {!loading && visibleShops.length > 0 && (
        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="admin-stat-label">{t('shops.stat.shops')}</div>
            <div className="admin-stat-value">{visibleShops.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">{t('shops.stat.totalSpent')}</div>
            <div className="admin-stat-value">₹{grandTotal}</div>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={3} />
      ) : (
        <div className="admin-list">
          {visibleShops.map((s) => {
            const rollup = rollups.get(s.id) ?? { purchases: [], total: 0, count: 0 };
            const expanded = expandedId === s.id;
            return (
              <div key={s.id} className="admin-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div className="admin-card-body">
                    <div className="admin-card-title">
                      {s.name} {s.village && <span className="sub">({s.village})</span>}
                    </div>
                    <div className="admin-card-meta">
                      {s.mobile && <>{s.mobile} · </>}
                      {t('shops.purchaseCount').replace('{count}', String(rollup.count))} · <strong>₹{rollup.total}</strong>
                    </div>
                    {s.note && <div className="admin-card-meta">{s.note}</div>}
                  </div>
                  <div className="admin-card-actions">
                    {rollup.count > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setExpandedId(expanded ? null : s.id)}
                      >
                        {expanded ? t('shops.hidePurchases') : t('shops.viewPurchases')}
                      </button>
                    )}
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(s)}>{t('shops.edit')}</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(s)}>{t('shops.delete')}</button>
                  </div>
                </div>

                {expanded && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #e5e5e0', paddingTop: 12, display: 'grid', gap: 6 }}>
                    {[...rollup.purchases]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((p, i) => (
                        <div
                          key={`${p.pakId}-${i}`}
                          style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f0f0ec' }}
                        >
                          <span>
                            {p.date} · {p.cropName}
                            {p.itemName && <> · {p.itemName}</>}
                            {p.note && <span style={{ color: '#888' }}> — {p.note}</span>}
                          </span>
                          <strong>₹{p.amount}</strong>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
          {visibleShops.length === 0 && <div className="admin-empty">{t('shops.empty')}</div>}
        </div>
      )}
    </div>
  );
}
