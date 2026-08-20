import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { requireOwnerId } from './ownerId';
import type { Pak } from './types';

export function usePaks() {
  const [paks, setPaks] = useState<Pak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnap: (() => void) | undefined;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      unsubSnap?.();
      if (!user) {
        setPaks([]);
        setLoading(false);
        return;
      }
      const q = query(collection(db, 'paks'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
      unsubSnap = onSnapshot(q, (snap) => {
        setPaks(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Pak[]);
        setLoading(false);
      });
    });
    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, []);

  return { paks, loading };
}

export async function createPak(data: Omit<Pak, 'id' | 'ownerId'>) {
  await addDoc(collection(db, 'paks'), { ...data, ownerId: requireOwnerId() });
}

export async function updatePak(id: string, data: Omit<Pak, 'id' | 'ownerId'>) {
  await updateDoc(doc(db, 'paks', id), data);
}

export async function deletePak(id: string) {
  await deleteDoc(doc(db, 'paks', id));
}
