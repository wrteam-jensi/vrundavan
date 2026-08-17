'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { createVaadi, deleteVaadi, updateVaadi, useVaadis, vaadiRollup } from '@/lib/vaadis';
import { usePaks } from '@/lib/paks';
import {
  createPartnerWithdrawal,
  deletePartnerWithdrawal,
  updatePartnerWithdrawal,
  usePartnerWithdrawals,
} from '@/lib/partnerWithdrawals';
import type { PartnerWithdrawal, Vaadi, VaadiPartner } from '@/lib/types';
import SkeletonList from '@/components/SkeletonList';
import { useAdminUI } from '@/components/AdminUI';
import { useLanguage } from '@/lib/i18n';
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
  const { t } = useLanguage();
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
  const [editWithdrawId, setEditWithdrawId] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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
        showToast(t('vaadis.toast.shareTotalMismatch').replace('{percent}', String(partnerTotal)), 'error');
      }
      if (editingId) {
        await updateVaadi(editingId, data);
        showToast(t('vaadis.toast.updated'));
      } else {
        await createVaadi(data);
        showToast(t('vaadis.toast.added'));
      }
      cancelEdit();
    } catch {
      showToast(t('vaadis.toast.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (vaadi: Vaadi) => {
    if (!(await confirm(t('vaadis.confirm.delete').replace('{name}', vaadi.name)))) return;
    const { id, ...data } = vaadi;
    await deleteVaadi(id);
    showToast(t('vaadis.toast.deleted'), {
      action: {
        label: t('vaadis.action.undo'),
        onClick: async () => {
          await createVaadi(data);
          showToast(t('vaadis.toast.restored'));
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

  const filteredRollups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rollups;
    return rollups.filter(
      ({ vaadi, partnerShares }) =>
        vaadi.name.toLowerCase().includes(q) || partnerShares.some((p) => p.name.toLowerCase().includes(q))
    );
  }, [rollups, search]);

  const startWithdraw = (vaadiId: string, partnerId: string, partnerName: string) => {
    setWithdrawFor({ vaadiId, partnerId, partnerName });
    setWithdrawForm(EMPTY_WITHDRAWAL);
    setEditWithdrawId(null);
  };

  const startEditWithdraw = (w: PartnerWithdrawal) => {
    setWithdrawFor({ vaadiId: w.vaadiId, partnerId: w.partnerId, partnerName: w.partnerName });
    setWithdrawForm({
      amount: w.amount,
      date: w.date,
      paymentMethod: w.paymentMethod,
      note: w.note,
      refId: w.refId,
    });
    setEditWithdrawId(w.id);
  };

  const cancelWithdraw = () => {
    setWithdrawFor(null);
    setWithdrawForm(EMPTY_WITHDRAWAL);
    setEditWithdrawId(null);
  };

  const submitWithdraw = async (e: FormEvent) => {
    e.preventDefault();
    if (!withdrawFor) return;
    if (withdrawForm.amount <= 0) {
      showToast(t('vaadis.toast.invalidAmount'), 'error');
      return;
    }
    setWithdrawBusy(true);
    try {
      if (editWithdrawId) {
        await updatePartnerWithdrawal(editWithdrawId, {
          vaadiId: withdrawFor.vaadiId,
          partnerId: withdrawFor.partnerId,
          partnerName: withdrawFor.partnerName,
          amount: withdrawForm.amount,
          date: withdrawForm.date,
          paymentMethod: withdrawForm.paymentMethod,
          note: withdrawForm.note,
          refId: withdrawForm.refId,
          createdAt: withdrawals.find((w) => w.id === editWithdrawId)?.createdAt ?? Date.now(),
        });
        showToast(t('vaadis.toast.withdrawalUpdated'));
      } else {
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
        showToast(t('vaadis.toast.withdrawalRecorded'));
      }
      cancelWithdraw();
    } catch (err) {
      console.error('submitWithdraw failed', err);
      showToast(t('vaadis.toast.error'), 'error');
    } finally {
      setWithdrawBusy(false);
    }
  };

  const onDeleteWithdraw = async (w: PartnerWithdrawal) => {
    if (!(await confirm(t('vaadis.confirm.deleteWithdrawal')))) return;
    await deletePartnerWithdrawal(w.id);
    showToast(t('vaadis.toast.withdrawalDeleted'), {
      action: {
        label: t('vaadis.action.undo'),
        onClick: async () => {
          const { id, ...data } = w;
          await createPartnerWithdrawal(data);
          showToast(t('vaadis.toast.withdrawalRestored'));
        },
      },
    });
  };

  return (
    <div>
      <h1 className="admin-page-title">{t('vaadis.title')}</h1>

      <form onSubmit={onSubmit} className="admin-form">
        <div className="admin-form-row">
          <label className="admin-field">
            {t('vaadis.field.vaadiName')}
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder={t('vaadis.placeholder.vaadiName')} />
          </label>
        </div>

        <div className="admin-cost-breakdown-label">
          {t('vaadis.field.partnersShare')} {partnerTotal !== 100 && <span style={{ color: '#c0392b' }}>— {t('vaadis.field.total').replace('{percent}', String(partnerTotal))}</span>}
        </div>
        {form.partners.map((p, i) => (
          <div className="admin-form-row" key={i}>
            <label className="admin-field">
              {t('vaadis.field.name')}
              <input value={p.name} onChange={(e) => updatePartner(i, 'name', e.target.value)} placeholder={t('vaadis.placeholder.partnerName')} />
            </label>
            <label className="admin-field">
              {t('vaadis.field.sharePercent')}
              <input type="number" min={0} max={100} step="0.01" value={p.sharePercent} onChange={(e) => updatePartner(i, 'sharePercent', e.target.value)} />
            </label>
            {form.partners.length > 1 && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => removePartnerRow(i)} style={{ alignSelf: 'flex-end' }}>
                {t('vaadis.action.remove')}
              </button>
            )}
          </div>
        ))}
        <div className="admin-form-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={addPartnerRow}>
            {t('vaadis.action.addPartner')}
          </button>
        </div>

        <label className="admin-field admin-field-wide">
          {t('vaadis.field.noteOptional')}
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        <div className="admin-form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editingId ? t('vaadis.action.updateVaadi') : t('vaadis.action.addVaadi')}
          </button>
          {editingId && (
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              {t('vaadis.action.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="admin-filters">
        <input placeholder={t('vaadis.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : (
        <div className="admin-list">
          {filteredRollups.map(({ vaadi, pakCount, cost, revenue, profit, partnerShares }) => (
            <div key={vaadi.id} className="admin-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div className="admin-card-body">
                <div className="admin-card-title">{vaadi.name}</div>
                <div className="admin-card-meta">
                  {pakCount} {pakCount === 1 ? t('vaadis.unit.pak') : t('vaadis.unit.paks')} · {t('vaadis.label.cost')} ₹{cost} · {t('vaadis.label.revenue')} ₹{revenue} · {t('vaadis.label.profit')}{' '}
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
                          <strong>{p.name}</strong> ({p.sharePercent}%) — {t('vaadis.label.payable')} ₹{p.amount} · {t('vaadis.label.withdrawn')} ₹{p.withdrawn} · {t('vaadis.label.remaining')}{' '}
                          <strong style={{ color: p.remaining >= 0 ? '#2e5339' : '#c0392b' }}>₹{p.remaining}</strong>
                        </span>
                        <span style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => startWithdraw(vaadi.id, p.id, p.name)}>
                            {t('vaadis.action.withdraw')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setHistoryFor(historyFor === p.id ? null : p.id)}
                          >
                            {historyFor === p.id ? t('vaadis.action.hideHistory') : t('vaadis.action.history')}
                          </button>
                        </span>
                      </div>

                      {withdrawFor?.partnerId === p.id && (
                        <form
                          onSubmit={(e) => submitWithdraw(e)}
                          className="admin-form-row"
                          style={{ marginTop: 8 }}
                        >
                          <label className="admin-field">
                            {t('vaadis.field.amount')}
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
                            {t('vaadis.field.date')}
                            <input
                              type="date"
                              value={withdrawForm.date}
                              onChange={(e) => setWithdrawForm({ ...withdrawForm, date: e.target.value })}
                              required
                            />
                          </label>
                          <label className="admin-field">
                            {t('vaadis.field.paymentMethod')}
                            <input
                              value={withdrawForm.paymentMethod}
                              onChange={(e) => setWithdrawForm({ ...withdrawForm, paymentMethod: e.target.value })}
                              placeholder={t('vaadis.placeholder.paymentMethod')}
                            />
                          </label>
                          <label className="admin-field">
                            {t('vaadis.field.refIdOptional')}
                            <input
                              value={withdrawForm.refId}
                              onChange={(e) => setWithdrawForm({ ...withdrawForm, refId: e.target.value })}
                            />
                          </label>
                          <label className="admin-field admin-field-wide">
                            {t('vaadis.field.noteOptional')}
                            <input
                              value={withdrawForm.note}
                              onChange={(e) => setWithdrawForm({ ...withdrawForm, note: e.target.value })}
                            />
                          </label>
                          <div className="admin-form-actions">
                            <button type="submit" className="btn btn-primary btn-sm" disabled={withdrawBusy}>
                              {editWithdrawId ? t('vaadis.action.updateWithdrawal') : t('vaadis.action.saveWithdrawal')}
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={cancelWithdraw}>
                              {t('vaadis.action.cancel')}
                            </button>
                          </div>
                        </form>
                      )}

                      {historyFor === p.id && (
                        <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                          {withdrawals.filter((w) => w.vaadiId === vaadi.id && w.partnerId === p.id).length === 0 ? (
                            <div className="admin-empty">{t('vaadis.empty.noWithdrawals')}</div>
                          ) : (
                            withdrawals
                              .filter((w) => w.vaadiId === vaadi.id && w.partnerId === p.id)
                              .map((w) => (
                                <div
                                  key={w.id}
                                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #f0f0ec', gap: 8 }}
                                >
                                  <span>
                                    {w.date} · ₹{w.amount}
                                    {w.paymentMethod ? ` · ${w.paymentMethod}` : ''}
                                    {w.refId ? ` · ${t('vaadis.label.ref')} ${w.refId}` : ''}
                                    {w.note ? ` — ${w.note}` : ''}
                                  </span>
                                  <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEditWithdraw(w)}>
                                      {t('vaadis.action.edit')}
                                    </button>
                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => onDeleteWithdraw(w)}>
                                      {t('vaadis.action.delete')}
                                    </button>
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
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(vaadi)}>{t('vaadis.action.edit')}</button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => onDelete(vaadi)}>{t('vaadis.action.delete')}</button>
              </div>
            </div>
          ))}
          {filteredRollups.length === 0 && <div className="admin-empty">{t('vaadis.empty.noVaadis')}</div>}
        </div>
      )}
    </div>
  );
}
