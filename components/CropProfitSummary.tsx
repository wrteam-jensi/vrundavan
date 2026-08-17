'use client';

import { useMemo } from 'react';
import type { FarmCropEntry } from '@/lib/types';
import { useLanguage } from '@/lib/i18n';

export default function CropProfitSummary({ entries }: { entries: FarmCropEntry[] }) {
  const { t } = useLanguage();
  const byCrop = useMemo(() => {
    const map = new Map<string, { cropName: string; cost: number; revenue: number; profit: number; count: number }>();
    for (const e of entries) {
      const row = map.get(e.cropName) ?? { cropName: e.cropName, cost: 0, revenue: 0, profit: 0, count: 0 };
      row.cost += e.cost;
      row.revenue += e.revenue;
      row.profit += e.profit;
      row.count += 1;
      map.set(e.cropName, row);
    }
    return Array.from(map.values()).sort((a, b) => b.profit - a.profit);
  }, [entries]);

  if (byCrop.length === 0) return null;

  const maxProfit = Math.max(...byCrop.map((r) => Math.abs(r.profit)), 1);

  return (
    <div className="admin-form" style={{ marginBottom: 20 }}>
      <div className="admin-page-title" style={{ fontSize: 16, marginBottom: 4 }}>{t('cropProfit.title')}</div>
      <div className="admin-list">
        {byCrop.map((row) => (
          <div key={row.cropName} className="admin-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div className="admin-card-title">
                {row.cropName} <span className="sub">{row.count} {row.count === 1 ? t('cropProfit.unit.entry') : t('cropProfit.unit.entries')}</span>
              </div>
              <div className="admin-card-meta">
                {t('cropProfit.label.cost')} ₹{Math.round(row.cost * 100) / 100} · {t('cropProfit.label.revenue')} ₹{Math.round(row.revenue * 100) / 100} · {t('cropProfit.label.profit')}{' '}
                <strong style={{ color: row.profit >= 0 ? '#2e5339' : '#c0392b' }}>₹{Math.round(row.profit * 100) / 100}</strong>
              </div>
            </div>
            <div style={{ background: '#f0f0eb', borderRadius: 6, height: 8, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, (Math.abs(row.profit) / maxProfit) * 100)}%`,
                  height: '100%',
                  background: row.profit >= 0 ? '#2e5339' : '#c0392b',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
