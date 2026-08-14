'use client';

import { useMemo, useState } from 'react';
import { whatsAppStatementUrl } from '@/lib/harvest';
import type { Farmer, HarvestEntry } from '@/lib/types';

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function monthLabel(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function MonthlyStatement({ farmers, entries }: { farmers: Farmer[]; entries: HarvestEntry[] }) {
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
      <div className="admin-page-title" style={{ fontSize: 16, marginBottom: 4 }}>Monthly Statement</div>
      <div className="admin-form-row">
        <select value={farmerId} onChange={(e) => setFarmerId(e.target.value)}>
          <option value="">Select Farmer</option>
          {farmers.map((f) => (
            <option key={f.id} value={f.id}>{f.name} ({f.village})</option>
          ))}
        </select>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {farmer && (
        <>
          <div className="admin-form-summary">
            <span>Entries: <strong>{stats.entryCount}</strong></span>
            <span>Hours: <strong>{stats.totalHours}</strong></span>
            <span>Total: <strong>₹{stats.totalAmount}</strong></span>
            <span>Paid: <strong>₹{stats.totalPaid}</strong></span>
            <span className={stats.totalPending > 0 ? 'pending-due' : 'pending-ok'}>Pending: <strong>₹{stats.totalPending}</strong></span>
          </div>

          {stats.entryCount === 0 ? (
            <div className="admin-empty">No entries for {farmer.name} in {monthLabel(month)}.</div>
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
              Send Monthly Statement on WhatsApp
            </a>
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
              🖨️ Print Statement
            </button>
          </div>

          <div id={printId} className="admin-print-only">
            <h2>Vrundavan Farm — Harvesting Statement</h2>
            <p>Farmer: <strong>{farmer.name}</strong> ({farmer.village})</p>
            <p>Month: <strong>{monthLabel(month)}</strong></p>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Hours</th>
                  <th>Rate</th>
                  <th>Amount</th>
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
              Total Entries: {stats.entryCount} &nbsp;|&nbsp;
              Total Hours: {stats.totalHours} &nbsp;|&nbsp;
              Total Amount: ₹{stats.totalAmount} &nbsp;|&nbsp;
              Paid: ₹{stats.totalPaid} &nbsp;|&nbsp;
              Pending: ₹{stats.totalPending}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
