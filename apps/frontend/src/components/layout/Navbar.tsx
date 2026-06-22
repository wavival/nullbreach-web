import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, ShieldHalf, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, token, logout } = useAuth();
  const isAuthenticated = !!token;
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  const displayName = user?.name?.trim() || user?.email || "Account";

  return (
    <header className="sticky top-0 z-50 h-14 md:h-navbar w-full border-b border-border bg-surface">
      <div className="h-full flex items-center justify-between px-md md:px-lg lg:px-xl gap-md md:gap-lg">
        <div className="flex items-center gap-md">
          {isAuthenticated && onToggleSidebar && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
              className="[&_svg]:size-6"
            >
              <Menu />
            </Button>
          )}
          <Link
            to={isAuthenticated ? "/" : "/login"}
            className="flex items-center gap-sm font-headline text-h4"
          >
            <ShieldHalf className="text-primary size-6" />
            <span className="text-primary">NullBreach</span>
          </Link>
        </div>

        <div className="flex items-center gap-md">
          {isAuthenticated ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className={cn(
                  "flex items-center gap-sm rounded pl-xs pr-md py-xs",
                  "text-body text-foreground",
                  "hover:bg-surface-alt transition-colors duration-hover ease-hover",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                )}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <UserBadge />
                <span className="hidden md:inline-flex items-baseline gap-xs max-w-[260px] truncate">
                  <span className="text-foreground-muted text-body-sm">
                    Signed as:
                  </span>
                  <span className="truncate text-foreground">
                    {displayName}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-foreground-muted transition-transform duration-hover",
                    menuOpen && "rotate-180",
                  )}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className={cn(
                    "absolute right-0 mt-sm w-64 z-50",
                    "rounded border border-border bg-surface-alt shadow-medium",
                    "py-xs animate-fade-in",
                  )}
                >
                  <div className="flex items-center gap-sm px-md py-sm border-b border-border">
                    <UserBadge />
                    <div className="min-w-0">
                      <p className="text-body-sm text-foreground-muted">
                        Signed as
                      </p>
                      <p className="text-body text-foreground truncate">
                        {displayName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className={cn(
                      "w-full flex items-center gap-sm px-md py-sm text-body text-left text-error",
                      "transition-colors duration-hover ease-hover",
                      "hover:bg-surface focus-visible:outline-none focus-visible:bg-surface",
                    )}
                  >
                    <LogOut className="size-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button variant="primary" size="sm" asChild>
              <Link to="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

/* Same lucide `User` glyph the chat message bubbles use, for visual
   consistency between the account menu and the chat avatars. */
function UserBadge() {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
        "bg-primary/15 border border-primary/40 text-primary",
      )}
      aria-hidden="true"
    >
      <UserIcon className="size-4" />
    </span>
  );
}
