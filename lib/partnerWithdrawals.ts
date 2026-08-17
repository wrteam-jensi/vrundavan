import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import type { PartnerWithdrawal } from './types';

export function usePartnerWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<PartnerWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'partnerWithdrawals'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setWithdrawals(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PartnerWithdrawal[]);
      setLoading(false);
    });
  }, []);

  return { withdrawals, loading };
}

export async function createPartnerWithdrawal(data: Omit<PartnerWithdrawal, 'id'>) {
  await addDoc(collection(db, 'partnerWithdrawals'), data);
}

export async function updatePartnerWithdrawal(id: string, data: Omit<PartnerWithdrawal, 'id'>) {
  await updateDoc(doc(db, 'partnerWithdrawals', id), data);
}

export async function deletePartnerWithdrawal(id: string) {
  await deleteDoc(doc(db, 'partnerWithdrawals', id));
}
