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
import { Bot, Plus, X } from "lucide-react";
import { formatRelative } from "@/lib/utils/format";
import type { Agent } from "@/types/database";

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
            <h2 className="text-lg font-semibold text-white">AI Agents</h2>
            <p className="text-sm text-zinc-500">Register and manage agents that submit validation requests</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showForm ? "Cancel" : "Register Agent"}
          </Button>
        </div>

        {showForm && (
          <Card className="border-green-500/20">
            <CardContent className="pt-6">
              <form onSubmit={handleCreate} className="space-y-4">
                <Input id="agent-name" label="Agent Name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Field Scanner Bot" />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-400">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="What does this agent do?"
                    className="w-full rounded-lg border border-[#1a2e1a] bg-[#0a0f0a] px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-green-500/60 focus:outline-none resize-none"
                  />
                </div>
                <Button type="submit" loading={creating}>Register Agent</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : agents.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bot className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No agents registered yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {agents.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{a.name}</p>
                    {a.description && <p className="text-xs text-zinc-500 mt-0.5">{a.description}</p>}
                    <p className="text-xs text-zinc-700 mt-1">{formatRelative(a.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.is_active ? "success" : "neutral"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                    {a.on_chain_id && <code className="text-xs text-zinc-600 font-mono">{a.on_chain_id.slice(0, 10)}...</code>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
