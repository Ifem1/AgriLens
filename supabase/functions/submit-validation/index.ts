// Edge Function: submit-validation
// Full pipeline:
//   1. Authenticate caller
//   2. Check subscription limit
//   3. Fetch live weather from OpenWeatherMap
//   4. Create validation_request row (status: validating)
//   5. Build Genlayer call payload
//   6. Send transaction to Genlayer contract (validate_crop)
//   7. Poll Genlayer until finalized (max 120 s)
//   8. Read result via get_result view call
//   9. Write validation_result row + update request status
//  10. Increment subscription usage + write audit event

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Genlayer RPC helpers ──────────────────────────────────────────────────

const GENLAYER_RPC = Deno.env.get("GENLAYER_RPC_URL") ?? "https://studio.genlayer.com/api";
const CONTRACT_ADDRESS = Deno.env.get("NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS") ?? "";

async function genlayerRpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(GENLAYER_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json() as { result?: unknown; error?: { message: string } };
  if (json.error) throw new Error(`Genlayer RPC error: ${json.error.message}`);
  return json.result;
}

async function sendContractWrite(
  fromAddress: string,
  method: string,
  args: unknown[],
): Promise<string> {
  const txHash = await genlayerRpc("eth_sendTransaction", [{
    from: fromAddress,
    to: CONTRACT_ADDRESS,
    data: JSON.stringify({ method, args }),
  }]);
  return txHash as string;
}

async function waitForFinalization(txHash: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tx = await genlayerRpc("gen_getTransactionByHash", [txHash]) as {
      status?: string;
    } | null;
    if (tx?.status === "FINALIZED") return;
    if (tx?.status === "FAILED") throw new Error("Genlayer transaction failed");
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Genlayer consensus timed out after 120 s");
}

async function readContractView(method: string, args: unknown[]): Promise<string> {
  const result = await genlayerRpc("eth_call", [{
    to: CONTRACT_ADDRESS,
    data: JSON.stringify({ method, args }),
  }]);
  return result as string;
}

// ─── OpenWeatherMap ───────────────────────────────────────────────────────────

interface WeatherSnapshot {
  temperature: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  rain_probability: number;
  location: string;
  fetched_at: string;
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const apiKey = Deno.env.get("OPENWEATHERMAP_API_KEY");
  if (!apiKey) throw new Error("OpenWeatherMap API key not configured");

  const base = "https://api.openweathermap.org/data/2.5";
  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${base}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
    fetch(`${base}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=4`),
  ]);

  if (!currentRes.ok) throw new Error("Failed to fetch weather data");
  const current = await currentRes.json() as {
    main: { temp: number; humidity: number };
    wind: { speed: number };
    weather: Array<{ description: string }>;
    name: string;
  };
  const forecast = forecastRes.ok ? await forecastRes.json() as { list?: Array<{ pop?: number }> } : null;
  const rainProbability = forecast ? Math.round((forecast.list?.[0]?.pop ?? 0) * 100) : 0;

  return {
    temperature: Math.round(current.main.temp),
    humidity: current.main.humidity,
    wind_speed: Math.round(current.wind.speed * 3.6),
    condition: current.weather?.[0]?.description ?? "unknown",
    rain_probability: rainProbability,
    location: current.name ?? `${lat},${lon}`,
    fetched_at: new Date().toISOString(),
  };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) return respond({ error: "Invalid token" }, 401);

    const body = await req.json() as {
      crop_id: string;
      crop_stage: string;
      farmer_notes: string;
      photo_url: string | null;
      policy_id: string | null;
      latitude: number;
      longitude: number;
    };

    const { crop_id, crop_stage, farmer_notes, photo_url, policy_id, latitude, longitude } = body;

    // ── 1. Get caller's org ──────────────────────────────────────────────────
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .single();
    if (!membership) return respond({ error: "No organization found for this user" }, 403);

    const orgId = membership.org_id;

    // ── 2. Check subscription limit ──────────────────────────────────────────
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("validations_used, validations_limit")
      .eq("org_id", orgId)
      .single();
    if (sub && sub.validations_used >= sub.validations_limit) {
      return respond({ error: "Validation limit reached for your current plan" }, 402);
    }

    // ── 3. Fetch live weather ────────────────────────────────────────────────
    const weather = await fetchWeather(latitude, longitude);

    // ── 4. Fetch crop name ───────────────────────────────────────────────────
    const { data: crop } = await supabase
      .from("crops")
      .select("name")
      .eq("id", crop_id)
      .single();
    const cropName = crop?.name ?? "Unknown crop";

    // ── 5. Fetch policy rules ────────────────────────────────────────────────
    let policyRulesJson = "null";
    if (policy_id) {
      const { data: policy } = await supabase
        .from("policies")
        .select("rules, region")
        .eq("id", policy_id)
        .single();
      if (policy) {
        policyRulesJson = JSON.stringify({ rules: policy.rules, region: policy.region });
      }
    }

    // ── 6. Wallet (used as "from" address for Genlayer tx) ──────────────────
    const { data: wallet } = await supabase
      .from("wallets")
      .select("public_address")
      .eq("user_id", user.id)
      .single();
    const fromAddress = wallet?.public_address ?? "0x0000000000000000000000000000000000000000";

    // ── 7. Create validation_request row ────────────────────────────────────
    const { data: request, error: requestError } = await supabase
      .from("validation_requests")
      .insert({
        org_id: orgId,
        submitted_by: user.id,
        crop_id,
        crop_stage,
        photo_url,
        farmer_notes,
        weather_snapshot: weather,
        policy_id,
        status: "validating",
      })
      .select()
      .single();
    if (requestError) throw requestError;

    const requestId: string = request.id;

    // ── 8. Call Genlayer contract ────────────────────────────────────────────
    const txHash = await sendContractWrite(fromAddress, "validate_crop", [
      requestId,
      cropName,
      crop_stage,
      farmer_notes,
      JSON.stringify(weather),
      policyRulesJson,
    ]);

    // Store tx hash on the request row
    await supabase
      .from("validation_requests")
      .update({ genlayer_tx_hash: txHash })
      .eq("id", requestId);

    // ── 9. Wait for consensus finalization ───────────────────────────────────
    await waitForFinalization(txHash);

    // ── 10. Read the consensus result ────────────────────────────────────────
    const resultJson = await readContractView("get_result", [requestId]);
    const result = JSON.parse(resultJson) as {
      diagnosis: string;
      recommended_treatment: string;
      alternative_treatments: string[];
      reasoning: string;
      confidence_score: number;
      risk_score: number;
      consensus_outcome: string;
      treatment_timing: string;
      warnings: string;
    };

    // Build validator_votes array (Genlayer single-contract call produces one vote;
    // the consensus mechanism aggregates across validators internally)
    const validatorVotes = [{
      validator_id: "genlayer-consensus",
      vote: result.recommended_treatment,
      reasoning: result.reasoning,
      confidence: result.confidence_score,
    }];

    // ── 11. Write result + update request status ─────────────────────────────
    const finalStatus = result.consensus_outcome === "escalated" ? "escalated"
      : result.consensus_outcome === "approved" ? "approved"
      : result.consensus_outcome === "policy_blocked" ? "failed"
      : "approved";

    await Promise.all([
      supabase.from("validation_results").insert({
        request_id: requestId,
        consensus_outcome: result.consensus_outcome,
        recommended_treatment: result.recommended_treatment,
        confidence_score: result.confidence_score,
        risk_score: result.risk_score,
        validator_votes: validatorVotes,
        reasoning: `${result.reasoning}\n\nTiming: ${result.treatment_timing}\nWarnings: ${result.warnings}`,
        on_chain_tx_hash: txHash,
      }),
      supabase.from("validation_requests").update({ status: finalStatus }).eq("id", requestId),
    ]);

    // ── 12. Handle escalations ───────────────────────────────────────────────
    if (result.consensus_outcome === "escalated") {
      await supabase.from("escalations").insert({
        request_id: requestId,
        reason: `Low confidence (${result.confidence_score}%) with high risk (${result.risk_score}%). Requires human agronomist review.`,
      });
    }

    // ── 13. Increment subscription usage + audit ─────────────────────────────
    await Promise.all([
      supabase.rpc("increment_validations_used", { org_id_param: orgId }),
      supabase.from("audit_events").insert({
        org_id: orgId,
        user_id: user.id,
        entity_type: "validation_request",
        entity_id: requestId,
        action: "validated",
        metadata: {
          outcome: result.consensus_outcome,
          confidence: result.confidence_score,
          risk: result.risk_score,
          tx_hash: txHash,
        },
      }),
    ]);

    return respond({ request_id: requestId, outcome: result.consensus_outcome });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[submit-validation]", message);
    return respond({ error: message }, 500);
  }
});
