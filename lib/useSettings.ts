'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_REF = () => doc(db, 'settings', 'rate');

export function useRatePerHour() {
  const [ratePerHour, setRatePerHour] = useState<number | null>(null);

  useEffect(
    () =>
      onSnapshot(SETTINGS_REF(), (snap) => {
        setRatePerHour(snap.exists() ? (snap.data().ratePerHour ?? 0) : 0);
      }),
    []
  );

  return ratePerHour;
}

export async function updateRatePerHour(rate: number) {
  await setDoc(SETTINGS_REF(), { ratePerHour: rate });
}
