'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createFarmer, deleteFarmer, updateFarmer, useFarmers, useHarvestEntries, whatsAppPendingUrl } from '@/lib/harvest';
import type { Farmer } from '@/lib/types';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import { useLanguage } from '@/lib/i18n';
import '../admin.css';

const EMPTY = { name: '', mobile: '', village: '', farmDetails: '' };

export default function FarmersAdmin() {
  const { t } = useLanguage();
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
        showToast(t('farmers.toast.updated'));
      } else {
        await createFarmer(form);
        showToast(t('farmers.toast.added'));
      }
      cancelEdit();
    } catch {
      showToast(t('farmers.toast.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (farmer: Farmer) => {
    if (!(await confirm(`${t('farmers.deleteConfirmPrefix')} ${farmer.name}${t('farmers.deleteConfirmSuffix')}`))) return;
    const { id, ...data } = farmer;
    await deleteFarmer(id);
    showToast(t('farmers.toast.deleted'), {
      action: {
        label: t('farmers.undo'),
        onClick: async () => {
          await createFarmer(data);
          showToast(t('farmers.toast.restored'));
        },
      },
    });
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
      <h1 className="admin-page-title">{t('farmers.title')}</h1>

      <form onSubmit={onSubmit} className="admin-form">
        <div className="admin-form-row">
          <label className="admin-field">
            {t('farmers.field.name')}
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="admin-field">
            {t('farmers.field.mobile')}
            <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
          </label>
          <label className="admin-field">
            {t('farmers.field.village')}
            <input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} required />
          </label>
        </div>
        <label className="admin-field admin-field-wide">
          {t('farmers.field.farmDetails')}
          <textarea value={form.farmDetails} onChange={(e) => setForm({ ...form, farmDetails: e.target.value })} rows={2} />
        </label>
        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editingId ? t('farmers.update') : t('farmers.addFarmer')}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              {t('farmers.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="admin-filters">
        <input placeholder={t('farmers.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'pending')}>
          <option value="name">{t('farmers.sortName')}</option>
          <option value="pending">{t('farmers.sortPending')}</option>
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
                      {t('farmers.pending')}: <strong style={{ color: '#c0392b' }}>₹{Math.round(pending * 100) / 100}</strong>
                    </div>
                  )}
                </div>
                <div className="admin-card-actions">
                  {pending > 0 && (
                    <a href={whatsAppPendingUrl(f, entries)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm">
                      {t('farmers.sendPending')}
                    </a>
                  )}
                  <a href={`/admin/farmers/${f.id}`} className="btn btn-secondary btn-sm">{t('farmers.view')}</a>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(f)}>{t('farmers.edit')}</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(f)}>{t('farmers.delete')}</button>
                </div>
              </div>
            );
          })}
          {visibleFarmers.length === 0 && <div className="admin-empty">{t('farmers.empty')}</div>}
        </div>
      )}
    </div>
  );
}
