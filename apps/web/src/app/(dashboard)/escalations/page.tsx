"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { formatRelative } from "@/lib/utils/format";
import type { Escalation } from "@/types/database";

export default function EscalationsPage() {
  const { org } = useOrgStore();
  const [escalations, setEscalations] = useState<(Escalation & { validation_requests?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    if (!org) return;
    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("escalations")
        .select("*, validation_requests(farmer_notes, crop_stage)")
        .order("created_at", { ascending: false })
        .limit(50);
      setEscalations(data ?? []);
      setLoading(false);
    }
    fetch();
  }, [org]);

  async function handleResolve(escalationId: string) {
    setResolving(escalationId);
    const resolution = prompt("Enter resolution notes:");
    if (!resolution) { setResolving(null); return; }

    const supabase = createClient();
    const { error } = await supabase
      .from("escalations")
      .update({ resolution, resolved_at: new Date().toISOString() })
      .eq("id", escalationId);

    if (error) {
      toast.error(error.message);
    } else {
      setEscalations((prev) => prev.map((e) =>
        e.id === escalationId ? { ...e, resolution, resolved_at: new Date().toISOString() } : e
      ));
      toast.success("Escalation resolved");
    }
    setResolving(null);
  }

  return (
    <>
      <TopNav title="Escalations" />
      <div className="p-6 space-y-4 max-w-3xl">
        <h2 className="text-lg font-semibold" style={{ color: "var(--al-text)" }}>Human Escalations</h2>
        <p className="text-sm" style={{ color: "var(--al-sec)" }}>Low-confidence validations that need human review</p>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : escalations.length === 0 ? (
          <div className="rounded-xl py-16 text-center" style={{ background: "var(--al-card)", border: "1px solid var(--al-border)" }}>
            <CheckCircle className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--al-muted)" }} />
            <p className="text-sm" style={{ color: "var(--al-sec)" }}>No pending escalations</p>
          </div>
        ) : (
          <div className="space-y-2">
            {escalations.map((e) => (
              <div
                key={e.id}
                className="rounded-xl p-4"
                style={{
                  background: "var(--al-card)",
                  border: `1px solid ${e.resolved_at ? "var(--al-border)" : "#505081"}`,
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5" style={{ color: "#fb923c" }} />
                      <Badge variant={e.resolved_at ? "success" : "escalated"}>
                        {e.resolved_at ? "Resolved" : "Pending"}
                      </Badge>
                    </div>
                    <p className="text-sm" style={{ color: "var(--al-text)" }}>{e.reason || "Low consensus confidence"}</p>
                    {e.validation_requests?.farmer_notes && (
                      <p className="text-xs mt-1" style={{ color: "var(--al-sec)" }}>{e.validation_requests.farmer_notes.slice(0, 80)}</p>
                    )}
                    {e.resolution && (
                      <p className="text-xs mt-2" style={{ color: "#8686AC" }}>Resolution: {e.resolution}</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: "var(--al-muted)" }}>{formatRelative(e.created_at)}</p>
                  </div>
                  {!e.resolved_at && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolve(e.id)}
                      loading={resolving === e.id}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
