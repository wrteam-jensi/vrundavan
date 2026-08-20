import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { requireOwnerId } from './ownerId';
import type { Pak, Vaadi, VaadiPartner } from './types';

export function useVaadis() {
  const [vaadis, setVaadis] = useState<Vaadi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnap: (() => void) | undefined;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      unsubSnap?.();
      if (!user) {
        setVaadis([]);
        setLoading(false);
        return;
      }
      const q = query(collection(db, 'vaadis'), where('ownerId', '==', user.uid), orderBy('name', 'asc'));
      unsubSnap = onSnapshot(q, (snap) => {
        setVaadis(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Vaadi[]);
        setLoading(false);
      });
    });
    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, []);

  return { vaadis, loading };
}

function withPartnerIds(partners: VaadiPartner[]) {
  return partners.map((p) => ({ ...p, id: p.id || crypto.randomUUID() }));
}

export async function createVaadi(data: Omit<Vaadi, 'id' | 'ownerId'>) {
  await addDoc(collection(db, 'vaadis'), { ...data, partners: withPartnerIds(data.partners), ownerId: requireOwnerId() });
}

export async function updateVaadi(id: string, data: Omit<Vaadi, 'id' | 'ownerId'>) {
  await updateDoc(doc(db, 'vaadis', id), { ...data, partners: withPartnerIds(data.partners) });
}

export async function deleteVaadi(id: string) {
  await deleteDoc(doc(db, 'vaadis', id));
}

export function vaadiRollup(vaadi: Vaadi, paks: Pak[]) {
  const vaadiPaks = paks.filter((p) => p.vaadiId === vaadi.id);
  const cost = Math.round(vaadiPaks.reduce((s, p) => s + p.expenses.reduce((a, e) => a + e.amount, 0), 0) * 100) / 100;
  const revenue = Math.round(vaadiPaks.reduce((s, p) => s + p.yieldQty * p.pricePerUnit, 0) * 100) / 100;
  const profit = Math.round((revenue - cost) * 100) / 100;
  const partnerShares = vaadi.partners.map((p, i) => ({
    ...p,
    id: p.id || `legacy-${vaadi.id}-${i}`,
    amount: Math.round((profit * p.sharePercent) / 100 * 100) / 100,
  }));
  return { pakCount: vaadiPaks.length, cost, revenue, profit, partnerShares };
}
