import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import type { FarmCropEntry } from './types';

export function useFarmCropEntries() {
  const [entries, setEntries] = useState<FarmCropEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'farmCrops'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FarmCropEntry[]);
      setLoading(false);
    });
  }, []);

  return { entries, loading };
}

export async function createFarmCropEntry(data: Omit<FarmCropEntry, 'id'>) {
  await addDoc(collection(db, 'farmCrops'), data);
}

export async function updateFarmCropEntry(id: string, data: Omit<FarmCropEntry, 'id'>) {
  await updateDoc(doc(db, 'farmCrops', id), data);
}

export async function deleteFarmCropEntry(id: string) {
  await deleteDoc(doc(db, 'farmCrops', id));
}
