import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { requireOwnerId } from './ownerId';
import type { Pak, Shop } from './types';

export function useShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnap: (() => void) | undefined;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      unsubSnap?.();
      if (!user) {
        setShops([]);
        setLoading(false);
        return;
      }
      const q = query(collection(db, 'shops'), where('ownerId', '==', user.uid), orderBy('name', 'asc'));
      unsubSnap = onSnapshot(q, (snap) => {
        setShops(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Shop[]);
        setLoading(false);
      });
    });
    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, []);

  return { shops, loading };
}

export async function createShop(data: Omit<Shop, 'id' | 'ownerId'>) {
  await addDoc(collection(db, 'shops'), { ...data, ownerId: requireOwnerId() });
}

export async function updateShop(id: string, data: Omit<Shop, 'id' | 'ownerId'>) {
  await updateDoc(doc(db, 'shops', id), data);
}

export async function deleteShop(id: string) {
  await deleteDoc(doc(db, 'shops', id));
}

export function shopRollup(shop: Shop, paks: Pak[]) {
  const purchases = paks.flatMap((p) =>
    p.expenses
      .filter((e) => e.shopId === shop.id)
      .map((e) => ({ ...e, pakId: p.id, cropName: p.cropName }))
  );
  const total = Math.round(purchases.reduce((s, e) => s + e.amount, 0) * 100) / 100;
  return { purchases, total, count: purchases.length };
}
