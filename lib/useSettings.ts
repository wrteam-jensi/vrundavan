'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { requireOwnerId } from './ownerId';

export function useRatePerHour() {
  const [ratePerHour, setRatePerHour] = useState<number | null>(null);

  useEffect(() => {
    let unsubSnap: (() => void) | undefined;
    const unsubAuth = auth.onAuthStateChanged((user) => {
      unsubSnap?.();
      if (!user) {
        setRatePerHour(null);
        return;
      }
      unsubSnap = onSnapshot(doc(db, 'settings', user.uid), (snap) => {
        setRatePerHour(snap.exists() ? (snap.data().ratePerHour ?? 0) : 0);
      });
    });
    return () => {
      unsubSnap?.();
      unsubAuth();
    };
  }, []);

  return ratePerHour;
}

export async function updateRatePerHour(rate: number) {
  await setDoc(doc(db, 'settings', requireOwnerId()), { ratePerHour: rate });
}
