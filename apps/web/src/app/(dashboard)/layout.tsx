"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useOrgStore } from "@/stores/orgStore";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();
  const { setOrg, setMembership } = useOrgStore();

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: membership } = await supabase
          .from("org_members")
          .select("*, organizations(*)")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (membership) {
          setMembership(membership);
          setOrg(membership.organizations as any);
        }
      }

      setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading, setOrg, setMembership]);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--al-bg)" }}>
      <Sidebar />
      <main className="ml-60 flex-1 pt-14">
        {children}
      </main>
    </div>
  );
}
