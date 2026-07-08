import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { createClient as createGenlayerClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { NextRequest, NextResponse } from "next/server";

const CONTRACT = (process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ?? "") as `0x${string}`;

async function fetchWeather(lat: number, lon: number) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) return null;
  try {
    const base = "https://api.openweathermap.org/data/2.5";
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${base}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
      fetch(`${base}/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=4`),
    ]);
    if (!currentRes.ok) return null;
    const current = await currentRes.json();
    const forecast = forecastRes.ok ? await forecastRes.json() : null;
    return {
      temperature: Math.round(current.main.temp),
      humidity: current.main.humidity,
      wind_speed: Math.round(current.wind.speed * 3.6),
      condition: current.weather?.[0]?.description ?? "unknown",
      rain_probability: forecast ? Math.round((forecast.list?.[0]?.pop ?? 0) * 100) : 0,
      location: current.name ?? `${lat},${lon}`,
      fetched_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function confidenceScoreFromBand(band: string | undefined) {
  if (band === "high") return 85;
  if (band === "medium") return 65;
  return 35;
}

function riskScoreFromVerdict(verdict: string | undefined, treatmentSafety: string | undefined) {
  if (verdict === "rejected" || treatmentSafety === "unsafe") return 85;
  if (verdict === "needs_expert_review" || treatmentSafety === "needs_expert_review") return 70;
  if (verdict === "insufficient_evidence") return 55;
  return 30;
}

export async function POST(request: NextRequest) {
  try {
    // Auth
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return request.cookies.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Service role client (bypasses RLS)
    const supabase = createSupabaseServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const body = await request.json();
    const {
      crop_name,
      crop_stage,
      farmer_notes,
      photo_url,
      photo_evidence_url,
      public_evidence_url,
      weather_source_url,
      agro_source_url,
      proposed_treatment,
      pesticide_name,
      pesticide_guidance_url,
      farm_location,
      policy_id,
      latitude,
      longitude,
      visibility,
      is_paid,
      signing_key,
    } = body;

    // 1. Get org
    const { data: membership } = await supabase
      .from("org_members").select("org_id").eq("user_id", user.id).single();
    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }
    const orgId = membership.org_id;

    // 2. Weather
    const weather = await fetchWeather(latitude, longitude);

    // 3. Wallet
    const { data: walletData } = await supabase
      .from("wallets").select("public_address, encrypted_private_key").eq("user_id", user.id).single();

    // 4. Create validation_request
    const { data: req, error: reqError } = await supabase
      .from("validation_requests")
      .insert({
        org_id: orgId,
        submitted_by: user.id,
        crop_stage: crop_stage || null,
        photo_url: photo_url || null,
        farmer_notes,
        weather_snapshot: weather,
        farm_location: farm_location || weather?.location || `${latitude},${longitude}`,
        public_evidence_url: public_evidence_url || null,
        photo_evidence_url: photo_evidence_url || photo_url || null,
        weather_source_url: weather_source_url || null,
        agro_source_url: agro_source_url || null,
        proposed_treatment: proposed_treatment || null,
        pesticide_name: pesticide_name || null,
        pesticide_guidance_url: pesticide_guidance_url || null,
        policy_id: policy_id || null,
        status: "validating",
        visibility: visibility ?? "public",
        is_paid: is_paid ?? false,
      })
      .select()
      .single();
    if (reqError) throw reqError;
    const requestId = req.id;

    // 5. Call Genlayer contract
    let txHash: string | null = null;
    let genlayerResult: any = null;

    try {
      // Owner client for admin operations (register org/agent)
      const ownerKey = process.env.GENLAYER_OWNER_PRIVATE_KEY as `0x${string}` | undefined;
      const ownerAccount = ownerKey ? createAccount(ownerKey) : createAccount();
      const ownerClient = createGenlayerClient({ chain: studionet, account: ownerAccount });

      // User client for signing the validation tx
      const userAccount = signing_key
        ? createAccount(signing_key as `0x${string}`)
        : ownerAccount;
      const glClient = createGenlayerClient({ chain: studionet, account: userAccount });

      // Ensure org is registered on-chain (owner-only operation)
      const isOrgRegistered = await ownerClient.readContract({
        address: CONTRACT,
        functionName: "is_organization_registered",
        args: [orgId],
      });
      if (!isOrgRegistered) {
        const { data: orgRow } = await supabase
          .from("organizations").select("name, country, region").eq("id", orgId).single();
        const regTx = await ownerClient.writeContract({
          address: CONTRACT,
          functionName: "register_organization",
          args: [orgId, orgRow?.name ?? "Farm Org", orgRow?.country ?? "", orgRow?.region ?? "", "free"],
          value: 0n,
        });
        await (ownerClient as any).waitForTransactionReceipt({ hash: regTx, status: "ACCEPTED", retries: 40 });
      }

      // Ensure agent is registered on-chain (owner-only operation)
      const agentId = walletData?.public_address ?? "default-agent";
      const isAgentActive = await ownerClient.readContract({
        address: CONTRACT,
        functionName: "is_agent_active",
        args: [agentId],
      }).catch(() => false);
      if (!isAgentActive) {
        const agentTx = await ownerClient.writeContract({
          address: CONTRACT,
          functionName: "register_agent",
          args: [agentId, orgId, "Validation Agent", "Auto-registered validation agent"],
          value: 0n,
        });
        await (ownerClient as any).waitForTransactionReceipt({ hash: agentTx, status: "ACCEPTED", retries: 40 });
      }

      txHash = (await glClient.writeContract({
        address: CONTRACT,
        functionName: "submit_validation",
        args: [
          requestId,
          orgId,
          walletData?.public_address ?? "default-agent",
          crop_name ?? "Unknown",
          crop_stage ?? "",
          farmer_notes,
          farm_location || weather?.location || `${latitude},${longitude}`,
          public_evidence_url ?? "",
          photo_evidence_url || photo_url || "",
          weather_source_url ?? "",
          agro_source_url ?? "",
          proposed_treatment ?? "",
          pesticide_name ?? "",
          pesticide_guidance_url ?? "",
          JSON.stringify(weather ?? {}),
          policy_id ?? "",
          requestId,
        ],
        value: 0n,
      })) as string;

      await supabase.from("validation_requests")
        .update({ genlayer_tx_hash: txHash }).eq("id", requestId);

      await (glClient as any).waitForTransactionReceipt({
        hash: txHash,
        status: "ACCEPTED",
        retries: 40,
      });

      // Read result from contract
      const resultData = await glClient.readContract({
        address: CONTRACT,
        functionName: "get_validation_result",
        args: [requestId],
      });

      genlayerResult = typeof resultData === "string" ? JSON.parse(resultData) : resultData;
    } catch (glError: any) {
      console.error("Genlayer evidence verification failed:", glError.message);
      await supabase.from("validation_requests")
        .update({ status: "failed", genlayer_tx_hash: txHash }).eq("id", requestId);
      return NextResponse.json(
        { error: "GenLayer evidence verification failed. No backend fallback verdict was generated.", request_id: requestId },
        { status: 502 },
      );
    }

    // 6. Write result
    const verdict = genlayerResult.verdict ?? genlayerResult.consensus_outcome;
    const treatmentSafety = genlayerResult.treatment_safety;
    const confidenceScore = genlayerResult.confidence_score ?? confidenceScoreFromBand(genlayerResult.confidence_band);
    const riskScore = genlayerResult.risk_score ?? riskScoreFromVerdict(verdict, treatmentSafety);
    const finalStatus = verdict === "approved" ? "approved"
      : verdict === "needs_expert_review" ? "escalated"
      : "failed";
    const reason = genlayerResult.reason ?? genlayerResult.reasoning ?? "Evidence-backed GenLayer validator consensus completed.";

    await Promise.all([
      supabase.from("validation_results").insert({
        request_id: requestId,
        consensus_outcome: verdict,
        recommended_treatment: genlayerResult.recommended_treatment ?? proposed_treatment ?? "Needs expert review before treatment",
        confidence_score: confidenceScore,
        risk_score: riskScore,
        validator_votes: [{
          validator_id: "genlayer-consensus",
          vote: verdict,
          reasoning: reason,
          confidence: confidenceScore,
          evidence_core: {
            evidence_checked: genlayerResult.evidence_checked,
            weather_consistent: genlayerResult.weather_consistent,
            photo_support: genlayerResult.photo_support,
            treatment_safety: treatmentSafety,
            confidence_band: genlayerResult.confidence_band,
          },
        }],
        reasoning: reason,
        on_chain_tx_hash: txHash,
      }),
      supabase.from("validation_requests").update({ status: finalStatus }).eq("id", requestId),
    ]);

    // 7. Audit
    await supabase.from("audit_events").insert({
      org_id: orgId,
      user_id: user.id,
      entity_type: "validation_request",
      entity_id: requestId,
      action: "validated",
      metadata: {
        outcome: verdict,
        confidence_band: genlayerResult.confidence_band,
        risk: riskScore,
        tx_hash: txHash,
        on_chain: !!txHash,
      },
    });

    return NextResponse.json({ request_id: requestId, outcome: verdict });
  } catch (err: any) {
    console.error("[validate]", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}
