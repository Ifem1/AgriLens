"use client";

import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import { useOrgStore } from "@/stores/orgStore";
import { Settings, Wallet, Building2 } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { org, membership } = useOrgStore();

  return (
    <>
      <TopNav title="Settings" />
      <div className="p-6 space-y-6 max-w-2xl">
        <h2 className="text-lg font-semibold text-white">Account Settings</h2>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-green-400" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Email</span>
              <span className="text-sm text-white">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Role</span>
              <Badge variant="info">{membership?.role ?? "—"}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Organization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-green-400" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Name</span>
              <span className="text-sm text-white">{org?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Plan</span>
              <Badge variant="success">{org?.plan_tier ?? "—"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Region</span>
              <span className="text-sm text-white">{org?.region ?? "Not set"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-400" />
              Blockchain Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500 mb-4">
              Your wallet was automatically generated when you created your account.
              It is used to sign Genlayer transactions.
            </p>
            <Link href="/settings/wallet">
              <Button variant="secondary" size="sm">Manage Wallet</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
