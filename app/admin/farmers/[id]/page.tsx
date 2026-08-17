'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFarmers, useHarvestEntries, whatsAppEntryUrl } from '@/lib/harvest';
import SkeletonList from '@/components/SkeletonList';
import { useLanguage } from '@/lib/i18n';
import '../../admin.css';

export default function FarmerDetail() {
  const { t } = useLanguage();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { farmers, loading: farmersLoading } = useFarmers();
  const { entries, loading: entriesLoading } = useHarvestEntries();

  const farmer = farmers.find((f) => f.id === params.id);

  const farmerEntries = useMemo(
    () => entries.filter((e) => e.farmerId === params.id).sort((a, b) => b.date.localeCompare(a.date)),
    [entries, params.id]
  );

  const summary = useMemo(() => {
    return {
      entryCount: farmerEntries.length,
      totalHours: Math.round(farmerEntries.reduce((s, e) => s + e.hours, 0) * 100) / 100,
      totalAmount: Math.round(farmerEntries.reduce((s, e) => s + e.totalAmount, 0) * 100) / 100,
      totalPaid: Math.round(farmerEntries.reduce((s, e) => s + e.paidAmount + e.advanceAmount, 0) * 100) / 100,
      totalPending: Math.round(farmerEntries.reduce((s, e) => s + e.pendingAmount, 0) * 100) / 100,
    };
  }, [farmerEntries]);

  const loading = farmersLoading || entriesLoading;

  if (!loading && !farmer) {
    return (
      <div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.push('/admin/farmers')} style={{ marginBottom: 16 }}>
          {t('farmerDetail.backToFarmers')}
        </button>
        <div className="admin-empty">{t('farmerDetail.notFound')}</div>
      </div>
    );
  }

  return (
    <div>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.push('/admin/farmers')} style={{ marginBottom: 16 }}>
        {t('farmerDetail.backToFarmers')}
      </button>

      {loading ? (
        <SkeletonList rows={1} />
      ) : (
        <>
          <h1 className="admin-page-title">{farmer!.name}</h1>
          <div className="admin-card-meta" style={{ marginBottom: 16 }}>
            {farmer!.village} · {farmer!.mobile}{farmer!.farmDetails ? ` — ${farmer!.farmDetails}` : ''}
          </div>

          <div className="admin-stats">
            <div className="admin-stat-card">
              <div className="admin-stat-label">{t('farmerDetail.stat.entries')}</div>
              <div className="admin-stat-value">{summary.entryCount}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">{t('farmerDetail.stat.totalHours')}</div>
              <div className="admin-stat-value">{summary.totalHours}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">{t('farmerDetail.stat.totalAmount')}</div>
              <div className="admin-stat-value">₹{summary.totalAmount}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">{t('farmerDetail.stat.paid')}</div>
              <div className="admin-stat-value">₹{summary.totalPaid}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-label">{t('farmerDetail.stat.pending')}</div>
              <div className="admin-stat-value warn">₹{summary.totalPending}</div>
            </div>
          </div>

          <div className="admin-list">
            {farmerEntries.map((entry) => (
              <div key={entry.id} className="admin-card">
                <div className="admin-card-body">
                  <div className="admin-card-title">
                    {entry.date} <span className="sub">{entry.startTime}–{entry.endTime}</span>
                  </div>
                  <div className="admin-card-meta">
                    {entry.hours}h × ₹{entry.ratePerHour} = ₹{entry.totalAmount}
                    {' · '}{t('farmerDetail.advance')} ₹{entry.advanceAmount} · {t('farmerDetail.paid')} ₹{entry.paidAmount} · {t('farmerDetail.pendingLabel')}{' '}
                    <strong style={{ color: entry.pendingAmount > 0 ? '#c0392b' : '#2e5339' }}>₹{entry.pendingAmount}</strong>
                  </div>
                  {entry.note && <div className="admin-card-meta">{entry.note}</div>}
                </div>
                <div className="admin-card-actions">
                  <a href={whatsAppEntryUrl(entry, entries)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm">
                    {t('farmerDetail.whatsapp')}
                  </a>
                </div>
              </div>
            ))}
            {farmerEntries.length === 0 && <div className="admin-empty">{t('farmerDetail.noEntries')}</div>}
          </div>
        </>
      )}
    </div>
  );
}
