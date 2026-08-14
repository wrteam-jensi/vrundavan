'use client';

import { useMemo } from 'react';
import type { FarmCropEntry } from '@/lib/types';

const CATEGORIES: { key: keyof FarmCropEntry; label: string; color: string }[] = [
  { key: 'costSeed', label: 'Seed', color: '#1d6fa5' },
  { key: 'costFertilizer', label: 'Khatar', color: '#c9852a' },
  { key: 'costPesticide', label: 'Dava', color: '#3f8f5f' },
  { key: 'costLabor', label: 'Majoor', color: '#a34a9c' },
  { key: 'costFuel', label: 'Fuel', color: '#c0392b' },
  { key: 'costOther', label: 'Other', color: '#3d5c99' },
];

export default function CostBreakdownChart({ entries }: { entries: FarmCropEntry[] }) {
  const totals = useMemo(() => {
    return CATEGORIES.map((c) => ({
      ...c,
      total: Math.round(entries.reduce((s, e) => s + ((e[c.key] as number) ?? 0), 0) * 100) / 100,
    }));
  }, [entries]);

  const grandTotal = totals.reduce((s, c) => s + c.total, 0);

  if (grandTotal === 0) return null;

  const maxTotal = Math.max(...totals.map((c) => c.total), 1);

  return (
    <div className="admin-form" style={{ marginBottom: 20 }}>
      <div className="admin-page-title" style={{ fontSize: 16, marginBottom: 4 }}>Cost Breakdown (Kharch)</div>
      <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
        {totals
          .filter((c) => c.total > 0)
          .sort((a, b) => b.total - a.total)
          .map((c) => (
            <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#444', width: 70, flexShrink: 0 }}>{c.label}</span>
              <div style={{ background: '#f0f0eb', borderRadius: 5, height: 16, flex: 1, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(c.total / maxTotal) * 100}%`,
                    height: '100%',
                    background: c.color,
                    borderRadius: 5,
                  }}
                />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', minWidth: 70, textAlign: 'right' }}>
                ₹{c.total} <span style={{ fontWeight: 400, color: '#888' }}>({Math.round((c.total / grandTotal) * 100)}%)</span>
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
