'use client';

import { useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import '../admin.css';

const OWNED_COLLECTIONS = ['farmers', 'harvestEntries', 'vaadis', 'paks', 'partnerWithdrawals', 'farmCrops'];
const BATCH_SIZE = 500;

export default function MigrateOwnerPage() {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const append = (line: string) => setLog((prev) => [...prev, line]);

  const run = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      append('Not signed in.');
      return;
    }
    setBusy(true);
    setLog([`Backfilling ownerId = ${uid}`]);

    for (const name of OWNED_COLLECTIONS) {
      try {
        const snap = await getDocs(collection(db, name));
        const missing = snap.docs.filter((d) => !d.data().ownerId);
        let updated = 0;
        for (let i = 0; i < missing.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          for (const d of missing.slice(i, i + BATCH_SIZE)) {
            batch.update(doc(db, name, d.id), { ownerId: uid });
            updated++;
          }
          await batch.commit();
        }
        append(`${name}: ${updated} updated, ${snap.size - missing.length} already had ownerId`);
      } catch (err) {
        append(`${name}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    try {
      const oldSettings = await getDoc(doc(db, 'settings', 'rate'));
      if (oldSettings.exists()) {
        await setDoc(doc(db, 'settings', uid), { ratePerHour: oldSettings.data().ratePerHour ?? 0 });
        append(`settings: copied ratePerHour into settings/${uid}`);
      } else {
        append('settings: no legacy settings/rate doc found, skipped');
      }
    } catch {
      append('settings: could not read legacy settings/rate (rules already scoped) — set the rate manually on the Harvesting page instead');
    }

    append('Done.');
    setBusy(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h1>Owner backfill (one-time)</h1>
      <p>Stamps ownerId on existing documents so they belong to the currently signed-in admin. Safe to re-run.</p>
      <button className="btn btn-primary" onClick={run} disabled={busy}>
        {busy ? 'Running…' : 'Run backfill'}
      </button>
      <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{log.join('\n')}</pre>
    </div>
  );
}
