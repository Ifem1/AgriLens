"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TopNav } from "@/components/layout/TopNav";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatPercent, formatTxHash } from "@/lib/utils/format";
import { getRiskLabel } from "@/lib/utils/risk";
import type { ValidationRequest, ValidationResult, ValidatorVote, WeatherSnapshot } from "@/types/database";
import {
  ShieldCheck, Thermometer, Droplets, Wind, CloudRain,
  ExternalLink, ArrowLeft, Users, FileText, AlertTriangle,
  Clock, CheckCircle2, Info, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const cardStyle = {
  background: "var(--al-card)",
  border: "1px solid var(--al-border)",
  borderRadius: "1rem",
  padding: "1.5rem",
};

const fieldStyle = {
  background: "var(--al-bg)",
  border: "1px solid var(--al-border)",
  color: "var(--al-text)",
  borderRadius: "0.5rem",
  padding: "0.625rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
};

const labelStyle = {
  fontSize: "0.8125rem",
  fontWeight: 500 as const,
  color: "var(--al-sec)",
  marginBottom: "0.375rem",
  display: "block" as const,
};

interface PremiumForm {
  cropVariety: string;
  soilType: string;
  farmSize: string;
  budget: string;
  urgency: string;
  additionalContext: string;
}

export default function ValidationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<ValidationRequest | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPremiumForm, setShowPremiumForm] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumForm, setPremiumForm] = useState<PremiumForm>({
    cropVariety: "", soilType: "", farmSize: "", budget: "", urgency: "", additionalContext: "",
  });

  useEffect(() => {
    const supabase = createClient();

    async function fetchData() {
      const { data: req } = await supabase.from("validation_requests").select("*").eq("id", id).single();
      if (req) {
        setRequest(req);
        const { data: res } = await supabase.from("validation_results").select("*").eq("request_id", id).single();
        if (res) setResult(res);
      }
      setLoading(false);
    }

    fetchData();

    const channel = supabase
      .channel(`validation-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "validation_results", filter: `request_id=eq.${id}` },
        (payload) => {
          setResult(payload.new as ValidationResult);
          setRequest((prev) => prev ? { ...prev, status: "approved" } : prev);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function handlePremiumSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!request) return;
    setPremiumLoading(true);
    try {
      const supabase = createClient();
      const enhanced = `
DETAILED PLAN REQUEST — PRIVATE

Original farmer notes: ${request.farmer_notes}
Crop variety: ${premiumForm.cropVariety}
Soil type: ${premiumForm.soilType}
Farm size: ${premiumForm.farmSize}
Budget: ${premiumForm.budget}
Urgency: ${premiumForm.urgency}
Additional context: ${premiumForm.additionalContext}
      `.trim();

      const { data, error } = await supabase.functions.invoke("submit-validation", {
        body: {
          crop_id: (request as any).crop_id,
          crop_stage: request.crop_stage,
          farmer_notes: enhanced,
          photo_url: request.photo_url,
          farm_location: (request as any).farm_location,
          public_evidence_url: (request as any).public_evidence_url,
          photo_evidence_url: (request as any).photo_evidence_url,
          weather_source_url: (request as any).weather_source_url,
          agro_source_url: (request as any).agro_source_url,
          proposed_treatment: (request as any).proposed_treatment,
          pesticide_name: (request as any).pesticide_name,
          pesticide_guidance_url: (request as any).pesticide_guidance_url,
          latitude: (request as any).latitude,
          longitude: (request as any).longitude,
          visibility: "private",
          is_paid: true,
        },
      });

      if (error) throw error;
      toast.success("Detailed plan submitted. Validators are working on your personalised treatment.");
      setShowPremiumForm(false);
      window.location.href = `/validations/${data.request_id}`;
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit");
    } finally {
      setPremiumLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <TopNav title="Validation Detail" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  if (!request) {
    return (
      <>
        <TopNav title="Validation Detail" />
        <div className="p-6 text-center py-20">
          <p style={{ color: "var(--al-sec)" }}>Validation not found</p>
        </div>
      </>
    );
  }

  const weather = request.weather_snapshot as unknown as WeatherSnapshot | null;
  const votes = (result?.validator_votes as unknown as ValidatorVote[]) ?? [];
  const riskInfo = result?.risk_score ? getRiskLabel(result.risk_score) : null;
  const conf = result?.confidence_score ?? 0;
  const risk = result?.risk_score ?? 0;

  const confidenceLabel = conf >= 80 ? "High confidence" : conf >= 55 ? "Moderate confidence" : "Low confidence — consider more evidence";
  const confidenceColor = conf >= 80 ? "#4ade80" : conf >= 55 ? "#facc15" : "#f87171";

  const outcomeBadge = (outcome: string) => {
    const map: Record<string, "success" | "warning" | "danger" | "escalated" | "info"> = {
      approved: "success", low_confidence: "warning", escalated: "escalated",
      rejected: "danger", needs_expert_review: "escalated",
      policy_blocked: "danger", insufficient_evidence: "info",
    };
    return <Badge variant={map[outcome] ?? "neutral"}>{outcome.replace(/_/g, " ")}</Badge>;
  };

  return (
    <>
      <TopNav title="Validation Detail" />
      <div className="p-6 space-y-6 max-w-4xl">
        <Link
          href="/validations"
          className="inline-flex items-center gap-1 text-sm transition-colors"
          style={{ color: "var(--al-sec)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to validations
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--al-text)" }}>
              Validation #{id.slice(0, 8).toUpperCase()}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--al-sec)" }}>
              {formatDateTime(request.created_at)}
            </p>
          </div>
          <Badge variant={
            request.status === "approved" ? "success"
              : request.status === "escalated" ? "escalated"
              : "info"
          }>
            {request.status}
          </Badge>
        </div>

        {/* Evidence */}
        <div style={cardStyle}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--al-text)" }}>
            <FileText className="h-4 w-4" style={{ color: "var(--al-muted)" }} />
            Submitted Evidence
          </h3>
          {request.photo_url && (
            <img src={request.photo_url} alt="Crop photo" className="rounded-lg max-h-64 w-full object-cover mb-4" />
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--al-sec)" }}>Farmer Notes</p>
              <p className="text-sm" style={{ color: "var(--al-text)" }}>{request.farmer_notes || "No notes"}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--al-sec)" }}>Crop Stage</p>
              <Badge variant="info">{request.crop_stage}</Badge>
            </div>
          </div>
          {((request as any).farm_location || (request as any).public_evidence_url || (request as any).weather_source_url || (request as any).pesticide_guidance_url) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t" style={{ borderColor: "var(--al-border)" }}>
              {[
                { label: "Farm Location", value: (request as any).farm_location },
                { label: "Public Evidence", value: (request as any).public_evidence_url },
                { label: "Weather Source", value: (request as any).weather_source_url },
                { label: "Agro Source", value: (request as any).agro_source_url },
                { label: "Photo Evidence", value: (request as any).photo_evidence_url },
                { label: "Treatment", value: (request as any).proposed_treatment },
                { label: "Pesticide", value: (request as any).pesticide_name },
                { label: "Guidance", value: (request as any).pesticide_guidance_url },
              ].filter((item) => item.value).map((item) => (
                <div key={item.label}>
                  <p className="text-xs mb-1" style={{ color: "var(--al-sec)" }}>{item.label}</p>
                  {String(item.value).startsWith("http") ? (
                    <a href={String(item.value)} target="_blank" rel="noreferrer" className="text-sm inline-flex items-center gap-1" style={{ color: "#8686AC" }}>
                      Public source <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--al-text)" }}>{String(item.value)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weather */}
        {weather && (
          <div style={cardStyle}>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--al-text)" }}>
              <CloudRain className="h-4 w-4" style={{ color: "#60a5fa" }} />
              Weather at Submission
              <span className="text-xs font-normal ml-1" style={{ color: "var(--al-sec)" }}>
                — factored into the diagnosis
              </span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: <Thermometer className="h-4 w-4" style={{ color: "#fb923c" }} />, label: "Temperature", val: `${weather.temperature}°C` },
                { icon: <Droplets className="h-4 w-4" style={{ color: "#60a5fa" }} />, label: "Humidity", val: `${weather.humidity}%` },
                { icon: <Wind className="h-4 w-4" style={{ color: "#2dd4bf" }} />, label: "Wind", val: `${weather.wind_speed} km/h` },
                { icon: <CloudRain className="h-4 w-4" style={{ color: "#818cf8" }} />, label: "Rain Chance", val: `${weather.rain_probability}%` },
              ].map((w) => (
                <div key={w.label} className="flex items-center gap-2">
                  {w.icon}
                  <div>
                    <p className="text-xs" style={{ color: "var(--al-sec)" }}>{w.label}</p>
                    <p className="text-sm font-medium" style={{ color: "var(--al-text)" }}>{w.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result ? (
          <>
            {/* Main consensus result */}
            <div style={{ ...cardStyle, border: "1px solid #505081" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--al-text)" }}>
                  <ShieldCheck className="h-4 w-4" style={{ color: "#8686AC" }} />
                  Evidence-backed Verdict
                </h3>
                {outcomeBadge(result.consensus_outcome)}
              </div>

              <div className="space-y-4">
                {((result as any).evidence_checked !== undefined || votes[0]?.evidence_core) && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: "Evidence Checked", value: String((result as any).evidence_checked ?? votes[0]?.evidence_core?.evidence_checked ?? "unknown") },
                      { label: "Weather Consistent", value: String((result as any).weather_consistent ?? votes[0]?.evidence_core?.weather_consistent ?? "unknown") },
                      { label: "Photo Support", value: (result as any).photo_support ?? votes[0]?.evidence_core?.photo_support ?? "not_checked" },
                      { label: "Treatment Safety", value: (result as any).treatment_safety ?? votes[0]?.evidence_core?.treatment_safety ?? "insufficient_evidence" },
                      { label: "Confidence Band", value: (result as any).confidence_band ?? votes[0]?.evidence_core?.confidence_band ?? "low" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg p-3" style={{ background: "var(--al-bg)", border: "1px solid var(--al-border)" }}>
                        <p className="text-xs mb-1" style={{ color: "var(--al-sec)" }}>{item.label}</p>
                        <p className="text-sm font-semibold" style={{ color: "var(--al-text)" }}>{item.value.replace(/_/g, " ")}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommended Treatment */}
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgba(80,80,129,0.12)", border: "1px solid rgba(80,80,129,0.3)" }}
                >
                  <p className="text-xs font-medium mb-1" style={{ color: "var(--al-muted)" }}>Treatment Review</p>
                  <p className="text-base font-semibold" style={{ color: "var(--al-text)" }}>{result.recommended_treatment}</p>
                </div>

                {/* Reasoning chain */}
                {result.reasoning && (
                  <div>
                    <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: "var(--al-sec)" }}>
                      <Info className="h-3.5 w-3.5" /> Reasoning Chain
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--al-text)" }}>{result.reasoning}</p>
                  </div>
                )}

                {/* Scores */}
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs" style={{ color: "var(--al-sec)" }}>Confidence</p>
                      <span className="text-xs font-semibold" style={{ color: confidenceColor }}>{confidenceLabel}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={conf} className="flex-1" />
                      <span className="text-sm font-semibold w-10 text-right" style={{ color: confidenceColor }}>
                        {formatPercent(conf)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs" style={{ color: "var(--al-sec)" }}>Risk Level</p>
                      <span className="text-xs font-semibold" style={{ color: riskInfo?.color?.includes("red") ? "#f87171" : riskInfo?.color?.includes("yellow") ? "#facc15" : "#4ade80" }}>
                        {riskInfo?.label ?? "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={risk} className="flex-1" color={riskInfo?.color?.includes("red") ? "bg-red-500" : riskInfo?.color?.includes("yellow") ? "bg-yellow-500" : "bg-green-500"} />
                      <span className="text-sm font-semibold w-10 text-right" style={{ color: "var(--al-text)" }}>
                        {formatPercent(risk)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional scores */}
                {(result as any).disease_severity !== undefined && (
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t" style={{ borderColor: "var(--al-border)" }}>
                    {[
                      { label: "Disease Severity", val: (result as any).disease_severity },
                      { label: "Weather Risk", val: (result as any).weather_risk },
                      { label: "Treatment Efficacy", val: (result as any).treatment_efficacy },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <p className="text-xs mb-1" style={{ color: "var(--al-sec)" }}>{s.label}</p>
                        <p className="text-xl font-bold" style={{ color: "var(--al-text)" }}>{s.val ?? "—"}</p>
                        <p className="text-xs" style={{ color: "var(--al-muted)" }}>/100</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pre-harvest interval */}
                {(result as any).pre_harvest_interval && (
                  <div
                    className="flex items-start gap-3 rounded-lg p-3"
                    style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}
                  >
                    <Clock className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#fbbf24" }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "#fbbf24" }}>Pre-Harvest Interval</p>
                      <p className="text-sm mt-0.5" style={{ color: "var(--al-text)" }}>{(result as any).pre_harvest_interval}</p>
                    </div>
                  </div>
                )}

                {/* Safety warnings */}
                {(result as any).safety_warnings && (
                  <div
                    className="flex items-start gap-3 rounded-lg p-3"
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
                  >
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "#f87171" }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "#f87171" }}>Safety Warnings</p>
                      <p className="text-sm mt-0.5" style={{ color: "var(--al-text)" }}>{(result as any).safety_warnings}</p>
                    </div>
                  </div>
                )}

                {/* Regulatory note */}
                {(result as any).regulatory_note && (
                  <div
                    className="flex items-start gap-3 rounded-lg p-3"
                    style={{ background: "rgba(134,134,172,0.08)", border: "1px solid var(--al-border)" }}
                  >
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--al-muted)" }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: "var(--al-sec)" }}>Regulatory Note</p>
                      <p className="text-sm mt-0.5" style={{ color: "var(--al-text)" }}>{(result as any).regulatory_note}</p>
                    </div>
                  </div>
                )}

                {/* On-chain hash */}
                {result.on_chain_tx_hash && (
                  <div
                    className="flex items-center gap-2 pt-3 border-t"
                    style={{ borderColor: "var(--al-border)" }}
                  >
                    <p className="text-xs" style={{ color: "var(--al-sec)" }}>On-chain TX:</p>
                    <code className="text-xs font-mono" style={{ color: "#8686AC" }}>
                      {formatTxHash(result.on_chain_tx_hash)}
                    </code>
                    <ExternalLink className="h-3 w-3" style={{ color: "var(--al-muted)" }} />
                  </div>
                )}
              </div>
            </div>

            {/* Validator votes */}
            {votes.length > 0 && (
              <div style={cardStyle}>
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--al-text)" }}>
                  <Users className="h-4 w-4" style={{ color: "var(--al-muted)" }} />
                  Validator Votes ({votes.length})
                  <span className="text-xs font-normal" style={{ color: "var(--al-sec)" }}>
                    — independent AI validators reached consensus
                  </span>
                </h3>
                <div className="space-y-3">
                  {votes.map((vote, i) => (
                    <div
                      key={i}
                      className="rounded-lg p-3"
                      style={{ background: "var(--al-bg)", border: "1px solid var(--al-border)" }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono" style={{ color: "var(--al-muted)" }}>Validator {i + 1}</span>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: "rgba(80,80,129,0.2)",
                            color: "var(--al-sec)",
                          }}
                        >
                          {vote.confidence}% confidence
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1" style={{ color: "var(--al-text)" }}>{vote.vote}</p>
                      <p className="text-xs" style={{ color: "var(--al-sec)" }}>{vote.reasoning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Premium CTA — only shown for public results */}
            {(request as any).visibility !== "private" && !(request as any).is_paid && (
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "linear-gradient(135deg, rgba(39,39,87,0.7) 0%, rgba(80,80,129,0.4) 100%)",
                  border: "1px solid #505081",
                }}
              >
                {!showPremiumForm ? (
                  <>
                    <div className="flex items-start gap-4">
                      <div
                        className="rounded-xl p-2.5 shrink-0"
                        style={{ background: "rgba(80,80,129,0.3)" }}
                      >
                        <Sparkles className="h-5 w-5" style={{ color: "#8686AC" }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold mb-1" style={{ color: "var(--al-text)" }}>
                          Need a more targeted, detailed plan?
                        </p>
                        <p className="text-sm mb-4" style={{ color: "var(--al-sec)" }}>
                          Fill in your specific farm conditions — crop variety, soil type, budget, urgency — and validators will return
                          a personalised treatment strategy. Result is private, visible only to you.
                        </p>
                        <button
                          onClick={() => setShowPremiumForm(true)}
                          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                          style={{ background: "#505081", color: "#F4F4FB" }}
                        >
                          Get Detailed Plan
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <form onSubmit={handlePremiumSubmit} className="space-y-4">
                    <p className="font-semibold mb-2" style={{ color: "var(--al-text)" }}>
                      Detailed Plan — Tell us more
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label style={labelStyle}>Crop variety</label>
                        <input
                          placeholder="e.g. WEMA drought-tolerant"
                          value={premiumForm.cropVariety}
                          onChange={(e) => setPremiumForm({ ...premiumForm, cropVariety: e.target.value })}
                          style={fieldStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Soil type</label>
                        <input
                          placeholder="e.g. Sandy loam"
                          value={premiumForm.soilType}
                          onChange={(e) => setPremiumForm({ ...premiumForm, soilType: e.target.value })}
                          style={fieldStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Farm size</label>
                        <input
                          placeholder="e.g. 2 hectares"
                          value={premiumForm.farmSize}
                          onChange={(e) => setPremiumForm({ ...premiumForm, farmSize: e.target.value })}
                          style={fieldStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Budget range</label>
                        <input
                          placeholder="e.g. Under $50"
                          value={premiumForm.budget}
                          onChange={(e) => setPremiumForm({ ...premiumForm, budget: e.target.value })}
                          style={fieldStyle}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Urgency</label>
                      <select
                        value={premiumForm.urgency}
                        onChange={(e) => setPremiumForm({ ...premiumForm, urgency: e.target.value })}
                        style={fieldStyle}
                      >
                        <option value="">Select urgency</option>
                        <option value="critical">Critical — crop at risk in days</option>
                        <option value="moderate">Moderate — within 1–2 weeks</option>
                        <option value="low">Low — monitoring only</option>
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>Additional context</label>
                      <textarea
                        rows={3}
                        placeholder="Any other details: previous treatments tried, nearby affected farms, irrigation method..."
                        value={premiumForm.additionalContext}
                        onChange={(e) => setPremiumForm({ ...premiumForm, additionalContext: e.target.value })}
                        style={{ ...fieldStyle, resize: "none" }}
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={premiumLoading}
                        className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                        style={{
                          background: "#505081",
                          color: "#F4F4FB",
                          opacity: premiumLoading ? 0.7 : 1,
                        }}
                      >
                        {premiumLoading ? "Submitting..." : "Submit for Detailed Analysis"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPremiumForm(false)}
                        className="px-4 py-3 rounded-xl text-sm transition-all"
                        style={{
                          background: "var(--al-bg)",
                          color: "var(--al-sec)",
                          border: "1px solid var(--al-border)",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={cardStyle} className="text-center py-14">
            <div
              className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: "#505081", borderTopColor: "transparent" }}
            />
            <p className="text-sm" style={{ color: "var(--al-sec)" }}>Awaiting consensus from validators...</p>
            <p className="text-xs mt-1" style={{ color: "var(--al-muted)" }}>
              Results will appear here automatically
            </p>
          </div>
        )}
      </div>
    </>
  );
}
