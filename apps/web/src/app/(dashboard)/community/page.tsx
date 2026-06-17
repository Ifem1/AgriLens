"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopNav } from "@/components/layout/TopNav";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelative, formatPercent } from "@/lib/utils/format";
import { Search, Globe, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

interface PublicEntry {
  id: string;
  farmer_notes: string | null;
  crop_stage: string;
  created_at: string;
  status: string;
  weather_snapshot: any;
  result?: {
    recommended_treatment: string;
    reasoning: string | null;
    confidence_score: number | null;
    risk_score: number | null;
    consensus_outcome: string;
  } | null;
  crop?: { name: string } | null;
}

export default function CommunityPage() {
  const [entries, setEntries] = useState<PublicEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("validation_requests")
        .select(`
          id, farmer_notes, crop_stage, created_at, status, weather_snapshot,
          crops(name),
          validation_results(recommended_treatment, reasoning, confidence_score, risk_score, consensus_outcome)
        `)
        .eq("visibility", "public")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);

      const mapped: PublicEntry[] = (data ?? []).map((d: any) => ({
        id: d.id,
        farmer_notes: d.farmer_notes,
        crop_stage: d.crop_stage,
        created_at: d.created_at,
        status: d.status,
        weather_snapshot: d.weather_snapshot,
        crop: d.crops,
        result: d.validation_results?.[0] ?? d.validation_results ?? null,
      }));

      setEntries(mapped);
      setLoading(false);
    }
    fetch();
  }, []);

  const filtered = search.trim()
    ? entries.filter((e) => {
        const q = search.toLowerCase();
        return (
          e.farmer_notes?.toLowerCase().includes(q) ||
          e.crop?.name?.toLowerCase().includes(q) ||
          e.crop_stage?.toLowerCase().includes(q) ||
          e.result?.recommended_treatment?.toLowerCase().includes(q)
        );
      })
    : entries;

  return (
    <>
      <TopNav title="Community Knowledge Base" />
      <div className="p-6 space-y-5 max-w-4xl">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--al-text)" }}>
            <Globe className="h-5 w-5" style={{ color: "#8686AC" }} />
            Community Knowledge Base
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--al-sec)" }}>
            Public diagnoses shared by farmers. Search by crop, symptom, or treatment to find solutions for similar issues.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--al-muted)" }} />
          <input
            type="text"
            placeholder="Search crops, symptoms, treatments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
            style={{
              background: "var(--al-card)",
              border: "1px solid var(--al-border)",
              color: "var(--al-text)",
              outline: "none",
            }}
          />
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-xl py-16 text-center"
            style={{ background: "var(--al-card)", border: "1px solid var(--al-border)" }}
          >
            <Search className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--al-muted)" }} />
            <p className="text-sm" style={{ color: "var(--al-sec)" }}>
              {search ? "No matches found. Try a different search." : "No public diagnoses yet. Be the first to submit!"}
            </p>
            {!search && (
              <Link
                href="/validations/new"
                className="inline-flex mt-4 px-5 py-2 rounded-xl text-sm font-semibold btn-accent"
              >
                Submit a Concern
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--al-muted)" }}>
              {filtered.length} public {filtered.length === 1 ? "diagnosis" : "diagnoses"}
            </p>

            {filtered.map((entry) => {
              const isExpanded = expanded === entry.id;
              const conf = entry.result?.confidence_score ?? 0;
              const confColor = conf >= 80 ? "#4ade80" : conf >= 55 ? "#facc15" : "#f87171";

              return (
                <div
                  key={entry.id}
                  className="rounded-xl overflow-hidden transition-all"
                  style={{ background: "var(--al-card)", border: "1px solid var(--al-border)" }}
                >
                  {/* Summary row */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : entry.id)}
                    className="w-full text-left px-5 py-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {entry.crop?.name && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(80,80,129,0.2)", color: "#8686AC" }}
                          >
                            {entry.crop.name}
                          </span>
                        )}
                        <span className="text-xs" style={{ color: "var(--al-muted)" }}>
                          {entry.crop_stage}
                        </span>
                        <span className="text-xs" style={{ color: "var(--al-muted)" }}>
                          {formatRelative(entry.created_at)}
                        </span>
                      </div>

                      <p className="text-sm truncate" style={{ color: "var(--al-text)" }}>
                        {entry.farmer_notes?.slice(0, 120) || "No notes provided"}
                      </p>

                      {entry.result && (
                        <div className="flex items-center gap-3 mt-2">
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: "#8686AC" }} />
                          <p className="text-xs truncate" style={{ color: "var(--al-sec)" }}>
                            {entry.result.recommended_treatment}
                          </p>
                          <span className="text-xs font-semibold shrink-0" style={{ color: confColor }}>
                            {formatPercent(conf)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 mt-1" style={{ color: "var(--al-muted)" }}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && entry.result && (
                    <div
                      className="px-5 pb-5 pt-1 space-y-4"
                      style={{ borderTop: "1px solid var(--al-border)" }}
                    >
                      {/* Full notes */}
                      <div>
                        <p className="text-xs font-medium mb-1" style={{ color: "var(--al-sec)" }}>Farmer Notes</p>
                        <p className="text-sm" style={{ color: "var(--al-text)" }}>{entry.farmer_notes}</p>
                      </div>

                      {/* Treatment */}
                      <div
                        className="rounded-lg p-3"
                        style={{ background: "rgba(80,80,129,0.1)", border: "1px solid rgba(80,80,129,0.25)" }}
                      >
                        <p className="text-xs font-medium mb-1" style={{ color: "var(--al-muted)" }}>Recommended Treatment</p>
                        <p className="text-sm font-semibold" style={{ color: "var(--al-text)" }}>
                          {entry.result.recommended_treatment}
                        </p>
                      </div>

                      {/* Reasoning */}
                      {entry.result.reasoning && (
                        <div>
                          <p className="text-xs font-medium mb-1" style={{ color: "var(--al-sec)" }}>Reasoning</p>
                          <p className="text-sm leading-relaxed" style={{ color: "var(--al-text)" }}>
                            {entry.result.reasoning}
                          </p>
                        </div>
                      )}

                      {/* Scores */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-xs" style={{ color: "var(--al-sec)" }}>Confidence</p>
                          <p className="text-lg font-bold" style={{ color: confColor }}>
                            {formatPercent(conf)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs" style={{ color: "var(--al-sec)" }}>Risk</p>
                          <p className="text-lg font-bold" style={{ color: "var(--al-text)" }}>
                            {formatPercent(entry.result.risk_score ?? 0)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs" style={{ color: "var(--al-sec)" }}>Outcome</p>
                          <Badge variant={entry.result.consensus_outcome === "approved" ? "success" : "info"}>
                            {entry.result.consensus_outcome.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
