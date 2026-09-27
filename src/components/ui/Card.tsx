export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-navy-700 bg-navy-900/60 p-4 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}
