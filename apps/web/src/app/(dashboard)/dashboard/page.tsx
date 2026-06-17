"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import {
  ShieldCheck, AlertTriangle, TrendingUp, Activity, Plus, ArrowRight,
} from "lucide-react";

interface Stats {
  totalValidations: number;
  approved: number;
  escalated: number;
  avgConfidence: number;
}

export default function DashboardPage() {
  const { org } = useOrgStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentValidations, setRecentValidations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;

    async function fetchData() {
      const supabase = createClient();

      const { data: requests } = await supabase
        .from("validation_requests")
        .select("id, status, created_at, crop_stage, farmer_notes")
        .eq("org_id", org!.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const { count: total } = await supabase
        .from("validation_requests")
        .select("*", { count: "exact", head: true })
        .eq("org_id", org!.id);

      const { count: approvedCount } = await supabase
        .from("validation_requests")
        .select("*", { count: "exact", head: true })
        .eq("org_id", org!.id)
        .eq("status", "approved");

      const { count: escalatedCount } = await supabase
        .from("validation_requests")
        .select("*", { count: "exact", head: true })
        .eq("org_id", org!.id)
        .eq("status", "escalated");

      const { data: results } = await supabase
        .from("validation_results")
        .select("confidence_score, request_id")
        .limit(100);

      const avgConf = results?.length
        ? results.reduce((sum, r) => sum + (r.confidence_score ?? 0), 0) / results.length
        : 0;

      setStats({
        totalValidations: total ?? 0,
        approved: approvedCount ?? 0,
        escalated: escalatedCount ?? 0,
        avgConfidence: Math.round(avgConf),
      });

      setRecentValidations(requests ?? []);
      setLoading(false);
    }

    fetchData();
  }, [org]);

  const statCards = [
    { label: "Total Validations", value: stats?.totalValidations ?? 0, icon: ShieldCheck, color: "text-green-400" },
    { label: "Approved", value: stats?.approved ?? 0, icon: TrendingUp, color: "text-blue-400" },
    { label: "Escalated", value: stats?.escalated ?? 0, icon: AlertTriangle, color: "text-orange-400" },
    { label: "Avg Confidence", value: `${stats?.avgConfidence ?? 0}%`, icon: Activity, color: "text-purple-400" },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, "success" | "warning" | "danger" | "info" | "escalated"> = {
      approved: "success",
      pending: "info",
      validating: "info",
      failed: "danger",
      escalated: "escalated",
    };
    return <Badge variant={map[status] ?? "neutral"}>{status}</Badge>;
  };

  return (
    <>
      <TopNav title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Quick action */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Overview</h2>
            <p className="text-sm text-zinc-500">Your organization's validation activity</p>
          </div>
          <Link href="/validations/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              New Validation
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">{label}</p>
                  {loading ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-xl font-bold text-white">{value}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Subscription usage */}
        {org && (
          <Card>
            <CardHeader>
              <CardTitle>Plan Usage</CardTitle>
              <Badge variant="success">{org.plan_tier}</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-zinc-400">Validations this period</span>
                <span className="text-white">{stats?.totalValidations ?? 0} / 20</span>
              </div>
              <Progress value={((stats?.totalValidations ?? 0) / 20) * 100} />
            </CardContent>
          </Card>
        )}

        {/* Recent validations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Validations</CardTitle>
            <Link href="/validations">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentValidations.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-zinc-500">No validations yet</p>
                <Link href="/validations/new">
                  <Button variant="outline" size="sm" className="mt-3">
                    Submit your first
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentValidations.map((v) => (
                  <Link
                    key={v.id}
                    href={`/validations/${v.id}`}
                    className="flex items-center justify-between rounded-lg border border-[#1a2e1a] px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div>
                      <p className="text-sm text-white">{v.farmer_notes?.slice(0, 60) || "No notes"}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">Stage: {v.crop_stage}</p>
                    </div>
                    {statusBadge(v.status)}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
