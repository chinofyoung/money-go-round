"use client";

import { MobileContainer } from "./MobileContainer";
import { Sidebar } from "./Sidebar";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  /** Desktop content — if provided, rendered instead of children on desktop */
  desktopContent?: React.ReactNode;
  /** Whether to show the sidebar on desktop (false for signed-out pages) */
  showSidebar?: boolean;
}

export function ResponsiveLayout({
  children,
  desktopContent,
  showSidebar = true,
}: ResponsiveLayoutProps) {
  return (
    <>
      {/* Mobile shell — hidden on lg+ */}
      <div className="lg:hidden">
        <MobileContainer>{children}</MobileContainer>
      </div>

      {/* Desktop shell — hidden below lg */}
      <div className="hidden lg:flex h-screen bg-black">
        {showSidebar && <Sidebar />}
        <main className="flex-1 overflow-y-auto">
          {desktopContent ?? children}
        </main>
      </div>
    </>
  );
}
