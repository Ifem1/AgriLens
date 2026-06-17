"use client";

import { TopNav } from "@/components/layout/TopNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useOrgStore } from "@/stores/orgStore";
import { Settings, Wallet, Building2 } from "lucide-react";
import Link from "next/link";

const cardStyle = {
  background: "var(--al-card)",
  border: "1px solid var(--al-border)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
};

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { org, membership } = useOrgStore();

  return (
    <>
      <TopNav title="Settings" />
      <div className="p-6 space-y-6 max-w-2xl">
        <h2 className="text-lg font-semibold" style={{ color: "var(--al-text)" }}>Account Settings</h2>

        <div style={cardStyle}>
          <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--al-text)" }}>
            <Settings className="h-4 w-4" style={{ color: "#8686AC" }} />
            Profile
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--al-sec)" }}>Email</span>
              <span className="text-sm" style={{ color: "var(--al-text)" }}>{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--al-sec)" }}>Role</span>
              <Badge variant="info">{membership?.role ?? "—"}</Badge>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--al-text)" }}>
            <Building2 className="h-4 w-4" style={{ color: "#8686AC" }} />
            Organization
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--al-sec)" }}>Name</span>
              <span className="text-sm" style={{ color: "var(--al-text)" }}>{org?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--al-sec)" }}>Plan</span>
              <Badge variant="success">{org?.plan_tier ?? "—"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--al-sec)" }}>Region</span>
              <span className="text-sm" style={{ color: "var(--al-text)" }}>{org?.region ?? "Not set"}</span>
            </div>
          </div>
        </div>

        <div style={cardStyle}>
          <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--al-text)" }}>
            <Wallet className="h-4 w-4" style={{ color: "#8686AC" }} />
            Blockchain Wallet
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--al-sec)" }}>
            Your wallet was automatically generated when you created your account.
            It is used to sign Genlayer transactions.
          </p>
          <Link href="/settings/wallet">
            <Button variant="secondary" size="sm">Manage Wallet</Button>
          </Link>
        </div>
      </div>
    </>
  );
}
