export default function Header({ subtitle }) {
  return (
    <div className="flex items-center justify-between pb-2">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-cyan mb-1">
          REPX
        </p>
        <h1 className="text-2xl font-bold text-text-primary">Sensor Training</h1>
        {subtitle ? (
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-[#0f0f0f] text-accent font-semibold">
        RX
      </div>
    </div>
  );
}
