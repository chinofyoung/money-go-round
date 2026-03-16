export function DesktopOnly({ children }: { children: React.ReactNode }) {
  return <div className="hidden lg:block">{children}</div>;
}
