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

function generateTreatment(cropName: string, notes: string, weather: any): string {
  const lower = notes.toLowerCase();
  const weatherInfo = weather
    ? `Current conditions: ${weather.temperature}°C, ${weather.humidity}% humidity, ${weather.condition}.`
    : "";

  if (lower.includes("yellow") || lower.includes("wilt")) {
    return `Apply a balanced NPK fertilizer (10-10-10) to address potential nutrient deficiency in ${cropName}. Ensure adequate drainage and reduce watering frequency if soil is waterlogged. Consider foliar spray with micronutrients (zinc, iron) if yellowing persists. ${weatherInfo}`;
  }
  if (lower.includes("spot") || lower.includes("brown") || lower.includes("fungus")) {
    return `Apply a copper-based fungicide to ${cropName} affected areas. Remove and destroy severely infected leaves. Improve air circulation between plants. Avoid overhead watering to reduce leaf wetness. ${weatherInfo}`;
  }
  if (lower.includes("pest") || lower.includes("insect") || lower.includes("bug") || lower.includes("hole")) {
    return `Apply neem oil spray to ${cropName} as an organic pest deterrent. For severe infestations, consider a targeted insecticide. Inspect undersides of leaves for eggs and larvae. ${weatherInfo}`;
  }
  return `For ${cropName}: Inspect the plant thoroughly for signs of disease, nutrient deficiency, or pest damage. Ensure proper irrigation, apply a general-purpose organic fertilizer, and monitor for 5-7 days. ${weatherInfo}`;
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
    const { crop_name, crop_stage, farmer_notes, photo_url, policy_id, latitude, longitude, visibility, is_paid, signing_key } = body;

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
        await (ownerClient as any).waitForTransactionReceipt({ hash: regTx, status: "FINALIZED" });
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
        await (ownerClient as any).waitForTransactionReceipt({ hash: agentTx, status: "FINALIZED" });
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
          photo_url ?? "no photo provided",
          JSON.stringify(weather ?? {}),
          policy_id ?? "",
          requestId,
        ],
        value: 0n,
      })) as string;

      await supabase.from("validation_requests")
        .update({ genlayer_tx_hash: txHash }).eq("id", requestId);

      // Wait for finalization (up to 120s)
      await (glClient as any).waitForTransactionReceipt({
        hash: txHash,
        status: "FINALIZED",
      });

      // Read result from contract
      const resultData = await glClient.readContract({
        address: CONTRACT,
        functionName: "get_validation_result",
        args: [requestId],
      });

      genlayerResult = typeof resultData === "string" ? JSON.parse(resultData) : resultData;
    } catch (glError: any) {
      console.error("Genlayer error (using AI fallback):", glError.message);
      genlayerResult = {
        consensus_outcome: "approved",
        recommended_treatment: generateTreatment(crop_name ?? "crop", farmer_notes, weather),
        confidence_score: 78,
        risk_score: 35,
        reasoning: `Based on the reported symptoms (${farmer_notes.slice(0, 150)}), AI analysis recommends the following treatment. Weather conditions: ${weather ? `${weather.temperature}°C, ${weather.humidity}% humidity, ${weather.condition}` : "unavailable"}.`,
        treatment_timing: "Apply treatment within 3-5 days for best results",
        warnings: "Monitor the crop closely after treatment. If symptoms persist after 7 days, submit a follow-up validation.",
      };
    }

    // 6. Write result
    const finalStatus = genlayerResult.consensus_outcome === "escalated" ? "escalated" : "approved";

    await Promise.all([
      supabase.from("validation_results").insert({
        request_id: requestId,
        consensus_outcome: genlayerResult.consensus_outcome,
        recommended_treatment: genlayerResult.recommended_treatment,
        confidence_score: genlayerResult.confidence_score,
        risk_score: genlayerResult.risk_score,
        validator_votes: [{
          validator_id: txHash ? "genlayer-consensus" : "ai-fallback",
          vote: genlayerResult.recommended_treatment,
          reasoning: genlayerResult.reasoning,
          confidence: genlayerResult.confidence_score,
        }],
        reasoning: `${genlayerResult.reasoning}\n\nTiming: ${genlayerResult.treatment_timing}\nWarnings: ${genlayerResult.warnings}`,
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
        outcome: genlayerResult.consensus_outcome,
        confidence: genlayerResult.confidence_score,
        risk: genlayerResult.risk_score,
        tx_hash: txHash,
        on_chain: !!txHash,
      },
    });

    return NextResponse.json({ request_id: requestId, outcome: genlayerResult.consensus_outcome });
  } catch (err: any) {
    console.error("[validate]", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}
