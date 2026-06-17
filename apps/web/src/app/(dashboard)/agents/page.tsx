"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bot, Plus, X } from "lucide-react";
import { formatRelative } from "@/lib/utils/format";
import type { Agent } from "@/types/database";

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

export default function AgentsPage() {
  const { org } = useOrgStore();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!org) return;
    async function fetch() {
      const supabase = createClient();
      const { data } = await supabase
        .from("agents")
        .select("*")
        .eq("org_id", org!.id)
        .order("created_at", { ascending: false });
      setAgents(data ?? []);
      setLoading(false);
    }
    fetch();
  }, [org]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setCreating(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("agents")
      .insert({ org_id: org.id, name, description, created_by: user?.id })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      setAgents((prev) => [data, ...prev]);
      setShowForm(false);
      setName("");
      setDescription("");
      toast.success("Agent registered");
    }
    setCreating(false);
  }

  return (
    <>
      <TopNav title="Agents" />
      <div className="p-6 space-y-4 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--al-text)" }}>AI Agents</h2>
            <p className="text-sm" style={{ color: "var(--al-sec)" }}>Register and manage agents that submit validation requests</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? "Cancel" : "Register Agent"}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-xl p-5" style={{ background: "var(--al-card)", border: "1px solid #505081" }}>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--al-sec)" }}>Agent Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Field Scanner Bot" style={fieldStyle} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "var(--al-sec)" }}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What does this agent do?"
                  style={{ ...fieldStyle, resize: "none" }}
                />
              </div>
              <Button type="submit" loading={creating}>Register Agent</Button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : agents.length === 0 ? (
          <div className="rounded-xl py-16 text-center" style={{ background: "var(--al-card)", border: "1px solid var(--al-border)" }}>
            <Bot className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--al-muted)" }} />
            <p className="text-sm" style={{ color: "var(--al-sec)" }}>No agents registered yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((a) => (
              <div key={a.id} className="rounded-xl p-4 flex items-center justify-between" style={{ background: "var(--al-card)", border: "1px solid var(--al-border)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--al-text)" }}>{a.name}</p>
                  {a.description && <p className="text-xs mt-0.5" style={{ color: "var(--al-sec)" }}>{a.description}</p>}
                  <p className="text-xs mt-1" style={{ color: "var(--al-muted)" }}>{formatRelative(a.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.is_active ? "success" : "neutral"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                  {a.on_chain_id && <code className="text-xs font-mono" style={{ color: "var(--al-muted)" }}>{a.on_chain_id.slice(0, 10)}...</code>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
