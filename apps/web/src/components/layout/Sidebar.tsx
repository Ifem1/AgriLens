"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/ui/Logo";
import {
  LayoutDashboard, ShieldCheck, Bot, FileText, ScrollText,
  BarChart3, AlertTriangle, Settings, Building2,
} from "lucide-react";

const nav = [
  { href: "/dashboard",   label: "Dashboard",     icon: LayoutDashboard },
  { href: "/validations", label: "Validations",   icon: ShieldCheck },
  { href: "/agents",      label: "Agents",        icon: Bot },
  { href: "/policies",    label: "Policies",      icon: FileText },
  { href: "/audit",       label: "Audit Trail",   icon: ScrollText },
  { href: "/analytics",   label: "Risk Analytics",icon: BarChart3 },
  { href: "/escalations", label: "Escalations",   icon: AlertTriangle },
];

const bottomNav = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin",    label: "Admin",    icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-60 flex flex-col"
      style={{
        background: "var(--al-card)",
        borderRight: "1px solid var(--al-border)",
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5"
        style={{ borderBottom: "1px solid var(--al-border)" }}
      >
        <Link href="/dashboard">
          <Logo size={30} />
        </Link>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
              )}
              style={{
                background: active ? "rgba(80,80,129,0.18)" : "transparent",
                color: active ? "var(--al-text)" : "var(--al-sec)",
                border: active ? "1px solid var(--al-border)" : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "var(--al-text)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(80,80,129,0.08)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "var(--al-sec)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div
        className="px-3 pb-4 pt-4 space-y-0.5"
        style={{ borderTop: "1px solid var(--al-border)" }}
      >
        {bottomNav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all"
              style={{
                background: active ? "rgba(80,80,129,0.18)" : "transparent",
                color: active ? "var(--al-text)" : "var(--al-sec)",
                border: active ? "1px solid var(--al-border)" : "1px solid transparent",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
