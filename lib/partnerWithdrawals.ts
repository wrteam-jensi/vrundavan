import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { requireOwnerId } from './ownerId';
import type { PartnerWithdrawal } from './types';

export function usePartnerWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<PartnerWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnap: (() => void) | undefined;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      unsubSnap?.();
      if (!user) {
        setWithdrawals([]);
        setLoading(false);
        return;
      }
      const q = query(collection(db, 'partnerWithdrawals'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
      unsubSnap = onSnapshot(q, (snap) => {
        setWithdrawals(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as PartnerWithdrawal[]);
        setLoading(false);
      });
    });
    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, []);

  return { withdrawals, loading };
}

export async function createPartnerWithdrawal(data: Omit<PartnerWithdrawal, 'id' | 'ownerId'>) {
  await addDoc(collection(db, 'partnerWithdrawals'), { ...data, ownerId: requireOwnerId() });
}

export async function updatePartnerWithdrawal(id: string, data: Omit<PartnerWithdrawal, 'id' | 'ownerId'>) {
  await updateDoc(doc(db, 'partnerWithdrawals', id), data);
}

export async function deletePartnerWithdrawal(id: string) {
  await deleteDoc(doc(db, 'partnerWithdrawals', id));
}
