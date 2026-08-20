import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { requireOwnerId } from './ownerId';
import type { FarmCropEntry } from './types';

export function useFarmCropEntries() {
  const [entries, setEntries] = useState<FarmCropEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnap: (() => void) | undefined;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      unsubSnap?.();
      if (!user) {
        setEntries([]);
        setLoading(false);
        return;
      }
      const q = query(collection(db, 'farmCrops'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
      unsubSnap = onSnapshot(q, (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FarmCropEntry[]);
        setLoading(false);
      });
    });
    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, []);

  return { entries, loading };
}

export async function createFarmCropEntry(data: Omit<FarmCropEntry, 'id' | 'ownerId'>) {
  await addDoc(collection(db, 'farmCrops'), { ...data, ownerId: requireOwnerId() });
}

export async function updateFarmCropEntry(id: string, data: Omit<FarmCropEntry, 'id' | 'ownerId'>) {
  await updateDoc(doc(db, 'farmCrops', id), data);
}

export async function deleteFarmCropEntry(id: string) {
  await deleteDoc(doc(db, 'farmCrops', id));
}
