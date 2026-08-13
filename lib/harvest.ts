import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
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

export function whatsAppUrl(entry: HarvestEntry) {
  const digits = entry.farmerMobile.replace(/\D/g, '');
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const message = `Namaste ${entry.farmerName},\nTamara farm par ${entry.date} na roj ${entry.hours} kalak harvesting kaam thayu.\nTotal Charge: ₹${entry.totalAmount}\nPaid: ₹${entry.paidAmount + entry.advanceAmount}\nPending: ₹${entry.pendingAmount}\n\nThank you.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
