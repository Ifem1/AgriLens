"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { TopNav } from "@/components/layout/TopNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { decryptPrivateKey } from "@/lib/wallet/encrypt";
import { Wallet, Copy, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

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

const cardStyle = {
  background: "var(--al-card)",
  border: "1px solid var(--al-border)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
};

export default function WalletPage() {
  const { user } = useAuthStore();
  const [publicAddress, setPublicAddress] = useState<string | null>(null);
  const [encryptedKey, setEncryptedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("wallets")
        .select("public_address, encrypted_private_key")
        .eq("user_id", user!.id)
        .single();
      if (data) {
        setPublicAddress(data.public_address);
        setEncryptedKey(data.encrypted_private_key);
      }
      setLoading(false);
    }
    fetch();
  }, [user]);

  async function handleReveal(e: React.FormEvent) {
    e.preventDefault();
    if (!encryptedKey) return;
    setRevealing(true);
    try {
      const key = await decryptPrivateKey(encryptedKey, password);
      setRevealedKey(key);
    } catch {
      toast.error("Wrong password");
    }
    setRevealing(false);
  }

  function copyAddress() {
    if (publicAddress) {
      navigator.clipboard.writeText(publicAddress);
      toast.success("Address copied");
    }
  }

  return (
    <>
      <TopNav title="Wallet" />
      <div className="p-6 space-y-6 max-w-2xl">
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm transition-colors" style={{ color: "var(--al-sec)" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to settings
        </Link>

        <h2 className="text-lg font-semibold" style={{ color: "var(--al-text)" }}>Blockchain Wallet</h2>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : !publicAddress ? (
          <div className="rounded-xl py-12 text-center" style={{ background: "var(--al-card)", border: "1px solid var(--al-border)" }}>
            <Wallet className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--al-muted)" }} />
            <p className="text-sm" style={{ color: "var(--al-sec)" }}>No wallet found</p>
          </div>
        ) : (
          <>
            <div style={cardStyle}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: "var(--al-text)" }}>Public Address</p>
                <Button variant="ghost" size="sm" onClick={copyAddress}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <code className="text-sm font-mono break-all" style={{ color: "#8686AC" }}>{publicAddress}</code>
            </div>

            <div style={{ ...cardStyle, border: "1px solid #505081" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--al-text)" }}>
                  <Eye className="h-4 w-4" style={{ color: "#fb923c" }} />
                  Export Private Key
                </p>
                <Badge variant="warning">Sensitive</Badge>
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--al-sec)" }}>
                Your private key is encrypted with your password. Enter it to reveal the key.
                Never share your private key with anyone.
              </p>
              {revealedKey ? (
                <div className="space-y-3">
                  <div
                    className="rounded-lg p-3"
                    style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)" }}
                  >
                    <code className="text-sm font-mono break-all" style={{ color: "#fb923c" }}>{revealedKey}</code>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => { setRevealedKey(null); setPassword(""); }}>
                    <EyeOff className="h-3.5 w-3.5" /> Hide
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleReveal} className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="flex-1"
                    style={fieldStyle}
                  />
                  <Button type="submit" variant="outline" loading={revealing}>Reveal</Button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
