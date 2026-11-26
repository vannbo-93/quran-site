export function ToolButton({
  children,
  onClick,
  active = false,
  disabled = false,
  label,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={label ? undefined : active}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 font-arabic transition duration-300 disabled:opacity-30 ${
        active ? "bg-white/15 text-white" : "text-white/50 hover:text-accent enabled:hover:bg-white/5"
      } ${className}`}
    >
      {children}
    </button>
  );
}
