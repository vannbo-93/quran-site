export function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5">
      <span className="text-white/50">{label}</span>
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}
