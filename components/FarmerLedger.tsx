'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  createFarmerPayment,
  deleteFarmerPayment,
  farmerLedger,
  whatsAppLedgerUrl,
  type LedgerRow,
} from '@/lib/farmerPayments';
import type { FarmerPayment, HarvestEntry } from '@/lib/types';
import { useAdminUI } from '@/components/AdminUI';
import { useLanguage } from '@/lib/i18n';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const METHOD_KEYS = ['ledger.methodCash', 'ledger.methodUpi', 'ledger.methodBank', 'ledger.methodCheque'] as const;

interface Props {
  farmerId: string;
  farmerName: string;
  farmerMobile: string;
  /** All entries for this owner — filtered by farmerId inside, so the balance spans every date. */
  entries: HarvestEntry[];
  payments: FarmerPayment[];
}

export default function FarmerLedger({ farmerId, farmerName, farmerMobile, entries, payments }: Props) {
  const { t } = useLanguage();
  const { showToast, confirm } = useAdminUI();
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [method, setMethod] = useState(t('ledger.methodCash'));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const ledger = useMemo(
    () =>
      farmerLedger(farmerId, entries, payments, {
        charge: t('ledger.rowCharge'),
        collected: t('ledger.rowCollected'),
        payment: t('ledger.rowPayment'),
      }),
    [farmerId, entries, payments, t]
  );

  const entered = Number(amount) || 0;
  const overpay = Math.round((entered - ledger.balance) * 100) / 100;

  const resetForm = () => {
    setAmount('');
    setDate(todayStr());
    setMethod(t('ledger.methodCash'));
    setNote('');
    setFormOpen(false);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (entered <= 0) {
      showToast(t('ledger.toast.amountRequired'), 'error');
      return;
    }
    setBusy(true);
    try {
      await createFarmerPayment({
        farmerId,
        farmerName,
        amount: entered,
        date,
        paymentMethod: method,
        note,
        createdAt: Date.now(),
      });
      showToast(t('ledger.toast.saved'));
      resetForm();
      setOpen(true);
    } catch {
      showToast(t('ledger.toast.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDeletePayment = async (row: LedgerRow) => {
    const payment = payments.find((p) => p.id === row.paymentId);
    if (!payment) return;
    if (
      !(await confirm(
        t('ledger.confirm.delete').replace('{amount}', String(payment.amount)).replace('{date}', payment.date)
      ))
    )
      return;
    const { id, ownerId, ...data } = payment;
    try {
      await deleteFarmerPayment(id);
      showToast(t('ledger.toast.deleted'), {
        action: {
          label: t('ledger.toast.undo'),
          onClick: async () => {
            await createFarmerPayment(data);
            showToast(t('ledger.toast.restored'));
          },
        },
      });
    } catch {
      showToast(t('ledger.toast.error'), 'error');
    }
  };

  return (
    <div className="admin-ledger">
      <div className="admin-ledger-bar">
        <span className={`admin-pending-badge ${ledger.balance > 0 ? 'pending-due' : 'pending-ok'}`}>
          {ledger.balance > 0 ? t('ledger.balance') : t('ledger.settled')} <strong>₹{ledger.balance}</strong>
        </span>
        <button
          type="button"
          className={`btn btn-sm ${formOpen ? 'btn-secondary' : 'btn-primary'}`}
          onClick={() => (formOpen ? resetForm() : setFormOpen(true))}
        >
          {formOpen ? t('ledger.cancel') : t('ledger.recordPayment')}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen((o) => !o)}>
          {open ? t('ledger.hideLedger') : t('ledger.viewLedger')}
        </button>
        {ledger.rows.length > 0 && (
          <a
            href={whatsAppLedgerUrl(farmerName, farmerMobile, ledger)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp btn-sm"
          >
            {t('ledger.sendWhatsApp')}
          </a>
        )}
      </div>

      {formOpen && (
        <form onSubmit={onSubmit} className="admin-ledger-form">
          <label className="admin-field">
            {t('ledger.amount')}
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </label>
          <label className="admin-field">
            {t('ledger.date')}
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="admin-field">
            {t('ledger.method')}
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHOD_KEYS.map((k) => (
                <option key={k} value={t(k)}>
                  {t(k)}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field admin-field-wide">
            {t('ledger.note')}
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="admin-ledger-form-actions">
            {ledger.balance > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setAmount(String(ledger.balance))}
              >
                {t('ledger.payFull').replace('{amount}', String(ledger.balance))}
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || entered <= 0}>
              {busy ? t('ledger.saving') : t('ledger.save')}
            </button>
          </div>
          {overpay > 0 && (
            <div className="admin-ledger-warn">
              {t('ledger.overpayWarning').replace('{amount}', String(overpay))}
            </div>
          )}
        </form>
      )}

      {open && (
        <div className="admin-ledger-table-wrap">
          {ledger.rows.length === 0 ? (
            <div className="admin-empty">{t('ledger.noRows')}</div>
          ) : (
            <table className="admin-ledger-table">
              <thead>
                <tr>
                  <th>{t('ledger.colDate')}</th>
                  <th>{t('ledger.colDetail')}</th>
                  <th className="num">{t('ledger.colUdhar')}</th>
                  <th className="num">{t('ledger.colJama')}</th>
                  <th className="num">{t('ledger.colBalance')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ledger.rows.map((r, i) => (
                  <tr key={`${r.date}-${r.kind}-${r.paymentId ?? i}`}>
                    <td>{r.date}</td>
                    <td>
                      {r.label}
                      {r.note && <span className="admin-ledger-note"> — {r.note}</span>}
                    </td>
                    <td className="num debit">{r.kind === 'debit' ? `₹${r.amount}` : ''}</td>
                    <td className="num credit">{r.kind === 'credit' ? `₹${r.amount}` : ''}</td>
                    <td className="num">₹{r.balance}</td>
                    <td className="num">
                      {r.paymentId && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => onDeletePayment(r)}
                        >
                          {t('ledger.deletePayment')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>
                    {t('ledger.debit')} / {t('ledger.credit')}
                  </td>
                  <td className="num debit">₹{ledger.debit}</td>
                  <td className="num credit">₹{ledger.credit}</td>
                  <td className="num">
                    <strong>₹{ledger.balance}</strong>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
