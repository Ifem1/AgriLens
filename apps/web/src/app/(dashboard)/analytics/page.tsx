"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

      setData({
        totalValidations: total,
        avgConfidence: Math.round(avgConf),
        avgRisk: Math.round(avgRisk),
        outcomeBreakdown: breakdown,
      });
      setLoading(false);
    }

    fetch();
  }, [org]);

  return (
    <>
      <TopNav title="Risk Analytics" />
      <div className="p-6 space-y-6 max-w-4xl">
        <h2 className="text-lg font-semibold text-white">Risk Analytics</h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                    <ShieldCheck className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Total Results</p>
                    <p className="text-xl font-bold text-white">{data?.totalValidations}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Avg Confidence</p>
                    <p className="text-xl font-bold text-white">{data?.avgConfidence}%</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Avg Risk Score</p>
                    <p className="text-xl font-bold text-white">{data?.avgRisk}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Outcome breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-green-400" />
                  Outcome Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data?.outcomeBreakdown ?? {}).length === 0 ? (
                  <p className="text-sm text-zinc-500 py-4">No results yet</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(data!.outcomeBreakdown).map(([outcome, count]) => {
                      const pct = Math.round((count / data!.totalValidations) * 100);
                      const colorMap: Record<string, string> = {
                        approved: "bg-green-500", low_confidence: "bg-yellow-500",
                        escalated: "bg-orange-500", policy_blocked: "bg-red-500",
                        insufficient_evidence: "bg-zinc-500",
                      };
                      return (
                        <div key={outcome}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-zinc-300">{outcome.replace("_", " ")}</span>
                            <span className="text-zinc-500">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#1a2e1a] overflow-hidden">
                            <div className={`h-full rounded-full ${colorMap[outcome] ?? "bg-zinc-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
