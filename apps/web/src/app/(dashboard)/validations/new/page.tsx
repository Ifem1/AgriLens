"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, MapPin, Cloud, Globe, Lock } from "lucide-react";
import type { Crop, Policy } from "@/types/database";

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

const labelStyle = {
  fontSize: "0.8125rem",
  fontWeight: 500,
  color: "var(--al-sec)",
  marginBottom: "0.375rem",
  display: "block",
};

const cardStyle = {
  background: "var(--al-card)",
  border: "1px solid var(--al-border)",
  borderRadius: "1rem",
  padding: "1.5rem",
};

export default function NewValidationPage() {
  const router = useRouter();
  const { org } = useOrgStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [crops, setCrops] = useState<Crop[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);

  const [cropId, setCropId] = useState("");
  const [cropStage, setCropStage] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const [{ data: cropsData }, { data: policiesData }] = await Promise.all([
        supabase.from("crops").select("*").order("name"),
        supabase.from("policies").select("*").eq("org_id", org?.id ?? "").eq("is_active", true),
      ]);
      setCrops(cropsData ?? []);
      setPolicies(policiesData ?? []);
    }
    if (org) fetchData();
  }, [org]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function detectLocation() {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast.success("Location detected");
      },
      () => toast.error("Unable to detect location")
    );
  }

  const selectedCrop = crops.find((c) => c.id === cropId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setLoading(true);

    try {
      const supabase = createClient();
      let photoUrl: string | null = null;

      if (photo) {
        const ext = photo.name.split(".").pop();
        const path = `${org.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("farmer-photos")
          .upload(path, photo, { contentType: photo.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("farmer-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase.functions.invoke("submit-validation", {
        body: {
          crop_id: cropId,
          crop_stage: cropStage,
          farmer_notes: notes,
          photo_url: photoUrl,
          policy_id: policyId || null,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          visibility,
          is_paid: visibility === "private",
        },
      });

      if (error) throw error;
      toast.success("Validation submitted! Awaiting consensus.");
      router.push(`/validations/${data.request_id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit validation");
      setLoading(false);
    }
  }

  return (
    <>
      <TopNav title="New Validation" />
      <div className="p-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--al-text)" }}>
          Submit Crop Evidence
        </h2>
        <p className="text-sm mb-8" style={{ color: "var(--al-sec)" }}>
          Upload a photo and describe what you see. AI validators will analyze and recommend treatment.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Visibility selector */}
          <div style={cardStyle}>
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--al-text)" }}>
              Who can see this result?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className="rounded-xl p-4 text-left transition-all"
                style={{
                  background: visibility === "public" ? "rgba(80,80,129,0.2)" : "var(--al-bg)",
                  border: `1px solid ${visibility === "public" ? "#505081" : "var(--al-border)"}`,
                }}
              >
                <Globe className="h-5 w-5 mb-2" style={{ color: visibility === "public" ? "#8686AC" : "var(--al-muted)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--al-text)" }}>Free — Community</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--al-sec)" }}>
                  Result visible to all. Helps other farmers with similar issues.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("private")}
                className="rounded-xl p-4 text-left transition-all"
                style={{
                  background: visibility === "private" ? "rgba(80,80,129,0.2)" : "var(--al-bg)",
                  border: `1px solid ${visibility === "private" ? "#505081" : "var(--al-border)"}`,
                }}
              >
                <Lock className="h-5 w-5 mb-2" style={{ color: visibility === "private" ? "#8686AC" : "var(--al-muted)" }} />
                <p className="text-sm font-semibold" style={{ color: "var(--al-text)" }}>Detailed Plan — Private</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--al-sec)" }}>
                  Result visible only to you and admin. More targeted analysis.
                </p>
              </button>
            </div>
          </div>

          {/* Photo upload */}
          <div style={cardStyle}>
            <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--al-text)" }}>
              <Upload className="h-4 w-4" style={{ color: "var(--al-muted)" }} />
              Crop Photo
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Preview" className="rounded-lg max-h-64 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 rounded-md px-2 py-1 text-xs"
                  style={{ background: "rgba(0,0,0,0.6)", color: "#F4F4FB" }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl py-10 text-center transition-all"
                style={{
                  border: "2px dashed var(--al-border)",
                  background: "var(--al-bg)",
                }}
              >
                <Upload className="h-7 w-7 mx-auto mb-2" style={{ color: "var(--al-muted)" }} />
                <p className="text-sm" style={{ color: "var(--al-sec)" }}>Click to upload or drag a photo</p>
                <p className="text-xs mt-1" style={{ color: "var(--al-muted)" }}>JPG, PNG up to 10MB</p>
              </button>
            )}
          </div>

          {/* Crop details */}
          <div style={cardStyle}>
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--al-text)" }}>Crop Details</p>
            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Crop</label>
                <select
                  value={cropId}
                  onChange={(e) => { setCropId(e.target.value); setCropStage(""); }}
                  required
                  style={fieldStyle}
                >
                  <option value="">Select a crop</option>
                  {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {selectedCrop && (
                <div>
                  <label style={labelStyle}>Growth Stage</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCrop.growth_stages.map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setCropStage(stage)}
                        className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                        style={{
                          background: cropStage === stage ? "rgba(80,80,129,0.3)" : "var(--al-bg)",
                          color: cropStage === stage ? "var(--al-text)" : "var(--al-sec)",
                          border: `1px solid ${cropStage === stage ? "#505081" : "var(--al-border)"}`,
                        }}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Farmer Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              rows={4}
              placeholder="Describe the symptoms: yellowing leaves, wilting since rain, spots on lower leaves..."
              style={{ ...fieldStyle, resize: "none" }}
            />
          </div>

          {/* Location */}
          <div style={cardStyle}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--al-text)" }}>
                <MapPin className="h-4 w-4" style={{ color: "var(--al-muted)" }} />
                Location
              </p>
              <button
                type="button"
                onClick={detectLocation}
                className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: "var(--al-sec)", border: "1px solid var(--al-border)", background: "var(--al-bg)" }}
              >
                Auto-detect
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Latitude</label>
                <input
                  type="number" step="any" placeholder="e.g. 6.5244"
                  value={latitude} onChange={(e) => setLatitude(e.target.value)}
                  required style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Longitude</label>
                <input
                  type="number" step="any" placeholder="e.g. 3.3792"
                  value={longitude} onChange={(e) => setLongitude(e.target.value)}
                  required style={fieldStyle}
                />
              </div>
            </div>
          </div>

          {/* Policy */}
          {policies.length > 0 && (
            <div>
              <label style={labelStyle}>Policy (optional)</label>
              <select value={policyId} onChange={(e) => setPolicyId(e.target.value)} style={fieldStyle}>
                <option value="">No specific policy</option>
                {policies.map((p) => <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>)}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{
              background: "var(--al-accent)",
              color: "#F4F4FB",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <Cloud className="h-4 w-4" />
            {loading ? "Submitting..." : "Submit for Consensus Validation"}
          </button>
        </form>
      </div>
    </>
  );
}
