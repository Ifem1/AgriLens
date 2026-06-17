"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { decryptPrivateKey } from "@/lib/wallet/encrypt";
import { Wallet, Copy, Eye, EyeOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
        <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to settings
        </Link>

        <h2 className="text-lg font-semibold text-white">Blockchain Wallet</h2>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : !publicAddress ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wallet className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No wallet found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Public Address</CardTitle>
                <Button variant="ghost" size="sm" onClick={copyAddress}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent>
                <code className="text-sm text-green-400 font-mono break-all">{publicAddress}</code>
              </CardContent>
            </Card>

            <Card className="border-orange-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-orange-400" />
                  Export Private Key
                </CardTitle>
                <Badge variant="warning">Sensitive</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500 mb-4">
                  Your private key is encrypted with your password. Enter it to reveal the key.
                  Never share your private key with anyone.
                </p>
                {revealedKey ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
                      <code className="text-sm text-orange-300 font-mono break-all">{revealedKey}</code>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => { setRevealedKey(null); setPassword(""); }}>
                      <EyeOff className="h-3.5 w-3.5" /> Hide
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleReveal} className="flex gap-2">
                    <Input
                      id="wallet-password"
                      type="password"
                      placeholder="Enter your account password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="flex-1"
                    />
                    <Button type="submit" variant="outline" loading={revealing}>Reveal</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
