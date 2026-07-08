"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useOrgStore } from "@/stores/orgStore";
import { TopNav } from "@/components/layout/TopNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, MapPin, Cloud, Globe, Lock, KeyRound, Link as LinkIcon, ShieldCheck } from "lucide-react";
import { decryptPrivateKey } from "@/lib/wallet/encrypt";
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

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);

  const [cropName, setCropName] = useState("");
  const [cropStage, setCropStage] = useState("");
  const [notes, setNotes] = useState("");
  const [farmLocation, setFarmLocation] = useState("");
  const [publicEvidenceUrl, setPublicEvidenceUrl] = useState("");
  const [photoEvidenceUrl, setPhotoEvidenceUrl] = useState("");
  const [weatherSourceUrl, setWeatherSourceUrl] = useState("");
  const [agroSourceUrl, setAgroSourceUrl] = useState("");
  const [proposedTreatment, setProposedTreatment] = useState("");
  const [pesticideName, setPesticideName] = useState("");
  const [pesticideGuidanceUrl, setPesticideGuidanceUrl] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [policyId, setPolicyId] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [password, setPassword] = useState("");

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: policiesData } = await supabase
        .from("policies").select("*").eq("org_id", org?.id ?? "").eq("is_active", true);
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
        setFarmLocation(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
        toast.success("Location detected");
      },
      () => toast.error("Unable to detect location")
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();

      // Get org if not already loaded
      let orgId = org?.id;
      if (!orgId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { data: membership } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();
        if (!membership) throw new Error("No organization found. Please complete account setup.");
        orgId = membership.org_id;
      }

      // Decrypt wallet private key for on-chain signing
      let signingKey: string | null = null;
      if (password) {
        try {
          const { data: walletRow } = await supabase
            .from("wallets")
            .select("encrypted_private_key")
            .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
            .single();
          if (walletRow?.encrypted_private_key) {
            signingKey = await decryptPrivateKey(walletRow.encrypted_private_key, password);
          }
        } catch {
          toast.error("Wrong password - validation will use the configured GenLayer signer if available.");
        }
      }

      let photoUrl: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop() ?? "jpg";
        const path = `${orgId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("farmer-photos")
          .upload(path, photo, { contentType: photo.type });
        if (uploadErr) throw new Error("Photo upload failed: " + uploadErr.message);
        const { data: urlData } = supabase.storage.from("farmer-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop_name: cropName,
          crop_stage: cropStage,
          farmer_notes: notes,
          photo_url: photoUrl,
          farm_location: farmLocation || `${latitude},${longitude}`,
          public_evidence_url: publicEvidenceUrl || null,
          photo_evidence_url: photoEvidenceUrl || photoUrl,
          weather_source_url: weatherSourceUrl || null,
          agro_source_url: agroSourceUrl || null,
          proposed_treatment: proposedTreatment || null,
          pesticide_name: pesticideName || null,
          pesticide_guidance_url: pesticideGuidanceUrl || null,
          signing_key: signingKey,
          policy_id: policyId || null,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          visibility,
          is_paid: visibility === "private",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
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
          AgriLens does not only rely on user descriptions. Evidence fetched by GenLayer validators is used to assess crop condition, weather relevance, and treatment safety.
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
                <input
                  type="text"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  required
                  placeholder="e.g. Tomato, Cassava, Maize, Rice..."
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Growth Stage (optional)</label>
                <input
                  type="text"
                  value={cropStage}
                  onChange={(e) => setCropStage(e.target.value)}
                  placeholder="e.g. Seedling, Vegetative, Flowering, Fruiting..."
                  style={fieldStyle}
                />
              </div>
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

          {/* Public evidence */}
          <div style={cardStyle}>
            <p className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--al-text)" }}>
              <ShieldCheck className="h-4 w-4" style={{ color: "var(--al-muted)" }} />
              Evidence fetched by GenLayer validators
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--al-sec)" }}>
              Add public sources validators can fetch. Private or inaccessible links are marked as weak, unavailable, or not checked.
            </p>
            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Public evidence URL (optional)</label>
                <input
                  type="url"
                  value={publicEvidenceUrl}
                  onChange={(e) => setPublicEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Photo/evidence URL (optional)</label>
                <input
                  type="url"
                  value={photoEvidenceUrl}
                  onChange={(e) => setPhotoEvidenceUrl(e.target.value)}
                  placeholder="Public photo page, caption, metadata, or evidence page"
                  style={fieldStyle}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Weather source URL (optional)</label>
                  <input
                    type="url"
                    value={weatherSourceUrl}
                    onChange={(e) => setWeatherSourceUrl(e.target.value)}
                    placeholder="https://..."
                    style={fieldStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Agro/public data URL (optional)</label>
                  <input
                    type="url"
                    value={agroSourceUrl}
                    onChange={(e) => setAgroSourceUrl(e.target.value)}
                    placeholder="https://..."
                    style={fieldStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Treatment safety */}
          <div style={cardStyle}>
            <p className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--al-text)" }}>
              <LinkIcon className="h-4 w-4" style={{ color: "var(--al-muted)" }} />
              Treatment Safety Check
            </p>
            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Treatment or pesticide name (optional)</label>
                <input
                  type="text"
                  value={proposedTreatment}
                  onChange={(e) => setProposedTreatment(e.target.value)}
                  placeholder="e.g. copper fungicide, neem oil, mancozeb..."
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Pesticide name if applicable (optional)</label>
                <input
                  type="text"
                  value={pesticideName}
                  onChange={(e) => setPesticideName(e.target.value)}
                  placeholder="Active ingredient or product name"
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Pesticide/agricultural guidance URL (optional)</label>
                <input
                  type="url"
                  value={pesticideGuidanceUrl}
                  onChange={(e) => setPesticideGuidanceUrl(e.target.value)}
                  placeholder="Public label, extension guide, or regulatory page"
                  style={fieldStyle}
                />
              </div>
            </div>
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
            <div className="mb-4">
              <label style={labelStyle}>Farm Location</label>
              <input
                type="text"
                value={farmLocation}
                onChange={(e) => setFarmLocation(e.target.value)}
                placeholder="Farm name, village/region, or coordinates"
                style={fieldStyle}
              />
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

          {/* Wallet password for on-chain signing */}
          <div style={cardStyle}>
            <p className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--al-text)" }}>
              <KeyRound className="h-4 w-4" style={{ color: "var(--al-muted)" }} />
              On-Chain Signing (optional)
            </p>
            <p className="text-xs mb-3" style={{ color: "var(--al-sec)" }}>
              Enter your account password to sign this validation on GenLayer. Leave blank to use the configured server signer.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Account password"
              style={fieldStyle}
            />
          </div>

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
            {loading ? "Submitting..." : "Submit for Evidence Validation"}
          </button>
        </form>
      </div>
    </>
  );
}
