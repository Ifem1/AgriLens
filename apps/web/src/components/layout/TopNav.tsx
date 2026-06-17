"use client";

import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useOrgStore } from "@/stores/orgStore";

export function TopNav({ title }: { title: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { org } = useOrgStore();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <header
      className="fixed top-0 left-60 right-0 h-14 z-10 flex items-center justify-between px-6 backdrop-blur-sm"
      style={{
        background: "rgba(var(--al-card-rgb, 26,25,86), 0.85)",
        borderBottom: "1px solid var(--al-border)",
        backgroundColor: "var(--al-card)",
        opacity: 0.95,
      }}
    >
      <div>
        <h1 className="text-sm font-semibold" style={{ color: "var(--al-text)" }}>{title}</h1>
        {org && <p className="text-xs" style={{ color: "var(--al-sec)" }}>{org.name}</p>}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--al-sec)" }}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div className="h-6 w-px" style={{ background: "var(--al-border)" }} />

        <div className="flex items-center gap-2">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium"
            style={{
              background: "rgba(80,80,129,0.2)",
              border: "1px solid var(--al-border)",
              color: "var(--al-text)",
            }}
          >
            {initials}
          </div>
          <span className="text-xs hidden sm:block" style={{ color: "var(--al-sec)" }}>
            {user?.email}
          </span>
        </div>

        <Button variant="ghost" size="sm" onClick={handleLogout} style={{ color: "var(--al-sec)" }}>
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </header>
  );
}
