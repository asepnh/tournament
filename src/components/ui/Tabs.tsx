"use client";

export function Tabs({
  tabs,
  active,
  onChange,
  size = "md",
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  size?: "md" | "sm";
}) {
  const padding = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-navy-900 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-md font-semibold transition-colors ${padding} ${
            active === tab.id
              ? "bg-accent-500 text-navy-950"
              : "text-navy-300 hover:bg-navy-800 hover:text-navy-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
