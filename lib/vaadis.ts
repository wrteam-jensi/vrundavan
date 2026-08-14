import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import type { Vaadi } from './types';

export function useVaadis() {
  const [vaadis, setVaadis] = useState<Vaadi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'vaadis'), orderBy('name', 'asc'));
    return onSnapshot(q, (snap) => {
      setVaadis(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Vaadi[]);
      setLoading(false);
    });
  }, []);

  return { vaadis, loading };
}

export async function createVaadi(data: Omit<Vaadi, 'id'>) {
  await addDoc(collection(db, 'vaadis'), data);
}

export async function updateVaadi(id: string, data: Omit<Vaadi, 'id'>) {
  await updateDoc(doc(db, 'vaadis', id), data);
}

export async function deleteVaadi(id: string) {
  await deleteDoc(doc(db, 'vaadis', id));
}
