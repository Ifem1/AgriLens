"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FileText, Plus, X } from "lucide-react";
import { formatRelative } from "@/lib/utils/format";
import type { Policy } from "@/types/database";

export default function PoliciesPage() {
  const { org } = useOrgStore();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [rules, setRules] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!org) return;
    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("policies")
        .select("*")
        .eq("org_id", org!.id)
        .order("created_at", { ascending: false });
      setPolicies(data ?? []);
      setLoading(false);
    }
    fetch();
  }, [org]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setCreating(true);

    let parsedRules: any;
    try {
      parsedRules = JSON.parse(rules);
    } catch {
      toast.error("Rules must be valid JSON");
      setCreating(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("policies")
      .insert({ org_id: org.id, name, region: region || null, rules: parsedRules, created_by: user?.id })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      setPolicies((prev) => [data, ...prev]);
      setShowForm(false);
      setName("");
      setRegion("");
      setRules("");
      toast.success("Policy created");
    }
    setCreating(false);
  }

  return (
    <>
      <TopNav title="Policies" />
      <div className="p-6 space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Policy Management</h2>
            <p className="text-sm text-zinc-500">Define compliance rules for validation</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? "Cancel" : "Add Policy"}
          </Button>
        </div>

        {showForm && (
          <Card className="border-green-500/20">
            <CardContent className="pt-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <Input id="policy-name" label="Policy Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Nigeria Pesticide Regulations" />
                <Input id="policy-region" label="Region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. West Africa" />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-400">Rules (JSON)</label>
                  <textarea
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                    required
                    rows={6}
                    placeholder='{ "banned_chemicals": ["paraquat"], "max_dosage_ml_per_hectare": 500 }'
                    className="w-full rounded-lg border border-[#1a2e1a] bg-[#0a0f0a] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-green-500/60 focus:outline-none resize-none font-mono"
                  />
                </div>
                <Button type="submit" loading={creating}>Create Policy</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : policies.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No policies defined yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {policies.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      <Badge variant="info">v{p.version}</Badge>
                    </div>
                    {p.region && <p className="text-xs text-zinc-500 mt-0.5">{p.region}</p>}
                    <p className="text-xs text-zinc-700 mt-1">{formatRelative(p.created_at)}</p>
                  </div>
                  <Badge variant={p.is_active ? "success" : "neutral"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
