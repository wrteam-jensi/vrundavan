'use client';

import { useMemo } from 'react';
import type { FarmCropEntry } from '@/lib/types';

const THIS_YEAR_COLOR = '#1d6fa5';
const LAST_YEAR_COLOR = '#c9852a';

export default function YearlyComparison({ entries }: { entries: FarmCropEntry[] }) {
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;

  const rows = useMemo(() => {
    const map = new Map<string, { cropName: string; thisYearProfit: number; lastYearProfit: number }>();
    for (const e of entries) {
      const year = Number(e.saleDate.slice(0, 4));
      if (year !== thisYear && year !== lastYear) continue;
      const row = map.get(e.cropName) ?? { cropName: e.cropName, thisYearProfit: 0, lastYearProfit: 0 };
      if (year === thisYear) row.thisYearProfit += e.profit;
      else row.lastYearProfit += e.profit;
      map.set(e.cropName, row);
    }
    return Array.from(map.values()).sort(
      (a, b) => Math.abs(b.thisYearProfit) + Math.abs(b.lastYearProfit) - (Math.abs(a.thisYearProfit) + Math.abs(a.lastYearProfit))
    );
  }, [entries, thisYear, lastYear]);

  if (rows.length === 0) return null;

  const maxAbs = Math.max(...rows.flatMap((r) => [Math.abs(r.thisYearProfit), Math.abs(r.lastYearProfit)]), 1);

  return (
    <div className="admin-form" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div className="admin-page-title" style={{ fontSize: 16, marginBottom: 0 }}>
          Yearly Profit Comparison — {lastYear} vs {thisYear}
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#666' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: THIS_YEAR_COLOR, display: 'inline-block' }} />
            {thisYear}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: LAST_YEAR_COLOR, display: 'inline-block' }} />
            {lastYear}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
        {rows.map((row) => (
          <div key={row.cropName}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>{row.cropName}</div>
            <div style={{ display: 'grid', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: '#f0f0eb', borderRadius: 4, height: 14, flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(Math.abs(row.thisYearProfit) / maxAbs) * 100}%`,
                      height: '100%',
                      background: THIS_YEAR_COLOR,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, color: '#444', minWidth: 70, textAlign: 'right' }}>₹{Math.round(row.thisYearProfit * 100) / 100}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ background: '#f0f0eb', borderRadius: 4, height: 14, flex: 1, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(Math.abs(row.lastYearProfit) / maxAbs) * 100}%`,
                      height: '100%',
                      background: LAST_YEAR_COLOR,
                      borderRadius: 4,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, color: '#444', minWidth: 70, textAlign: 'right' }}>₹{Math.round(row.lastYearProfit * 100) / 100}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
