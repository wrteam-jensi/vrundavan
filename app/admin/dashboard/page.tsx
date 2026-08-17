'use client';

import { useMemo } from 'react';
import { useFarmers, useHarvestEntries, whatsAppEntryUrl } from '@/lib/harvest';
import { useFarmCropEntries } from '@/lib/farmCrops';
import SkeletonList from '@/components/SkeletonList';
import '../admin.css';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard() {
  const { farmers } = useFarmers();
  const { entries: harvestEntries, loading: harvestLoading } = useHarvestEntries();
  const { entries: cropEntries, loading: cropLoading } = useFarmCropEntries();

  const loading = harvestLoading || cropLoading;
  const today = todayStr();

  const summary = useMemo(() => {
    const todayHarvest = harvestEntries.filter((e) => e.date === today);
    const todayVaadi = cropEntries.filter((e) => e.saleDate === today);
    return {
      todayHours: Math.round(todayHarvest.reduce((s, e) => s + e.hours, 0) * 100) / 100,
      todayHarvestAmount: Math.round(todayHarvest.reduce((s, e) => s + e.totalAmount, 0) * 100) / 100,
      todayVaadiCost: Math.round(todayVaadi.reduce((s, e) => s + e.cost, 0) * 100) / 100,
      todayVaadiRevenue: Math.round(todayVaadi.reduce((s, e) => s + e.revenue, 0) * 100) / 100,
      totalPending: Math.round(harvestEntries.reduce((s, e) => s + e.pendingAmount, 0) * 100) / 100,
      farmerCount: farmers.length,
    };
  }, [harvestEntries, cropEntries, today, farmers]);

  const recentEntries = useMemo(() => harvestEntries.slice(0, 5), [harvestEntries]);

  const topPendingFarmers = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of harvestEntries) map.set(e.farmerId, (map.get(e.farmerId) ?? 0) + e.pendingAmount);
    return farmers
      .map((f) => ({ farmer: f, pending: Math.round((map.get(f.id) ?? 0) * 100) / 100 }))
      .filter((r) => r.pending > 0)
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 5);
  }, [harvestEntries, farmers]);

  return (
    <div>
      <h1 className="admin-page-title">Dashboard</h1>

      {loading ? (
        <SkeletonList rows={2} />
      ) : (
        <>
          <div className="admin-stats">
            <div className="admin-stat-card">
              <div className="admin-stat-label">Today's Harvesting Hours</div>
              <div className="admin-stat-value">{summary.todayHours}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Today's Harvesting Amount</div>
              <div className="admin-stat-value">₹{summary.todayHarvestAmount}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Today's Vaadi Cost</div>
              <div className="admin-stat-value warn">₹{summary.todayVaadiCost}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Today's Vaadi Revenue</div>
              <div className="admin-stat-value">₹{summary.todayVaadiRevenue}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Total Pending</div>
              <div className="admin-stat-value warn">₹{summary.totalPending}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">Farmers</div>
              <div className="admin-stat-value">{summary.farmerCount}</div>
            </div>
          </div>

          {topPendingFarmers.length > 0 && (
            <div className="admin-form" style={{ marginBottom: 20 }}>
              <div className="admin-page-title" style={{ fontSize: 16, marginBottom: 8 }}>Top Pending Payments</div>
              <div className="admin-list">
                {topPendingFarmers.map(({ farmer, pending }) => (
                  <div key={farmer.id} className="admin-card">
                    <div className="admin-card-body">
                      <div className="admin-card-title">{farmer.name} <span className="sub">({farmer.village})</span></div>
                      <div className="admin-card-meta">Pending: <strong style={{ color: '#c0392b' }}>₹{pending}</strong></div>
                    </div>
                    <div className="admin-card-actions">
                      <a href={`/admin/farmers/${farmer.id}`} className="btn btn-secondary btn-sm">View</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="admin-form">
            <div className="admin-page-title" style={{ fontSize: 16, marginBottom: 8 }}>Recent Harvesting Entries</div>
            <div className="admin-list">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="admin-card">
                  <div className="admin-card-body">
                    <div className="admin-card-title">
                      {entry.farmerName} <span className="sub">{entry.date} · {entry.startTime}–{entry.endTime}</span>
                    </div>
                    <div className="admin-card-meta">
                      {entry.hours}h × ₹{entry.ratePerHour} = ₹{entry.totalAmount}
                      {' · '}Pending <strong style={{ color: entry.pendingAmount > 0 ? '#c0392b' : '#2e5339' }}>₹{entry.pendingAmount}</strong>
                    </div>
                  </div>
                  <div className="admin-card-actions">
                    <a href={whatsAppEntryUrl(entry, harvestEntries)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm">
                      WhatsApp
                    </a>
                  </div>
                </div>
              ))}
              {recentEntries.length === 0 && <div className="admin-empty">No entries yet.</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
