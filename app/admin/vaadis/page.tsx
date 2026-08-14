'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createVaadi, deleteVaadi, updateVaadi, useVaadis } from '@/lib/vaadis';
import { usePaks } from '@/lib/paks';
import type { Vaadi, VaadiPartner } from '@/lib/types';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import '../admin.css';

const EMPTY_PARTNER: VaadiPartner = { name: '', sharePercent: 0 };

const EMPTY_VAADI = {
  name: '',
  partners: [{ ...EMPTY_PARTNER }] as VaadiPartner[],
  note: '',
};

function totalCostOf(pak: { expenses: { amount: number }[] }) {
  return pak.expenses.reduce((s, e) => s + e.amount, 0);
}

function revenueOf(pak: { yieldQty: number; pricePerUnit: number }) {
  return pak.yieldQty * pak.pricePerUnit;
}

export default function VaadisAdmin() {
  const { showToast, confirm } = useAdminUI();
  const { vaadis, loading } = useVaadis();
  const { paks } = usePaks();
  const [form, setForm] = useState(EMPTY_VAADI);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const partnerTotal = Math.round(form.partners.reduce((s, p) => s + p.sharePercent, 0) * 100) / 100;

  const startEdit = (vaadi: Vaadi) => {
    setEditingId(vaadi.id);
    setForm({
      name: vaadi.name,
      partners: vaadi.partners.length ? vaadi.partners.map((p) => ({ ...p })) : [{ ...EMPTY_PARTNER }],
      note: vaadi.note,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ ...EMPTY_VAADI, partners: [{ ...EMPTY_PARTNER }] });
  };

  const updatePartner = (index: number, field: keyof VaadiPartner, value: string) => {
    setForm({
      ...form,
      partners: form.partners.map((p, i) =>
        i === index ? { ...p, [field]: field === 'sharePercent' ? Number(value) : value } : p
      ),
    });
  };

  const addPartnerRow = () => setForm({ ...form, partners: [...form.partners, { ...EMPTY_PARTNER }] });

  const removePartnerRow = (index: number) =>
    setForm({ ...form, partners: form.partners.filter((_, i) => i !== index) });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const partners = form.partners.filter((p) => p.name.trim());
      const data = {
        name: form.name,
        partners,
        note: form.note,
        createdAt: editingId ? (vaadis.find((v) => v.id === editingId)?.createdAt ?? Date.now()) : Date.now(),
      };
      if (partnerTotal !== 100 && partners.length) {
        showToast(`Partner shares total ${partnerTotal}%, not 100%. Saved anyway — you can fix later.`, 'error');
      }
      if (editingId) {
        await updateVaadi(editingId, data);
        showToast('Vaadi updated.');
      } else {
        await createVaadi(data);
        showToast('Vaadi added.');
      }
      cancelEdit();
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (vaadi: Vaadi) => {
    if (!(await confirm(`Delete vaadi "${vaadi.name}"? Paks linked to it will keep showing it as unassigned.`))) return;
    const { id, ...data } = vaadi;
    await deleteVaadi(id);
    showToast('Vaadi deleted.', {
      action: {
        label: 'Undo',
        onClick: async () => {
          await createVaadi(data);
          showToast('Vaadi restored.');
        },
      },
    });
  };

  const rollups = useMemo(() => {
    return vaadis.map((vaadi) => {
      const vaadiPaks = paks.filter((p) => p.vaadiId === vaadi.id);
      const cost = Math.round(vaadiPaks.reduce((s, p) => s + totalCostOf(p), 0) * 100) / 100;
      const revenue = Math.round(vaadiPaks.reduce((s, p) => s + revenueOf(p), 0) * 100) / 100;
      const profit = Math.round((revenue - cost) * 100) / 100;
      const partnerShares = vaadi.partners.map((p) => ({
        ...p,
        amount: Math.round((profit * p.sharePercent) / 100 * 100) / 100,
      }));
      return { vaadi, pakCount: vaadiPaks.length, cost, revenue, profit, partnerShares };
    });
  }, [vaadis, paks]);

  return (
    <div>
      <h1 className="admin-page-title">Vaadis &amp; Partners</h1>

      <form onSubmit={onSubmit} className="admin-form">
        <div className="admin-form-row">
          <label className="admin-field">
            Vaadi Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. North Field" />
          </label>
        </div>

        <div className="admin-cost-breakdown-label">
          Partners (share %) {partnerTotal !== 100 && <span style={{ color: '#c0392b' }}>— total {partnerTotal}%</span>}
        </div>
        {form.partners.map((p, i) => (
          <div className="admin-form-row" key={i}>
            <label className="admin-field">
              Name
              <input value={p.name} onChange={(e) => updatePartner(i, 'name', e.target.value)} placeholder="Partner name" />
            </label>
            <label className="admin-field">
              Share %
              <input type="number" min={0} max={100} step="0.01" value={p.sharePercent} onChange={(e) => updatePartner(i, 'sharePercent', e.target.value)} />
            </label>
            {form.partners.length > 1 && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removePartnerRow(i)} style={{ alignSelf: 'flex-end' }}>
                Remove
              </button>
            )}
          </div>
        ))}
        <div className="admin-form-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={addPartnerRow}>
            + Add Partner
          </button>
        </div>

        <label className="admin-field admin-field-wide">
          Note (optional)
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editingId ? 'Update Vaadi' : 'Add Vaadi'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <SkeletonList rows={3} />
      ) : (
        <div className="admin-list">
          {rollups.map(({ vaadi, pakCount, cost, revenue, profit, partnerShares }) => (
            <div key={vaadi.id} className="admin-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="admin-card-body">
                <div className="admin-card-title">{vaadi.name}</div>
                <div className="admin-card-meta">
                  {pakCount} {pakCount === 1 ? 'pak' : 'paks'} · Cost ₹{cost} · Revenue ₹{revenue} · Profit{' '}
                  <strong style={{ color: profit >= 0 ? '#2e5339' : '#c0392b' }}>₹{profit}</strong>
                </div>
                {partnerShares.length > 0 && (
                  <div className="admin-card-meta">
                    {partnerShares.map((p) => `${p.name} ${p.sharePercent}% → ₹${p.amount}`).join(' · ')}
                  </div>
                )}
                {vaadi.note && <div className="admin-card-meta">{vaadi.note}</div>}
              </div>
              <div className="admin-card-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(vaadi)}>Edit</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(vaadi)}>Delete</button>
              </div>
            </div>
          ))}
          {rollups.length === 0 && <div className="admin-empty">No vaadis found.</div>}
        </div>
      )}
    </div>
  );
}
