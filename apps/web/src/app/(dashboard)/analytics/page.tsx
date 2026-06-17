"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";

interface AnalyticsData {
  totalValidations: number;
  avgConfidence: number;
  avgRisk: number;
  outcomeBreakdown: Record<string, number>;
}

export default function AnalyticsPage() {
  const { org } = useOrgStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;

    async function fetch() {
      const supabase = createClient();

      const { data: results } = await supabase
        .from("validation_results")
        .select("confidence_score, risk_score, consensus_outcome");

      const total = results?.length ?? 0;
      const avgConf = total > 0 ? results!.reduce((s, r) => s + (r.confidence_score ?? 0), 0) / total : 0;
      const avgRisk = total > 0 ? results!.reduce((s, r) => s + (r.risk_score ?? 0), 0) / total : 0;

      const breakdown: Record<string, number> = {};
      results?.forEach((r) => {
        breakdown[r.consensus_outcome] = (breakdown[r.consensus_outcome] ?? 0) + 1;
      });

      setData({ totalValidations: total, avgConfidence: Math.round(avgConf), avgRisk: Math.round(avgRisk), outcomeBreakdown: breakdown });
      setLoading(false);
    }

    fetch();
  }, [org]);

  const statCards = [
    { label: "Total Results", value: data?.totalValidations, icon: ShieldCheck, color: "#8686AC" },
    { label: "Avg Confidence", value: `${data?.avgConfidence ?? 0}%`, icon: TrendingUp, color: "#60a5fa" },
    { label: "Avg Risk Score", value: `${data?.avgRisk ?? 0}%`, icon: AlertTriangle, color: "#fb923c" },
  ];

  return (
    <>
      <TopNav title="Risk Analytics" />
      <div className="p-6 space-y-6 max-w-4xl">
        <h2 className="text-lg font-semibold" style={{ color: "var(--al-text)" }}>Risk Analytics</h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {statCards.map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="rounded-xl p-4 flex items-center gap-4"
                  style={{ background: "var(--al-card)", border: "1px solid var(--al-border)" }}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "rgba(80,80,129,0.15)" }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--al-sec)" }}>{label}</p>
                    <p className="text-xl font-bold" style={{ color: "var(--al-text)" }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-5" style={{ background: "var(--al-card)", border: "1px solid var(--al-border)" }}>
              <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--al-text)" }}>
                <BarChart3 className="h-4 w-4" style={{ color: "#8686AC" }} />
                Outcome Breakdown
              </p>
              {Object.keys(data?.outcomeBreakdown ?? {}).length === 0 ? (
                <p className="text-sm py-4" style={{ color: "var(--al-sec)" }}>No results yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data!.outcomeBreakdown).map(([outcome, count]) => {
                    const pct = Math.round((count / data!.totalValidations) * 100);
                    const colorMap: Record<string, string> = {
                      approved: "#4ade80", low_confidence: "#facc15",
                      escalated: "#fb923c", policy_blocked: "#f87171",
                      insufficient_evidence: "#8686AC",
                    };
                    return (
                      <div key={outcome}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span style={{ color: "var(--al-text)" }}>{outcome.replace(/_/g, " ")}</span>
                          <span style={{ color: "var(--al-sec)" }}>{count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--al-border)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: colorMap[outcome] ?? "#8686AC" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
