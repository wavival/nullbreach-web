import { NavLink, useNavigate } from "react-router-dom";
import { Code, Home, LogOut, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/analyzer", label: "Analyzer", icon: Code },
];

export function Sidebar({ open, collapsed, onClose }: SidebarProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 767px)");
  // Hide from AT only when the mobile drawer is closed. On desktop the
  // sidebar is always visible (static), so it must remain in the a11y tree.
  const ariaHidden = isMobile ? !open : false;

  function handleLogout() {
    onClose();
    logout();
    navigate("/login", { replace: true });
  }

  const baseItem =
    "flex items-center gap-md rounded text-body font-medium transition-colors duration-hover ease-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-alt";

  const itemPadding = collapsed
    ? "justify-center px-0 py-sm"
    : "justify-start px-md py-sm";

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-black/50 md:hidden animate-fade-in"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "z-40 bg-surface-alt border-r border-border",
          "shrink-0 flex flex-col",
          "fixed inset-y-0 left-0",
          "transition-[transform,width] duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          "md:static md:translate-x-0 md:flex",
          collapsed ? "w-20" : "w-sidebar md:w-[200px] lg:w-sidebar",
        )}
        aria-hidden={ariaHidden}
      >
        <div className="flex items-center justify-between px-md h-14 border-b border-border md:hidden">
          <span className="font-headline text-h4">Menu</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </Button>
        </div>

        <nav
          className={cn(
            "flex-1 flex flex-col gap-md py-lg",
            collapsed ? "px-sm" : "px-lg",
          )}
        >
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              title={collapsed ? label : undefined}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  baseItem,
                  itemPadding,
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-surface",
                )
              }
            >
              <Icon className="size-6 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div
          className={cn(
            "border-t border-border py-lg",
            collapsed ? "px-sm" : "px-lg",
          )}
        >
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            aria-label="Logout"
            className={cn(
              baseItem,
              itemPadding,
              "w-full text-error hover:bg-surface",
            )}
          >
            <LogOut className="size-6 shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
