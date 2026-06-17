// Edge Function: setup-account
// Called immediately after supabase.auth.signUp() succeeds.
// Creates: user_profile, wallet record, organization, org_member, subscription, audit event.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { full_name, org_name, public_address, encrypted_private_key } = await req.json();

    if (!full_name || !org_name || !public_address || !encrypted_private_key) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client bypasses RLS for account setup
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify the JWT and get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create user profile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert({ id: user.id, full_name });
    if (profileError) throw profileError;

    // 2. Store wallet (private key was encrypted client-side before sending)
    const { error: walletError } = await supabase
      .from("wallets")
      .upsert({ user_id: user.id, public_address, encrypted_private_key });
    if (walletError) throw walletError;

    // 3. Create organization with URL-safe slug
    const baseSlug = org_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: org_name, slug, plan_tier: "free" })
      .select()
      .single();
    if (orgError) throw orgError;

    // 4. Add user as owner
    const { error: memberError } = await supabase
      .from("org_members")
      .insert({ org_id: org.id, user_id: user.id, role: "owner" });
    if (memberError) throw memberError;

    // 5. Create free subscription
    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({ org_id: org.id, plan_tier: "free", validations_limit: 20 });
    if (subError) throw subError;

    // 6. Audit log
    await supabase.from("audit_events").insert({
      org_id: org.id,
      user_id: user.id,
      entity_type: "organization",
      entity_id: org.id,
      action: "created",
      metadata: { org_name, plan_tier: "free" },
    });

    return new Response(JSON.stringify({ org_id: org.id, wallet_address: public_address }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
