'use client';

import { useMemo, useState } from 'react';
import { whatsAppStatementUrl } from '@/lib/harvest';
import type { Farmer, HarvestEntry } from '@/lib/types';
import { useLanguage } from '@/lib/i18n';

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function monthLabel(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function MonthlyStatement({ farmers, entries }: { farmers: Farmer[]; entries: HarvestEntry[] }) {
  const { t } = useLanguage();
  const [farmerId, setFarmerId] = useState('');
  const [month, setMonth] = useState(currentMonthStr());
  const printId = 'monthly-statement-print';

  const farmer = farmers.find((f) => f.id === farmerId);

  const monthEntries = useMemo(
    () => entries.filter((e) => e.farmerId === farmerId && e.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)),
    [entries, farmerId, month]
  );

  const stats = useMemo(
    () => ({
      entryCount: monthEntries.length,
      totalHours: Math.round(monthEntries.reduce((s, e) => s + e.hours, 0) * 100) / 100,
      totalAmount: Math.round(monthEntries.reduce((s, e) => s + e.totalAmount, 0) * 100) / 100,
      totalPaid: Math.round(monthEntries.reduce((s, e) => s + e.paidAmount + e.advanceAmount, 0) * 100) / 100,
      totalPending: Math.round(monthEntries.reduce((s, e) => s + e.pendingAmount, 0) * 100) / 100,
    }),
    [monthEntries]
  );

  return (
    <div className="admin-form" style={{ marginBottom: 20 }}>
      <div className="admin-page-title" style={{ fontSize: 16, marginBottom: 4 }}>{t('monthlyStatement.title')}</div>
      <div className="admin-form-row">
        <select value={farmerId} onChange={(e) => setFarmerId(e.target.value)}>
          <option value="">{t('monthlyStatement.selectFarmer')}</option>
          {farmers.map((f) => (
            <option key={f.id} value={f.id}>{f.name} ({f.village})</option>
          ))}
        </select>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {farmer && (
        <>
          <div className="admin-form-summary">
            <span>{t('monthlyStatement.entries')} <strong>{stats.entryCount}</strong></span>
            <span>{t('monthlyStatement.hours')} <strong>{stats.totalHours}</strong></span>
            <span>{t('monthlyStatement.total')} <strong>₹{stats.totalAmount}</strong></span>
            <span>{t('monthlyStatement.paid')} <strong>₹{stats.totalPaid}</strong></span>
            <span className={stats.totalPending > 0 ? 'pending-due' : 'pending-ok'}>{t('monthlyStatement.pending')} <strong>₹{stats.totalPending}</strong></span>
          </div>

          {stats.entryCount === 0 ? (
            <div className="admin-empty">
              {t('monthlyStatement.noEntries').replace('{name}', farmer.name).replace('{month}', monthLabel(month))}
            </div>
          ) : (
            <div className="admin-list">
              {monthEntries.map((entry) => (
                <div key={entry.id} className="admin-card">
                  <div className="admin-card-body">
                    <div className="admin-card-title">
                      {entry.date} <span className="sub">{entry.startTime}–{entry.endTime}</span>
                    </div>
                    <div className="admin-card-meta">
                      {entry.hours}h × ₹{entry.ratePerHour} = ₹{entry.totalAmount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="admin-form-actions">
            <a
              href={whatsAppStatementUrl(farmer, monthLabel(month), stats)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
            >
              {t('monthlyStatement.sendWhatsApp')}
            </a>
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
              🖨️ {t('monthlyStatement.printStatement')}
            </button>
          </div>

          <div id={printId} className="admin-print-only">
            <h2>{t('monthlyStatement.print.heading')}</h2>
            <p>{t('monthlyStatement.print.farmer')} <strong>{farmer.name}</strong> ({farmer.village})</p>
            <p>{t('monthlyStatement.print.month')} <strong>{monthLabel(month)}</strong></p>
            <table>
              <thead>
                <tr>
                  <th>{t('monthlyStatement.print.date')}</th>
                  <th>{t('monthlyStatement.print.time')}</th>
                  <th>{t('monthlyStatement.print.hours')}</th>
                  <th>{t('monthlyStatement.print.rate')}</th>
                  <th>{t('monthlyStatement.print.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {monthEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>{entry.startTime}–{entry.endTime}</td>
                    <td>{entry.hours}</td>
                    <td>₹{entry.ratePerHour}</td>
                    <td>₹{entry.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 16 }}>
              {t('monthlyStatement.print.totalEntries')} {stats.entryCount} &nbsp;|&nbsp;
              {t('monthlyStatement.print.totalHours')} {stats.totalHours} &nbsp;|&nbsp;
              {t('monthlyStatement.print.totalAmount')} ₹{stats.totalAmount} &nbsp;|&nbsp;
              {t('monthlyStatement.paid')} ₹{stats.totalPaid} &nbsp;|&nbsp;
              {t('monthlyStatement.pending')} ₹{stats.totalPending}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
