const tabs = [
  { key: "home", label: "Home" },
  { key: "live", label: "Live" },
  { key: "history", label: "History" },
  { key: "settings", label: "Settings" },
];

export default function BottomTabs({ active, onChange }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0b0b0b]/95 border-t border-border backdrop-blur-md">
      <div className="grid grid-cols-4 py-2">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`text-sm font-medium flex flex-col items-center gap-1 transition-colors ${
                isActive ? "text-accent" : "text-text-secondary"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full border border-border" />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
