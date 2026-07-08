export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type PlanTier = "free" | "starter" | "pro" | "enterprise";
export type ValidationStatus = "pending" | "validating" | "approved" | "failed" | "escalated" | "regenerating";
export type ConsensusOutcome = "approved" | "rejected" | "needs_expert_review" | "low_confidence" | "escalated" | "policy_blocked" | "insufficient_evidence";
export type OrgRole = "owner" | "admin" | "member" | "viewer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  region: string | null;
  plan_tier: PlanTier;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  org_id: string;
  plan_tier: PlanTier;
  status: "active" | "past_due" | "cancelled";
  validations_used: number;
  validations_limit: number;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  joined_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  public_address: string;
  encrypted_private_key: string;
  created_at: string;
}

export interface Crop {
  id: string;
  name: string;
  scientific_name: string | null;
  growth_stages: string[];
  created_at: string;
}

export interface Policy {
  id: string;
  org_id: string;
  name: string;
  version: number;
  region: string | null;
  rules: Json;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Agent {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  on_chain_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ValidationRequest {
  id: string;
  org_id: string;
  agent_id: string | null;
  submitted_by: string | null;
  crop_id: string | null;
  crop_stage: string;
  photo_url: string | null;
  farmer_notes: string | null;
  weather_snapshot: Json | null;
  farm_location: string | null;
  public_evidence_url: string | null;
  photo_evidence_url: string | null;
  weather_source_url: string | null;
  agro_source_url: string | null;
  proposed_treatment: string | null;
  pesticide_name: string | null;
  pesticide_guidance_url: string | null;
  policy_id: string | null;
  status: ValidationStatus;
  created_at: string;
}

export interface ValidationResult {
  id: string;
  request_id: string;
  consensus_outcome: ConsensusOutcome;
  recommended_treatment: string;
  confidence_score: number | null;
  risk_score: number | null;
  evidence_checked?: boolean | null;
  weather_consistent?: boolean | null;
  photo_support?: string | null;
  treatment_safety?: string | null;
  verdict?: string | null;
  confidence_band?: string | null;
  validator_votes: Json;
  reasoning: string | null;
  on_chain_tx_hash: string | null;
  created_at: string;
}

export interface ValidatorVote {
  validator_id: string;
  vote: string;
  reasoning: string;
  confidence: number;
  evidence_core?: {
    evidence_checked?: boolean;
    weather_consistent?: boolean;
    photo_support?: string;
    treatment_safety?: string;
    confidence_band?: string;
  };
}

export interface WeatherSnapshot {
  temperature: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  rain_probability: number;
  location: string;
  fetched_at: string;
}

export interface Escalation {
  id: string;
  request_id: string;
  assigned_to: string | null;
  reason: string | null;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  org_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  metadata: Json | null;
  created_at: string;
}
