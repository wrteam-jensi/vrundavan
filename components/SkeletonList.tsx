export default function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="admin-skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="admin-skeleton-card">
          <div className="admin-skeleton-block" style={{ width: 44, height: 44 }} />
          <div style={{ flex: 1, display: 'grid', gap: 6 }}>
            <div className="admin-skeleton-block" style={{ width: '40%', height: 14 }} />
            <div className="admin-skeleton-block" style={{ width: '70%', height: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
