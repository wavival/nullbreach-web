import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";

const MOBILE_MQ = "(max-width: 639px)";

export function Layout() {
  const { token } = useAuth();
  const isAuthenticated = !!token;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { pathname } = location;
  const fullWidth = pathname.startsWith("/chat");
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.focus();
  }, [pathname]);

  function handleToggleSidebar() {
    if (typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches) {
      setSidebarOpen((v) => !v);
    } else {
      setSidebarCollapsed((v) => !v);
    }
  }

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-md focus:py-sm focus:rounded"
      >
        Skip to main content
      </a>
      <Navbar
        onToggleSidebar={isAuthenticated ? handleToggleSidebar : undefined}
      />
      <div className="flex flex-1 min-h-0">
        {isAuthenticated && (
          <Sidebar
            open={sidebarOpen}
            collapsed={sidebarCollapsed}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        <main
          ref={mainRef}
          tabIndex={-1}
          id="main-content"
          className="flex-1 overflow-y-auto min-w-0 focus:outline-none"
        >
          {fullWidth ? (
            <Outlet />
          ) : (
            <div className="mx-auto max-w-[1200px] px-md md:px-lg lg:px-xl py-lg md:py-xl">
              <Outlet />
            </div>
          )}
        </main>
      </div>
      {/* Chat is a viewport-locked app-shell — no room for a footer. */}
      {!fullWidth && <Footer />}
    </div>
  );
}
