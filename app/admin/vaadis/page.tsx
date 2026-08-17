'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createVaadi, deleteVaadi, updateVaadi, useVaadis, vaadiRollup } from '@/lib/vaadis';
import { usePaks } from '@/lib/paks';
import { createPartnerWithdrawal, usePartnerWithdrawals } from '@/lib/partnerWithdrawals';
import type { Vaadi, VaadiPartner } from '@/lib/types';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import '../admin.css';

const EMPTY_PARTNER: VaadiPartner = { id: '', name: '', sharePercent: 0 };

const EMPTY_WITHDRAWAL = {
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: '',
  note: '',
  refId: '',
};

const EMPTY_VAADI = {
  name: '',
  partners: [{ ...EMPTY_PARTNER }] as VaadiPartner[],
  note: '',
};

export default function VaadisAdmin() {
  const { showToast, confirm } = useAdminUI();
  const { vaadis, loading } = useVaadis();
  const { paks } = usePaks();
  const { withdrawals } = usePartnerWithdrawals();
  const [form, setForm] = useState(EMPTY_VAADI);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [withdrawFor, setWithdrawFor] = useState<{ vaadiId: string; partnerId: string; partnerName: string } | null>(null);
  const [withdrawForm, setWithdrawForm] = useState(EMPTY_WITHDRAWAL);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

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

  const withdrawnByVaadiPartner = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of withdrawals) {
      const key = `${w.vaadiId}::${w.partnerId}`;
      map.set(key, (map.get(key) ?? 0) + w.amount);
    }
    return map;
  }, [withdrawals]);

  const rollups = useMemo(() => {
    return vaadis.map((vaadi) => {
      const { pakCount, cost, revenue, profit, partnerShares } = vaadiRollup(vaadi, paks);
      const partnerBalances = partnerShares.map((p) => {
        const withdrawn = Math.round((withdrawnByVaadiPartner.get(`${vaadi.id}::${p.id}`) ?? 0) * 100) / 100;
        const remaining = Math.round((p.amount - withdrawn) * 100) / 100;
        return { ...p, withdrawn, remaining };
      });
      return { vaadi, pakCount, cost, revenue, profit, partnerShares: partnerBalances };
    });
  }, [vaadis, paks, withdrawnByVaadiPartner]);

  const startWithdraw = (vaadiId: string, partnerId: string, partnerName: string) => {
    setWithdrawFor({ vaadiId, partnerId, partnerName });
    setWithdrawForm(EMPTY_WITHDRAWAL);
  };

  const cancelWithdraw = () => {
    setWithdrawFor(null);
    setWithdrawForm(EMPTY_WITHDRAWAL);
  };

  const submitWithdraw = async (e: FormEvent, remaining: number) => {
    e.preventDefault();
    if (!withdrawFor) return;
    if (withdrawForm.amount <= 0) {
      showToast('Enter valid amount.', 'error');
      return;
    }
    if (withdrawForm.amount > remaining) {
      showToast(`Amount exceeds remaining payable (₹${remaining}).`, 'error');
      return;
    }
    setWithdrawBusy(true);
    try {
      await createPartnerWithdrawal({
        vaadiId: withdrawFor.vaadiId,
        partnerId: withdrawFor.partnerId,
        partnerName: withdrawFor.partnerName,
        amount: withdrawForm.amount,
        date: withdrawForm.date,
        paymentMethod: withdrawForm.paymentMethod,
        note: withdrawForm.note,
        refId: withdrawForm.refId,
        createdAt: Date.now(),
      });
      showToast('Withdrawal recorded.');
      cancelWithdraw();
    } catch {
      showToast('Something went wrong. Try again.', 'error');
    } finally {
      setWithdrawBusy(false);
    }
  };

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
                {vaadi.note && <div className="admin-card-meta">{vaadi.note}</div>}
              </div>

              {partnerShares.length > 0 && (
                <div style={{ marginTop: 12, borderTop: '1px solid #e5e5e0', paddingTop: 12, display: 'grid', gap: 8 }}>
                  {partnerShares.map((p) => (
                    <div key={p.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, flexWrap: 'wrap', gap: 8 }}>
                        <span>
                          <strong>{p.name}</strong> ({p.sharePercent}%) — Payable ₹{p.amount} · Withdrawn ₹{p.withdrawn} · Remaining{' '}
                          <strong style={{ color: p.remaining >= 0 ? '#2e5339' : '#c0392b' }}>₹{p.remaining}</strong>
                        </span>
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => startWithdraw(vaadi.id, p.id, p.name)}>
                            Withdraw
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setHistoryFor(historyFor === p.id ? null : p.id)}
                          >
                            {historyFor === p.id ? 'Hide History' : 'History'}
                          </button>
                        </span>
                      </div>

                      {withdrawFor?.partnerId === p.id && (
                        <form
                          onSubmit={(e) => submitWithdraw(e, p.remaining)}
                          className="admin-form-row"
                          style={{ marginTop: 8 }}
                        >
                          <label className="admin-field">
                            Amount (₹)
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={withdrawForm.amount}
                              onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: Number(e.target.value) })}
                              required
                            />
                          </label>
                          <label className="admin-field">
                            Date
                            <input
                              type="date"
                              value={withdrawForm.date}
                              onChange={(e) => setWithdrawForm({ ...withdrawForm, date: e.target.value })}
                              required
                            />
                          </label>
                          <label className="admin-field">
                            Payment Method
                            <input
                              value={withdrawForm.paymentMethod}
                              onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentMethod: e.target.value })}
                              placeholder="Cash, UPI, Bank…"
                            />
                          </label>
                          <label className="admin-field">
                            Ref / Txn ID (optional)
                            <input
                              value={withdrawForm.refId}
                              onChange={(e) => setWithdrawForm({ ...withdrawForm, refId: e.target.value })}
                            />
                          </label>
                          <label className="admin-field admin-field-wide">
                            Note (optional)
                            <input
                              value={withdrawForm.note}
                              onChange={(e) => setWithdrawForm({ ...withdrawForm, note: e.target.value })}
                            />
                          </label>
                          <div className="admin-form-actions">
                            <button type="submit" className="btn btn-primary btn-sm" disabled={withdrawBusy}>
                              Save Withdrawal
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={cancelWithdraw}>
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {historyFor === p.id && (
                        <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                          {withdrawals.filter((w) => w.vaadiId === vaadi.id && w.partnerId === p.id).length === 0 ? (
                            <div className="admin-empty">No withdrawals yet.</div>
                          ) : (
                            withdrawals
                              .filter((w) => w.vaadiId === vaadi.id && w.partnerId === p.id)
                              .map((w) => (
                                <div
                                  key={w.id}
                                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f0f0ec' }}
                                >
                                  <span>
                                    {w.date} · ₹{w.amount}
                                    {w.paymentMethod ? ` · ${w.paymentMethod}` : ''}
                                    {w.refId ? ` · Ref: ${w.refId}` : ''}
                                    {w.note ? ` — ${w.note}` : ''}
                                  </span>
                                </div>
                              ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

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
