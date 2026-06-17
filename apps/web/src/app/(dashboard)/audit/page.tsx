"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils/format";
import { ScrollText } from "lucide-react";
import type { AuditEvent } from "@/types/database";

export default function AuditPage() {
  const { org } = useOrgStore();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("audit_events")
        .select("*")
        .eq("org_id", org!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setEvents(data ?? []);
      setLoading(false);
    }
    fetch();
  }, [org]);

  const actionColor = (action: string) => {
    if (action.includes("approved")) return "success";
    if (action.includes("escalated")) return "escalated";
    if (action.includes("failed")) return "danger";
    if (action.includes("created")) return "info";
    return "neutral";
  };

  return (
    <>
      <TopNav title="Audit Trail" />
      <div className="p-6 space-y-4 max-w-4xl">
        <h2 className="text-lg font-semibold text-white">Audit Trail</h2>
        <p className="text-sm text-zinc-500 mb-4">Complete history of all actions within your organization</p>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ScrollText className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No audit events yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {events.map((ev) => (
              <div key={ev.id} className="flex items-center gap-4 rounded-lg border border-[#1a2e1a] px-4 py-3 bg-[#0f1a0f]">
                <div className="h-2 w-2 rounded-full bg-green-500/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={actionColor(ev.action) as any}>{ev.action}</Badge>
                    <span className="text-xs text-zinc-600">{ev.entity_type}</span>
                  </div>
                </div>
                <span className="text-xs text-zinc-600 shrink-0">{formatDateTime(ev.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
