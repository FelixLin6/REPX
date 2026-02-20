export default function Card({ title, children, actions, className = "" }) {
  return (
    <div className={`card p-4 space-y-3 ${className}`}>
      {title ? (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {actions}
        </div>
      ) : null}
      {children}
    </div>
  );
}
