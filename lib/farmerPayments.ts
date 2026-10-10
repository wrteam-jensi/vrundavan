import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { requireOwnerId } from './ownerId';
import type { FarmerPayment, HarvestEntry } from './types';

export function useFarmerPayments() {
  const [payments, setPayments] = useState<FarmerPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnap: (() => void) | undefined;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      unsubSnap?.();
      if (!user) {
        setPayments([]);
        setLoading(false);
        return;
      }
      const q = query(collection(db, 'farmerPayments'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
      unsubSnap = onSnapshot(q, (snap) => {
        setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FarmerPayment[]);
        setLoading(false);
      });
    });
    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, []);

  return { payments, loading };
}

export async function createFarmerPayment(data: Omit<FarmerPayment, 'id' | 'ownerId'>) {
  await addDoc(collection(db, 'farmerPayments'), { ...data, ownerId: requireOwnerId() });
}

export async function updateFarmerPayment(id: string, data: Omit<FarmerPayment, 'id' | 'ownerId'>) {
  await updateDoc(doc(db, 'farmerPayments', id), data);
}

export async function deleteFarmerPayment(id: string) {
  await deleteDoc(doc(db, 'farmerPayments', id));
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface LedgerRow {
  kind: 'debit' | 'credit';
  date: string;
  amount: number;
  label: string;
  note: string;
  /** Present on credit rows backed by a farmerPayments doc, so the row can be edited or deleted. */
  paymentId?: string;
  /** Running balance after this row, oldest-first. */
  balance: number;
}

export interface FarmerLedger {
  /** Everything billed to the farmer (sum of entry totals). */
  debit: number;
  /** Everything received — entry advances, entry paid-now, plus standalone payments. */
  credit: number;
  /** debit − credit. Positive means the farmer still owes. */
  balance: number;
  rows: LedgerRow[];
}

/**
 * Builds a farmer's running account from their harvest entries and standalone payments.
 *
 * Harvest entries are debits for their full charge; whatever was collected at entry time
 * (advance + paid-now) rides along as a same-day credit, so an entry that was settled on
 * the spot nets to zero without needing a payment record. `pendingAmount` is deliberately
 * ignored here — the balance is derived, so partial payments recorded later stay consistent
 * even when the stored per-entry pending is stale.
 */
export function farmerLedger(
  farmerId: string,
  entries: HarvestEntry[],
  payments: FarmerPayment[],
  labels: { charge: string; collected: string; payment: string }
): FarmerLedger {
  const rows: LedgerRow[] = [];

  for (const e of entries.filter((x) => x.farmerId === farmerId)) {
    rows.push({
      kind: 'debit',
      date: e.date,
      amount: e.totalAmount,
      label: `${labels.charge} · ${e.hours}h × ₹${e.ratePerHour}`,
      note: e.note,
      balance: 0,
    });
    const collected = round2(e.advanceAmount + e.paidAmount);
    if (collected > 0) {
      rows.push({
        kind: 'credit',
        date: e.date,
        amount: collected,
        label: labels.collected,
        note: '',
        balance: 0,
      });
    }
  }

  for (const p of payments.filter((x) => x.farmerId === farmerId)) {
    rows.push({
      kind: 'credit',
      date: p.date,
      amount: p.amount,
      label: p.paymentMethod ? `${labels.payment} · ${p.paymentMethod}` : labels.payment,
      note: p.note,
      paymentId: p.id,
      balance: 0,
    });
  }

  // Oldest first so the running balance reads like a passbook; debits before credits on the
  // same date, so a same-day collection shows what it settled.
  rows.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.kind !== b.kind) return a.kind === 'debit' ? -1 : 1;
    return 0;
  });

  let debit = 0;
  let credit = 0;
  for (const r of rows) {
    if (r.kind === 'debit') debit = round2(debit + r.amount);
    else credit = round2(credit + r.amount);
    r.balance = round2(debit - credit);
  }

  return { debit, credit, balance: round2(debit - credit), rows };
}

function normalizePhone(mobile: string) {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

export function whatsAppLedgerUrl(farmerName: string, farmerMobile: string, ledger: FarmerLedger) {
  const lines = ledger.rows
    .map((r) => `${r.date}  ${r.kind === 'debit' ? 'Udhar' : 'Jama'}  ₹${r.amount}  (baki ₹${r.balance})`)
    .join('\n');
  const message = `Namaste ${farmerName},\nTamaru khatu:\n\n${lines}\n\nKul Udhar: ₹${ledger.debit}\nKul Jama: ₹${ledger.credit}\nBaki Udhar: ₹${ledger.balance}\n\nThank you.`;
  return `https://wa.me/${normalizePhone(farmerMobile)}?text=${encodeURIComponent(message)}`;
}
