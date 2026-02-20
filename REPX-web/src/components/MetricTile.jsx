export default function MetricTile({ label, value, unit }) {
  return (
    <div className="card p-4 space-y-2">
      <p className="text-xs uppercase tracking-wide text-text-secondary">
        {label}
      </p>
      <div className="flex items-end gap-1">
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        {unit ? (
          <span className="text-sm text-text-secondary mb-1">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}
