import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import type { Pak } from './types';

export function usePaks() {
  const [paks, setPaks] = useState<Pak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'paks'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPaks(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Pak[]);
      setLoading(false);
    });
  }, []);

  return { paks, loading };
}

export async function createPak(data: Omit<Pak, 'id'>) {
  await addDoc(collection(db, 'paks'), data);
}

export async function updatePak(id: string, data: Omit<Pak, 'id'>) {
  await updateDoc(doc(db, 'paks', id), data);
}

export async function deletePak(id: string) {
  await deleteDoc(doc(db, 'paks', id));
}
