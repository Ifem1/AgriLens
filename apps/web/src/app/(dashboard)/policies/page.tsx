"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FileText, Plus, X } from "lucide-react";
import { formatRelative } from "@/lib/utils/format";
import type { Policy } from "@/types/database";

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
            <h2 className="text-lg font-semibold" style={{ color: "var(--al-text)" }}>Policy Management</h2>
            <p className="text-sm" style={{ color: "var(--al-sec)" }}>Define compliance rules for validation</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? "Cancel" : "Add Policy"}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-xl p-5" style={{ background: "var(--al-card)", border: "1px solid #505081" }}>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--al-sec)" }}>Policy Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Nigeria Pesticide Regulations" style={fieldStyle} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--al-sec)" }}>Region</label>
                <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. West Africa" style={fieldStyle} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--al-sec)" }}>Rules (JSON)</label>
                <textarea
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  required
                  rows={6}
                  placeholder='{ "banned_chemicals": ["paraquat"], "max_dosage_ml_per_hectare": 500 }'
                  style={{ ...fieldStyle, resize: "none", fontFamily: "monospace" }}
                />
              </div>
              <Button type="submit" loading={creating}>Create Policy</Button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : policies.length === 0 ? (
          <div className="rounded-xl py-16 text-center" style={{ background: "var(--al-card)", border: "1px solid var(--al-border)" }}>
            <FileText className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--al-muted)" }} />
            <p className="text-sm" style={{ color: "var(--al-sec)" }}>No policies defined yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {policies.map((p) => (
              <div key={p.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: "var(--al-card)", border: "1px solid var(--al-border)" }}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: "var(--al-text)" }}>{p.name}</p>
                    <Badge variant="info">v{p.version}</Badge>
                  </div>
                  {p.region && <p className="text-xs mt-0.5" style={{ color: "var(--al-sec)" }}>{p.region}</p>}
                  <p className="text-xs mt-1" style={{ color: "var(--al-muted)" }}>{formatRelative(p.created_at)}</p>
                </div>
                <Badge variant={p.is_active ? "success" : "neutral"}>{p.is_active ? "Active" : "Inactive"}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
