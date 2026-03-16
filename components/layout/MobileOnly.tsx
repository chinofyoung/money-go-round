export function MobileOnly({ children }: { children: React.ReactNode }) {
  return <div className="lg:hidden">{children}</div>;
}
