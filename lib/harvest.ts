import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import type { Farmer, HarvestEntry } from './types';

export function hoursBetween(startTime: string, endTime: string) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (endMin <= startMin) return 0;
  return Math.round(((endMin - startMin) / 60) * 100) / 100;
}

export function useFarmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'farmers'), orderBy('name', 'asc'));
    return onSnapshot(q, (snap) => {
      setFarmers(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Farmer[]);
      setLoading(false);
    });
  }, []);

  return { farmers, loading };
}

export function useHarvestEntries() {
  const [entries, setEntries] = useState<HarvestEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'harvestEntries'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as HarvestEntry[]);
      setLoading(false);
    });
  }, []);

  return { entries, loading };
}

export async function createFarmer(data: Omit<Farmer, 'id'>) {
  await addDoc(collection(db, 'farmers'), data);
}

export async function updateFarmer(id: string, data: Omit<Farmer, 'id'>) {
  await updateDoc(doc(db, 'farmers', id), data);
}

export async function deleteFarmer(id: string) {
  await deleteDoc(doc(db, 'farmers', id));
}

export async function createHarvestEntry(data: Omit<HarvestEntry, 'id'>) {
  await addDoc(collection(db, 'harvestEntries'), data);
}

export async function updateHarvestEntry(id: string, data: Omit<HarvestEntry, 'id'>) {
  await updateDoc(doc(db, 'harvestEntries', id), data);
}

export async function deleteHarvestEntry(id: string) {
  await deleteDoc(doc(db, 'harvestEntries', id));
}

export async function markEntriesPaid(entries: HarvestEntry[]) {
  const batch = writeBatch(db);
  for (const entry of entries) {
    batch.update(doc(db, 'harvestEntries', entry.id), {
      paidAmount: entry.paidAmount + entry.pendingAmount,
      pendingAmount: 0,
    });
  }
  await batch.commit();
}

function normalizePhone(mobile: string) {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

// Merges same farmer + same date entries (e.g. two shifts in one day) into one message,
// and adds the farmer's overall pending total (across all dates), not just this date's.
export function whatsAppEntryUrl(entry: HarvestEntry, allEntries: HarvestEntry[]) {
  const sameDayEntries = allEntries.filter((e) => e.farmerId === entry.farmerId && e.date === entry.date);
  const totalHours = Math.round(sameDayEntries.reduce((s, e) => s + e.hours, 0) * 100) / 100;
  const totalAmount = Math.round(sameDayEntries.reduce((s, e) => s + e.totalAmount, 0) * 100) / 100;
  const totalPaid = Math.round(sameDayEntries.reduce((s, e) => s + e.paidAmount + e.advanceAmount, 0) * 100) / 100;
  const dayPending = Math.round(sameDayEntries.reduce((s, e) => s + e.pendingAmount, 0) * 100) / 100;
  const overallPending = Math.round(
    allEntries.filter((e) => e.farmerId === entry.farmerId).reduce((s, e) => s + e.pendingAmount, 0) * 100
  ) / 100;

  const history = sameDayEntries
    .map((e) => `${e.startTime}–${e.endTime}: ${e.hours}h × ₹${e.ratePerHour} = ₹${e.totalAmount}`)
    .join('\n');

  const message =
    sameDayEntries.length > 1
      ? `Namaste ${entry.farmerName},\nTamara farm par ${entry.date} na roj harvesting kaam thayu:\n\n${history}\n\nKul Kalak: ${totalHours}\nTotal Charge: ₹${totalAmount}\nPaid: ₹${totalPaid}\nAaje nu Pending: ₹${dayPending}\nKul Pending (badha divas): ₹${overallPending}\n\nThank you.`
      : `Namaste ${entry.farmerName},\nTamara farm par ${entry.date} na roj ${entry.hours} kalak harvesting kaam thayu (₹${entry.ratePerHour}/kalak).\nTotal Charge: ₹${entry.totalAmount}\nPaid: ₹${entry.paidAmount + entry.advanceAmount}\nAaje nu Pending: ₹${entry.pendingAmount}\nKul Pending (badha divas): ₹${overallPending}\n\nThank you.`;

  return `https://wa.me/${normalizePhone(entry.farmerMobile)}?text=${encodeURIComponent(message)}`;
}

export function whatsAppStatementUrl(farmer: Farmer, monthLabel: string, stats: {
  totalHours: number;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  entryCount: number;
}) {
  const message = `Namaste ${farmer.name},\n${monthLabel} mahina nu harvesting summary:\n\nKul Entries: ${stats.entryCount}\nKul Kalak: ${stats.totalHours}\nKul Charge: ₹${stats.totalAmount}\nPaid: ₹${stats.totalPaid}\nPending: ₹${stats.totalPending}\n\nThank you.`;
  return `https://wa.me/${normalizePhone(farmer.mobile)}?text=${encodeURIComponent(message)}`;
}

export function whatsAppPendingUrl(farmer: Farmer, entries: HarvestEntry[]) {
  const pendingEntries = entries.filter((e) => e.farmerId === farmer.id && e.pendingAmount > 0);
  const totalPending = Math.round(pendingEntries.reduce((s, e) => s + e.pendingAmount, 0) * 100) / 100;
  const lines = pendingEntries.map((e) => `${e.date}: ${e.hours}h — ₹${e.pendingAmount}`).join('\n');
  const message = `Namaste ${farmer.name},\nTamaru pending payment:\n\n${lines}\n\nKul Pending: ₹${totalPending}\n\nThank you.`;
  return `https://wa.me/${normalizePhone(farmer.mobile)}?text=${encodeURIComponent(message)}`;
}
