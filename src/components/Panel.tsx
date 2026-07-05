export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`panel px-7 py-6 sm:px-8 ${className}`}>{children}</div>
  );
}
