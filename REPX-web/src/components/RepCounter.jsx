export default function RepCounter({ count }) {
  return (
    <div className="card p-6 text-center space-y-2">
      <p className="text-xs uppercase tracking-wide text-text-secondary">
        Rep Counter
      </p>
      <p className="text-5xl font-black text-accent leading-tight">{count}</p>
    </div>
  );
}
