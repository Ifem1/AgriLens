"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateWallet } from "@/lib/wallet/generate";
import { encryptPrivateKey } from "@/lib/wallet/encrypt";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      // If user already exists, try signing in instead
      if (authError?.message?.includes("already registered")) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw new Error(signInError.message);
        if (!signInData.session) throw new Error("Could not sign in");

        // Check if setup already done
        const { data: existingMember } = await supabase
          .from("org_members")
          .select("id")
          .eq("user_id", signInData.user.id)
          .limit(1)
          .maybeSingle();

        if (existingMember) {
          window.location.href = "/dashboard";
          return;
        }
        // Fall through to run setup for this existing user
      } else if (authError) {
        throw new Error(authError.message);
      }

      if (!authData?.user && !((await supabase.auth.getUser()).data.user)) {
        throw new Error("Registration failed — no user returned");
      }

      // If email confirmation is required, session may be null
      const currentSession = authData?.session ?? (await supabase.auth.getSession()).data.session;
      if (!currentSession) {
        toast.success("Check your email to confirm your account, then sign in.");
        router.push("/login");
        return;
      }

      // 2. Generate blockchain wallet client-side
      const wallet = await generateWallet();

      // 3. Encrypt private key with the user's password before sending
      const encryptedKey = await encryptPrivateKey(wallet.privateKey, password);

      // 4. Call setup-account Edge Function to create org, profile, wallet record
      const { data: setupData, error: setupError } = await supabase.functions.invoke(
        "setup-account",
        {
          body: {
            full_name: fullName,
            org_name: orgName,
            public_address: wallet.address,
            encrypted_private_key: encryptedKey,
          },
        },
      );

      if (setupError) {
        // Try to get real error from response
        const errMsg = typeof setupData === "object" && setupData?.error
          ? setupData.error
          : setupError.message ?? "Account setup failed";
        throw new Error(errMsg);
      }

      toast.success(
        `Account created! Wallet: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
      );
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--al-text)" }}>Create your account</h1>
      <p className="text-sm mb-8" style={{ color: "var(--al-sec)" }}>Start protecting crops with AI consensus</p>

      <form onSubmit={handleRegister} className="space-y-4">
        <Input
          id="fullName"
          label="Full name"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input
          id="orgName"
          label="Organization name"
          placeholder="Green Fields Cooperative"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          required
        />
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="Min 8 characters"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" className="w-full" loading={loading}>
          {loading ? "Creating account & wallet..." : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-xs text-center" style={{ color: "var(--al-muted)" }}>
        A blockchain wallet is automatically generated and secured with your password.
      </p>

      <p className="mt-4 text-center text-sm" style={{ color: "var(--al-sec)" }}>
        Already have an account?{" "}
        <Link href="/login" className="hover:underline" style={{ color: "#8686AC" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
