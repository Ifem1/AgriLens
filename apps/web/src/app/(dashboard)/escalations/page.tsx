"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardContent } from "@/components/ui/card";
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
        <h2 className="text-lg font-semibold text-white">Human Escalations</h2>
        <p className="text-sm text-zinc-500">Low-confidence validations that need human review</p>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : escalations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle className="h-10 w-10 text-green-500/50 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No pending escalations</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {escalations.map((e) => (
              <Card key={e.id} className={e.resolved_at ? "" : "border-orange-500/20"}>
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                        <Badge variant={e.resolved_at ? "success" : "escalated"}>
                          {e.resolved_at ? "Resolved" : "Pending"}
                        </Badge>
                      </div>
                      <p className="text-sm text-white">{e.reason || "Low consensus confidence"}</p>
                      {e.validation_requests?.farmer_notes && (
                        <p className="text-xs text-zinc-500 mt-1">{e.validation_requests.farmer_notes.slice(0, 80)}</p>
                      )}
                      {e.resolution && (
                        <p className="text-xs text-green-400/70 mt-2">Resolution: {e.resolution}</p>
                      )}
                      <p className="text-xs text-zinc-700 mt-1">{formatRelative(e.created_at)}</p>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
