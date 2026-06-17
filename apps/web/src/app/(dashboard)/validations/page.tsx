"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search } from "lucide-react";
import { formatRelative } from "@/lib/utils/format";
import type { ValidationRequest } from "@/types/database";

export default function ValidationsPage() {
  const { org } = useOrgStore();
  const [validations, setValidations] = useState<ValidationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!org) return;

    async function fetch() {
      const supabase = createClient();
      let query = supabase
        .from("validation_requests")
        .select("*")
        .eq("org_id", org!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data } = await query;
      setValidations(data ?? []);
      setLoading(false);
    }

    fetch();
  }, [org, filter]);

  const statusBadge = (status: string) => {
    const map: Record<string, "success" | "warning" | "danger" | "info" | "escalated"> = {
      approved: "success", pending: "info", validating: "info",
      failed: "danger", escalated: "escalated", regenerating: "warning",
    };
    return <Badge variant={map[status] ?? "neutral"}>{status}</Badge>;
  };

  const filters = ["all", "pending", "validating", "approved", "failed", "escalated"];

  return (
    <>
      <TopNav title="Validations" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: "var(--al-text)" }}>Validation History</h2>
          <Link href="/validations/new">
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" />
              New Validation
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setLoading(true); }}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: filter === f ? "rgba(80,80,129,0.2)" : "transparent",
                color: filter === f ? "var(--al-text)" : "var(--al-sec)",
                border: `1px solid ${filter === f ? "#505081" : "var(--al-border)"}`,
              }}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : validations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Search className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No validations found</p>
              <Link href="/validations/new">
                <Button variant="outline" size="sm" className="mt-4">
                  Submit your first validation
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {validations.map((v) => (
              <Link key={v.id} href={`/validations/${v.id}`}>
                <Card className="transition-colors cursor-pointer" style={{ borderColor: "var(--al-border)" }}>
                  <CardContent className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {v.farmer_notes?.slice(0, 80) || "No notes provided"}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-zinc-600">Stage: {v.crop_stage}</span>
                        <span className="text-xs text-zinc-700">{formatRelative(v.created_at)}</span>
                      </div>
                    </div>
                    {statusBadge(v.status)}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
