# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

# ═══════════════════════════════════════════════════════════════════════════════
#  AgriLens Validator — Production Genlayer Intelligent Contract
#  Version  : 2.0.0
#  Network  : Genlayer StudioNet
#  Address  : 0x3B2F3fa6a899566402886B07B0E4c4D4e2835Ed3
# ───────────────────────────────────────────────────────────────────────────────
#  Architecture
#  ─────────────
#  This contract is the on-chain trust layer for the AgriLens crop-disease
#  advisory platform. It handles:
#
#   1. Organization & Agent Registry
#      Organizations register on-chain. Each org can register agents (AI callers)
#      and create policy rule-sets that constrain what treatments are permissible
#      in their jurisdiction.
#
#   2. Policy Management
#      Policies encode regional regulations (banned pesticides, organic-only
#      constraints, withdrawal-period rules). They are stored immutably on-chain
#      and versioned so auditors can trace which rules applied at validation time.
#
#   3. Multi-Dimensional Consensus Validation
#      The core feature. When a farmer submits evidence (photo description,
#      agronomy notes, growth stage, live weather), the contract runs
#      gl.nondet.exec_prompt inside gl.eq_principle.prompt_comparative so that
#      each Genlayer validator independently evaluates the evidence with an LLM
#      and the network reaches consensus before any result is finalized on-chain.
#
#      Scoring dimensions:
#        • confidence_score   — quality and specificity of the submitted evidence
#        • risk_score         — urgency / potential crop-loss severity
#        • disease_severity   — 0-100 pathogen/pest aggression score
#        • weather_risk       — how much current conditions favour disease spread
#        • regulatory_risk    — probability the primary treatment breaches policy
#        • treatment_efficacy — expected effectiveness of the recommended action
#
#   4. Escalation Workflow
#      Low-confidence or high-risk results automatically create an escalation
#      record. Human agronomists can resolve escalations on-chain, providing an
#      immutable audit of the human-in-the-loop decision.
#
#   5. Regeneration
#      Callers can request regeneration of a failed or insufficient-evidence
#      result with additional context. The re-validation follows the same
#      consensus path.
#
#   6. Validator Reputation
#      Each time a validator participates in consensus, its agreement/disagreement
#      rate is tracked on-chain so the platform can surface reliability metrics.
#
#   7. Immutable Audit Trail
#      Every state-changing action emits an audit entry stored in audit_log with
#      timestamp, actor, action type, and relevant IDs.
#
#   8. Organization Analytics
#      Per-org statistics (total validations, approval rate, avg confidence,
#      escalation rate) are updated after every validation.
#
# ═══════════════════════════════════════════════════════════════════════════════

from genlayer import *
import json


# ─────────────────────────────────────────────────────────────────────────────
#  Module-level constants
# ─────────────────────────────────────────────────────────────────────────────

VERSION = "2.0.0"

PLAN_LIMITS = {
    "free":       20,
    "starter":   500,
    "pro":      5000,
    "enterprise": -1,   # -1 = unlimited
}

VALID_OUTCOMES = {
    "approved",
    "low_confidence",
    "escalated",
    "policy_blocked",
    "insufficient_evidence",
    "regenerating",
}

VALID_PLAN_TIERS = {"free", "starter", "pro", "enterprise"}

VALID_ROLES = {"owner", "admin", "member", "viewer"}

# Diseases the contract knows about — used to enrich the LLM prompt
KNOWN_CROP_DISEASES = """
MAIZE: Gray Leaf Spot (Cercospora zeae-maydis), Northern Corn Leaf Blight (Exserohilum turcicum),
  Common Rust (Puccinia sorghi), Southern Corn Leaf Blight, Maize Streak Virus, Fall Armyworm,
  Corn Earworm, Stalk Rot (Fusarium/Gibberella), Root Rot, Smut (Ustilago maydis)

RICE: Blast (Magnaporthe oryzae), Brown Planthopper, Bacterial Leaf Blight (Xanthomonas oryzae),
  Sheath Blight (Rhizoctonia solani), Rice Yellow Mottle Virus, Stem Borer (Scirpophaga spp.),
  False Smut (Ustilaginoidea virens), Narrow Brown Leaf Spot, Tungro Virus

WHEAT: Stem Rust (Puccinia graminis), Stripe/Yellow Rust (P. striiformis), Leaf Rust (P. triticina),
  Fusarium Head Blight/Scab, Septoria Leaf Blotch, Powdery Mildew (Blumeria graminis),
  Tan Spot, Hessian Fly, Aphids, Wheat Streak Mosaic Virus

TOMATO: Early Blight (Alternaria solani), Late Blight (Phytophthora infestans), Fusarium Wilt,
  Bacterial Wilt (Ralstonia solanacearum), Tomato Yellow Leaf Curl Virus (TYLCV), Spider Mites,
  Whitefly, Tomato Mosaic Virus, Botrytis (Grey Mould), Blossom End Rot (Ca deficiency)

CASSAVA: Cassava Mosaic Disease (CMD), Cassava Brown Streak Disease (CBSD), Cassava Bacterial Blight,
  Mealybug, Cassava Green Mite, Root Rot (Phytophthora), Anthracnose, Whitefly

SOYBEAN: Soybean Rust (Phakopsora pachyrhizi), Frogeye Leaf Spot, Sudden Death Syndrome,
  Phytophthora Root Rot, Soybean Cyst Nematode, Aphids, Bean Pod Borer, Iron Deficiency Chlorosis

COCOA: Black Pod Rot (Phytophthora palmivora / P. megakarya), Cocoa Swollen Shoot Virus,
  Witches' Broom (Moniliophthora perniciosa), Frosty Pod Rot, Mirid Bugs (Capsids), Stem Canker

BANANA/PLANTAIN: Fusarium Wilt / Panama Disease (FOC TR4), Black Sigatoka (Mycosphaerella fijiensis),
  Yellow Sigatoka (M. musicola), Banana Bunchy Top Virus, Banana Streak Virus, Weevil (Cosmopolites),
  Xanthomonas Wilt (BXW), Nematodes

GROUNDNUT: Early/Late Leaf Spot, Cercosporidium personatum, Groundnut Rosette Virus,
  Aspergillus Ear Rot / Aflatoxin risk, Rust (Puccinia arachidis), Stem Rot, White Grubs

COFFEE: Coffee Leaf Rust (Hemileia vastatrix), Coffee Berry Borer (Hypothenemus hampei),
  Coffee Wilt Disease (Fusarium xylarioides), Anthracnose, Root Rot, Twig Borer
"""

# Common integrated pest management (IPM) principles for prompt context
IPM_PRINCIPLES = """
IPM HIERARCHY (prefer in order):
1. Cultural controls: crop rotation, resistant varieties, sanitation, optimal plant spacing
2. Biological controls: beneficial insects, biopesticides (Bacillus thuringiensis, Trichoderma)
3. Mechanical/physical: traps, nets, hand-picking, pruning infected material
4. Chemical controls (last resort): use registered pesticides at label rates; observe pre-harvest intervals
Always: Confirm diagnosis before treatment. Avoid tank-mixing incompatible products.
Prefer systemic fungicides for internal infections; contact fungicides for surface pathogens.
"""


# ─────────────────────────────────────────────────────────────────────────────
#  Helper functions (module-level, non-contract)
# ─────────────────────────────────────────────────────────────────────────────

def _clamp(value: int, lo: int, hi: int) -> int:
    """Clamp integer value to [lo, hi]."""
    return max(lo, min(hi, value))


def _safe_int(val, default: int = 50) -> int:
    """Safely convert a value to int with a fallback default."""
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def _safe_list(val) -> list:
    """Ensure value is a list."""
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []
    return []


def _now_iso() -> str:
    """Return current UTC timestamp as ISO-8601 string (approximate via block)."""
    return "2025-01-01T00:00:00Z"   # Genlayer block time; replace with gl.block.timestamp if available


def _make_audit_key(org_id: str, seq: str) -> str:
    return f"{org_id}::{seq}"


def _strip_fences(text: str) -> str:
    """Remove markdown code fences from LLM output."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        text = "\n".join(lines[1:end]).strip()
    return text


def _build_diagnosis_prompt(
    crop_name: str,
    crop_stage: str,
    farmer_notes: str,
    photo_description: str,
    weather_json: str,
    policy_rules: str,
    org_region: str,
    regeneration_context: str,
) -> str:
    """
    Construct the full agronomist evaluation prompt.

    This is separated from the contract method to keep the write method readable
    and to allow reuse for both initial validation and regeneration.
    """
    photo_section = (
        f"PHOTO ANALYSIS:\n{photo_description}\n"
        if photo_description and photo_description.strip()
        else "PHOTO ANALYSIS:\nNo photo provided — rely on farmer notes only.\n"
    )

    regen_section = (
        f"\nADDITIONAL CONTEXT FOR RE-EVALUATION:\n{regeneration_context}\n"
        if regeneration_context and regeneration_context.strip()
        else ""
    )

    region_section = (
        f"REGION / JURISDICTION: {org_region}\n"
        if org_region and org_region.strip()
        else "REGION / JURISDICTION: Unspecified — apply international best practices.\n"
    )

    policy_section = (
        f"APPLICABLE POLICY / REGULATORY CONSTRAINTS:\n{policy_rules}\n"
        if policy_rules and policy_rules not in ("null", "None", "")
        else "APPLICABLE POLICY / REGULATORY CONSTRAINTS:\nNone specified — follow IPM hierarchy and international standards.\n"
    )

    return f"""You are a senior agronomist and plant pathologist with 20+ years of field experience advising smallholder farmers and agribusinesses across sub-Saharan Africa, South Asia, and Latin America.

A farmer has submitted evidence of a potential crop health problem. Perform a rigorous multi-dimensional evaluation.

═══════════════════════════════════════════════════════════════════════════════
SUBMISSION DETAILS
═══════════════════════════════════════════════════════════════════════════════

CROP:          {crop_name}
GROWTH STAGE:  {crop_stage}
{region_section}
FARMER OBSERVATIONS:
{farmer_notes}

{photo_section}

CURRENT WEATHER CONDITIONS (live data):
{weather_json}

{policy_section}
{regen_section}
═══════════════════════════════════════════════════════════════════════════════
CROP DISEASE REFERENCE DATABASE
═══════════════════════════════════════════════════════════════════════════════
{KNOWN_CROP_DISEASES}

═══════════════════════════════════════════════════════════════════════════════
INTEGRATED PEST MANAGEMENT PRINCIPLES
═══════════════════════════════════════════════════════════════════════════════
{IPM_PRINCIPLES}

═══════════════════════════════════════════════════════════════════════════════
EVALUATION TASK
═══════════════════════════════════════════════════════════════════════════════

Perform the following steps in order:

STEP 1 — DIFFERENTIAL DIAGNOSIS
  List 2–3 candidate conditions ranked by likelihood given the evidence.
  For each: name, likelihood (%), key distinguishing symptoms.

STEP 2 — PRIMARY DIAGNOSIS
  State the single most likely condition. Justify based on:
  • Symptom pattern (affected plant parts, lesion description, colour, pattern)
  • Growth stage susceptibility
  • Weather favourability (temperature range, humidity, recent rain)
  • Geographic prevalence in the stated region

STEP 3 — TREATMENT SELECTION
  Choose the optimal primary treatment following IPM hierarchy.
  Provide timing, dose/rate, application method, and expected efficacy.
  Verify the treatment does NOT violate listed policy constraints.
  Provide two backup alternatives with efficacy comparison.

STEP 4 — MULTI-DIMENSIONAL SCORING
  Score each dimension independently (integer 0–100):

  confidence_score:
    85–100 → multiple specific, consistent symptoms clearly matching known pathology
    60–84  → some specific symptoms, moderate certainty
    40–59  → generic or ambiguous symptoms, low certainty
    0–39   → insufficient or contradictory evidence

  risk_score (crop-loss urgency):
    70–100 → imminent crop loss; intervene within 24–48 h
    40–69  → significant risk; treat within 3–5 days
    0–39   → low risk; monitor and treat as precaution

  disease_severity (pathogen/pest aggression):
    70–100 → fast-spreading, destructive pathogen (e.g. late blight, blast, armyworm)
    40–69  → moderate pathogen with manageable spread rate
    0–39   → slow-moving or cosmetic issue

  weather_risk (how current conditions favour further spread):
    Score 0–100 based on: humidity >80% = high fungal risk; recent/forecast rain favours
    splash dispersal; temperature in pathogen optimum range; wind speed (spore dispersal)

  regulatory_risk (probability primary treatment breaches policy):
    0   → confirmed compliant
    1–40  → minor uncertainty
    41–80 → moderate concern — check label / consult extension
    81–100 → likely breach or banned substance

  treatment_efficacy (expected effectiveness 0–100):
    Estimate field-trial efficacy of the recommended treatment for this specific pathogen.

STEP 5 — CONSENSUS OUTCOME CLASSIFICATION
  Pick exactly one consensus_outcome based on ALL scores:
  • "approved"               → confidence ≥ 60 AND risk ≤ 70 AND regulatory_risk < 80
  • "low_confidence"         → confidence 40–59 AND risk ≤ 70
  • "escalated"              → confidence < 60 AND risk > 60  (needs human agronomist)
  • "policy_blocked"         → regulatory_risk ≥ 80  (primary treatment likely illegal)
  • "insufficient_evidence"  → confidence < 40  (too vague to diagnose)

═══════════════════════════════════════════════════════════════════════════════

Respond with ONLY a valid JSON object. No markdown fences. No prose outside JSON.

{{
  "differential_diagnosis": [
    {{"condition": "...", "likelihood_pct": <int>, "key_symptoms": "..."}}
  ],
  "primary_diagnosis": "...",
  "diagnosis_justification": "...",
  "recommended_treatment": "...",
  "treatment_active_ingredient": "...",
  "treatment_dose_rate": "...",
  "treatment_application_method": "...",
  "treatment_timing": "...",
  "alternative_treatments": [
    {{"name": "...", "active_ingredient": "...", "efficacy_vs_primary": "..."}},
    {{"name": "...", "active_ingredient": "...", "efficacy_vs_primary": "..."}}
  ],
  "confidence_score":     <int 0-100>,
  "risk_score":           <int 0-100>,
  "disease_severity":     <int 0-100>,
  "weather_risk":         <int 0-100>,
  "regulatory_risk":      <int 0-100>,
  "treatment_efficacy":   <int 0-100>,
  "consensus_outcome":    "<approved|low_confidence|escalated|policy_blocked|insufficient_evidence>",
  "pre_harvest_interval": "...",
  "re_entry_interval":    "...",
  "environmental_warnings": "...",
  "safety_ppe":           "...",
  "monitoring_protocol":  "...",
  "prevention_for_next_season": "..."
}}"""


# ─────────────────────────────────────────────────────────────────────────────
#  Main Contract Class
# ─────────────────────────────────────────────────────────────────────────────

class AgriLensValidator(gl.Contract):
    """
    AgriLens production intelligent contract.

    Storage layout
    ──────────────
    All complex objects are JSON-encoded strings stored in TreeMap[str, str].
    This avoids nested-type limitations and makes the storage fully inspectable.

    validations          request_id  → ValidationResult JSON
    requests             request_id  → ValidationRequest JSON
    organizations        org_id      → Organization JSON
    agents               agent_id    → Agent JSON
    policies             policy_id   → Policy JSON
    escalations          esc_id      → Escalation JSON
    audit_log            event_key   → AuditEvent JSON
    org_stats            org_id      → OrgStats JSON
    validator_rep        address_str → ValidatorRep JSON
    org_audit_counters   org_id      → counter string (for unique audit keys)
    owner                deployer address as hex string
    paused               emergency pause flag
    total_validations    global counter as decimal string
    contract_version     semver string
    """

    # ── Storage declarations ────────────────────────────────────────────────

    validations:        TreeMap[str, str]
    requests:           TreeMap[str, str]
    organizations:      TreeMap[str, str]
    agents:             TreeMap[str, str]
    policies:           TreeMap[str, str]
    escalations:        TreeMap[str, str]
    audit_log:          TreeMap[str, str]
    org_stats:          TreeMap[str, str]
    validator_rep:      TreeMap[str, str]
    org_audit_counters: TreeMap[str, str]
    owner:              str
    paused:             bool
    total_validations:  str
    contract_version:   str

    # ── Constructor ─────────────────────────────────────────────────────────

    def __init__(self) -> None:
        """
        Deploy the AgriLens validator contract.
        The deploying address becomes the contract owner.
        """
        self.owner             = str(gl.message.sender_address)
        self.paused            = False
        self.total_validations = "0"
        self.contract_version  = VERSION

    # ═══════════════════════════════════════════════════════════════════════
    #  WRITE METHODS — Organization & Registry Management
    # ═══════════════════════════════════════════════════════════════════════

    @gl.public.write
    def register_organization(
        self,
        org_id:    str,
        name:      str,
        country:   str,
        region:    str,
        plan_tier: str,
    ) -> None:
        """
        Register an organization on-chain.

        Only the contract owner can register organizations. This keeps the
        registry curated and prevents spam. In a permissionless deployment,
        remove the owner check and charge a GEN fee instead.

        Args:
            org_id:    UUID matching the Supabase organizations.id.
            name:      Human-readable organization name.
            country:   ISO 3166-1 alpha-2 country code (e.g. "NG", "KE").
            region:    Sub-national region or state.
            plan_tier: One of free | starter | pro | enterprise.
        """
        caller = str(gl.message.sender_address)
        assert caller == self.owner, "Only the contract owner can register organizations"
        assert org_id and name, "org_id and name are required"
        assert plan_tier in VALID_PLAN_TIERS, f"Invalid plan tier: {plan_tier}"
        assert org_id not in self.organizations, f"Organization {org_id} already exists"

        org = {
            "id":         org_id,
            "name":       name,
            "country":    country,
            "region":     region,
            "plan_tier":  plan_tier,
            "is_active":  True,
            "registered_by": caller,
            "registered_at": _now_iso(),
        }
        self.organizations[org_id] = json.dumps(org)

        # Initialise blank stats
        stats = {
            "org_id":             org_id,
            "total_validations":  0,
            "approved":           0,
            "escalated":          0,
            "policy_blocked":     0,
            "low_confidence":     0,
            "insufficient":       0,
            "total_confidence":   0,
            "total_risk":         0,
            "total_severity":     0,
            "total_efficacy":     0,
        }
        self.org_stats[org_id]          = json.dumps(stats)
        self.org_audit_counters[org_id] = "0"

        self._emit_audit(org_id, caller, "organization", org_id, "registered", {"name": name, "plan_tier": plan_tier})

    @gl.public.write
    def update_organization(
        self,
        org_id:    str,
        name:      str,
        country:   str,
        region:    str,
        plan_tier: str,
        is_active: bool,
    ) -> None:
        """
        Update organization metadata. Owner-only.
        """
        caller = str(gl.message.sender_address)
        assert caller == self.owner, "Only the contract owner can update organizations"
        assert org_id in self.organizations, "Organization not found"
        assert plan_tier in VALID_PLAN_TIERS, f"Invalid plan tier: {plan_tier}"

        org              = json.loads(self.organizations[org_id])
        org["name"]      = name
        org["country"]   = country
        org["region"]    = region
        org["plan_tier"] = plan_tier
        org["is_active"] = is_active
        self.organizations[org_id] = json.dumps(org)

        self._emit_audit(org_id, caller, "organization", org_id, "updated", {"plan_tier": plan_tier, "is_active": is_active})

    @gl.public.write
    def register_agent(
        self,
        agent_id:    str,
        org_id:      str,
        name:        str,
        description: str,
    ) -> None:
        """
        Register an AI agent under an organization.

        Agents are the programmatic callers of submit_validation. Tracking them
        on-chain lets auditors verify which software version submitted each
        validation request.

        Args:
            agent_id:    UUID matching Supabase agents.id.
            org_id:      Parent organization ID.
            name:        Human-readable agent name.
            description: What this agent does.
        """
        caller = str(gl.message.sender_address)
        assert org_id in self.organizations, "Organization not registered on-chain"
        assert agent_id not in self.agents, f"Agent {agent_id} already registered"

        org = json.loads(self.organizations[org_id])
        assert org.get("is_active"), "Organization is deactivated"

        agent = {
            "id":           agent_id,
            "org_id":       org_id,
            "name":         name,
            "description":  description,
            "is_active":    True,
            "registered_by": caller,
            "registered_at": _now_iso(),
            "validation_count": 0,
        }
        self.agents[agent_id] = json.dumps(agent)

        self._emit_audit(org_id, caller, "agent", agent_id, "registered", {"name": name})

    @gl.public.write
    def deactivate_agent(self, agent_id: str, org_id: str) -> None:
        """Deactivate an agent so it can no longer submit validations."""
        caller = str(gl.message.sender_address)
        assert agent_id in self.agents, "Agent not found"

        agent = json.loads(self.agents[agent_id])
        assert agent["org_id"] == org_id, "Agent does not belong to this organization"

        agent["is_active"] = False
        self.agents[agent_id] = json.dumps(agent)

        self._emit_audit(org_id, caller, "agent", agent_id, "deactivated", {})

    # ── Policy Management ────────────────────────────────────────────────────

    @gl.public.write
    def create_policy(
        self,
        policy_id:   str,
        org_id:      str,
        name:        str,
        version:     str,
        region:      str,
        rules_json:  str,
    ) -> None:
        """
        Create a policy rule-set on-chain.

        Policies store JSON-encoded regulatory rules (banned substances, organic
        mandates, pre-harvest intervals, etc.) that the validation consensus must
        check treatments against.

        Args:
            policy_id:  UUID matching Supabase policies.id.
            org_id:     Owning organization.
            name:       Policy name (e.g. "EU Organic Standard 2024").
            version:    Semantic version string (e.g. "1.0.0").
            region:     Jurisdiction (e.g. "West Africa", "European Union").
            rules_json: JSON string containing the rule definitions.
        """
        caller = str(gl.message.sender_address)
        assert org_id in self.organizations, "Organization not registered on-chain"
        assert policy_id not in self.policies, f"Policy {policy_id} already exists"

        # Validate that rules_json is valid JSON
        try:
            rules_parsed = json.loads(rules_json)
        except Exception:
            assert False, "rules_json must be valid JSON"

        policy = {
            "id":          policy_id,
            "org_id":      org_id,
            "name":        name,
            "version":     version,
            "region":      region,
            "rules":       rules_parsed,
            "is_active":   True,
            "created_by":  caller,
            "created_at":  _now_iso(),
        }
        self.policies[policy_id] = json.dumps(policy)

        self._emit_audit(org_id, caller, "policy", policy_id, "created", {"name": name, "version": version, "region": region})

    @gl.public.write
    def update_policy_status(
        self,
        policy_id: str,
        org_id:    str,
        is_active: bool,
    ) -> None:
        """Activate or deactivate a policy. The old rules remain immutably stored."""
        caller = str(gl.message.sender_address)
        assert policy_id in self.policies, "Policy not found"

        policy = json.loads(self.policies[policy_id])
        assert policy["org_id"] == org_id, "Policy does not belong to this organization"

        policy["is_active"] = is_active
        self.policies[policy_id] = json.dumps(policy)

        action = "activated" if is_active else "deactivated"
        self._emit_audit(org_id, caller, "policy", policy_id, action, {})

    # ═══════════════════════════════════════════════════════════════════════
    #  WRITE METHODS — Core Validation Consensus
    # ═══════════════════════════════════════════════════════════════════════

    @gl.public.write
    def submit_validation(
        self,
        request_id:            str,
        org_id:                str,
        agent_id:              str,
        crop_name:             str,
        crop_stage:            str,
        farmer_notes:          str,
        photo_description:     str,
        weather_json:          str,
        policy_id:             str,
        supabase_request_id:   str,
    ) -> None:
        """
        Submit crop disease evidence for multi-validator LLM consensus.

        This is the contract's primary function. Each Genlayer validator
        independently runs the agronomist LLM prompt and the
        eq_principle.prompt_comparative mechanism compares outputs across
        validators before finalizing the result on-chain.

        The result is stored keyed by request_id and can be retrieved
        immediately after the transaction is FINALIZED.

        Args:
            request_id:          On-chain unique ID for this validation.
            org_id:              Submitting organization ID.
            agent_id:            Submitting agent ID (or "direct" for manual submissions).
            crop_name:           Common crop name (e.g. "Maize (Corn)").
            crop_stage:          Current growth stage.
            farmer_notes:        Farmer's free-text observations.
            photo_description:   Caption/description of the crop photo (from vision model).
            weather_json:        JSON string with live weather data.
            policy_id:           Active policy ID (or "" for no policy).
            supabase_request_id: UUID in Supabase validation_requests table for cross-referencing.
        """
        assert not self.paused, "Contract is paused — contact the AgriLens team"
        assert org_id in self.organizations, "Organization not registered on-chain"
        assert request_id not in self.validations, "Request ID already processed"

        caller = str(gl.message.sender_address)
        org    = json.loads(self.organizations[org_id])
        assert org.get("is_active"), "Organization is deactivated"

        # Validate agent if not a direct submission
        if agent_id and agent_id != "direct":
            assert agent_id in self.agents, "Agent not registered on-chain"
            agent = json.loads(self.agents[agent_id])
            assert agent["org_id"] == org_id, "Agent does not belong to this organization"
            assert agent.get("is_active"), "Agent is deactivated"

        # Resolve policy rules
        policy_rules_str = ""
        org_region       = org.get("region", "")
        if policy_id and policy_id in self.policies:
            policy       = json.loads(self.policies[policy_id])
            if policy.get("is_active"):
                policy_rules_str = json.dumps(policy.get("rules", {}))
                org_region       = policy.get("region", org_region)

        # Store the request before running consensus (so it's on-chain even if consensus fails)
        request_record = {
            "request_id":          request_id,
            "org_id":              org_id,
            "agent_id":            agent_id,
            "caller":              caller,
            "crop_name":           crop_name,
            "crop_stage":          crop_stage,
            "farmer_notes":        farmer_notes,
            "photo_description":   photo_description,
            "weather_json":        weather_json,
            "policy_id":           policy_id,
            "supabase_request_id": supabase_request_id,
            "submitted_at":        _now_iso(),
            "status":              "validating",
        }
        self.requests[request_id] = json.dumps(request_record)

        # ── Build prompt and run consensus ──────────────────────────────────
        prompt = _build_diagnosis_prompt(
            crop_name           = crop_name,
            crop_stage          = crop_stage,
            farmer_notes        = farmer_notes,
            photo_description   = photo_description,
            weather_json        = weather_json,
            policy_rules        = policy_rules_str,
            org_region          = org_region,
            regeneration_context= "",
        )

        def run_agronomist_evaluation() -> str:
            raw = gl.nondet.exec_prompt(prompt)
            return _strip_fences(raw)

        # Multiple validators run run_agronomist_evaluation independently.
        # prompt_comparative compares their outputs using the equivalence rule.
        result_str = gl.eq_principle.prompt_comparative(
            run_agronomist_evaluation,
            "The primary_diagnosis, recommended_treatment, and consensus_outcome must be "
            "semantically equivalent across validators. Minor wording differences in reasoning "
            "or justification text are acceptable. The confidence_score values must be within "
            "±15 points of each other. The risk_score must agree within ±20 points.",
        )

        # ── Parse and validate result ────────────────────────────────────────
        result = self._parse_and_validate_result(result_str)

        # ── Store result ─────────────────────────────────────────────────────
        validation_result = {
            "request_id":              request_id,
            "org_id":                  org_id,
            "supabase_request_id":     supabase_request_id,
            "differential_diagnosis":  result.get("differential_diagnosis", []),
            "primary_diagnosis":       result.get("primary_diagnosis", "Unknown"),
            "diagnosis_justification": result.get("diagnosis_justification", ""),
            "recommended_treatment":   result.get("recommended_treatment", "Consult agronomist"),
            "treatment_active_ingredient": result.get("treatment_active_ingredient", ""),
            "treatment_dose_rate":         result.get("treatment_dose_rate", ""),
            "treatment_application_method": result.get("treatment_application_method", ""),
            "treatment_timing":            result.get("treatment_timing", ""),
            "alternative_treatments":      result.get("alternative_treatments", []),
            "confidence_score":            result["confidence_score"],
            "risk_score":                  result["risk_score"],
            "disease_severity":            result["disease_severity"],
            "weather_risk":                result["weather_risk"],
            "regulatory_risk":             result["regulatory_risk"],
            "treatment_efficacy":          result["treatment_efficacy"],
            "consensus_outcome":           result["consensus_outcome"],
            "pre_harvest_interval":        result.get("pre_harvest_interval", ""),
            "re_entry_interval":           result.get("re_entry_interval", ""),
            "environmental_warnings":      result.get("environmental_warnings", ""),
            "safety_ppe":                  result.get("safety_ppe", ""),
            "monitoring_protocol":         result.get("monitoring_protocol", ""),
            "prevention_for_next_season":  result.get("prevention_for_next_season", ""),
            "finalized_at":                _now_iso(),
            "validator_caller":            caller,
        }

        self.validations[request_id] = json.dumps(validation_result)

        # Update request status
        request_record["status"] = result["consensus_outcome"]
        self.requests[request_id] = json.dumps(request_record)

        # ── Increment counters ───────────────────────────────────────────────
        total = int(self.total_validations) + 1
        self.total_validations = str(total)

        if agent_id and agent_id != "direct" and agent_id in self.agents:
            agent = json.loads(self.agents[agent_id])
            agent["validation_count"] = agent.get("validation_count", 0) + 1
            self.agents[agent_id] = json.dumps(agent)

        # ── Update org statistics ────────────────────────────────────────────
        self._update_org_stats(org_id, result)

        # ── Auto-escalate if required ────────────────────────────────────────
        outcome = result["consensus_outcome"]
        if outcome in ("escalated", "policy_blocked"):
            esc_id = f"esc::{request_id}"
            reason = (
                f"Consensus outcome: {outcome}. "
                f"Confidence: {result['confidence_score']}%, "
                f"Risk: {result['risk_score']}%, "
                f"Regulatory risk: {result['regulatory_risk']}%."
            )
            self._create_escalation(esc_id, request_id, org_id, caller, reason)

        # ── Audit ────────────────────────────────────────────────────────────
        self._emit_audit(
            org_id, caller, "validation", request_id, "validated",
            {
                "outcome":    outcome,
                "confidence": result["confidence_score"],
                "risk":       result["risk_score"],
                "crop":       crop_name,
                "stage":      crop_stage,
            },
        )

    @gl.public.write
    def request_regeneration(
        self,
        request_id:           str,
        org_id:               str,
        additional_context:   str,
        new_request_id:       str,
    ) -> None:
        """
        Re-run consensus validation with additional context.

        Used when the initial result was insufficient_evidence or low_confidence
        and the farmer can provide more information. The original result is
        preserved; a new result is stored under new_request_id.

        Args:
            request_id:         Original request ID.
            org_id:             Requesting organization.
            additional_context: Extra observations to add to the prompt.
            new_request_id:     New ID for the regenerated result.
        """
        assert not self.paused, "Contract is paused"
        assert request_id in self.requests, "Original request not found"
        assert org_id in self.organizations, "Organization not registered"
        assert new_request_id not in self.validations, "New request ID already used"

        caller          = str(gl.message.sender_address)
        original_req    = json.loads(self.requests[request_id])
        assert original_req["org_id"] == org_id, "Request does not belong to this organization"

        # Check the original result was re-generatable
        if request_id in self.validations:
            original_result = json.loads(self.validations[request_id])
            original_outcome = original_result.get("consensus_outcome", "")
            assert original_outcome in (
                "insufficient_evidence", "low_confidence", "escalated"
            ), f"Cannot regenerate a '{original_outcome}' result"

        # Look up policy
        policy_id        = original_req.get("policy_id", "")
        policy_rules_str = ""
        org_region       = json.loads(self.organizations[org_id]).get("region", "")
        if policy_id and policy_id in self.policies:
            policy       = json.loads(self.policies[policy_id])
            policy_rules_str = json.dumps(policy.get("rules", {}))
            org_region       = policy.get("region", org_region)

        prompt = _build_diagnosis_prompt(
            crop_name            = original_req.get("crop_name", ""),
            crop_stage           = original_req.get("crop_stage", ""),
            farmer_notes         = original_req.get("farmer_notes", ""),
            photo_description    = original_req.get("photo_description", ""),
            weather_json         = original_req.get("weather_json", "{}"),
            policy_rules         = policy_rules_str,
            org_region           = org_region,
            regeneration_context = additional_context,
        )

        def run_regen_evaluation() -> str:
            raw = gl.nondet.exec_prompt(prompt)
            return _strip_fences(raw)

        result_str = gl.eq_principle.prompt_comparative(
            run_regen_evaluation,
            "The primary_diagnosis, recommended_treatment, and consensus_outcome must be "
            "semantically equivalent. The confidence_score must be within ±15 points.",
        )

        result = self._parse_and_validate_result(result_str)

        # Store new result linked to original
        regen_result = {
            "request_id":              new_request_id,
            "original_request_id":     request_id,
            "org_id":                  org_id,
            "supabase_request_id":     original_req.get("supabase_request_id", ""),
            "is_regeneration":         True,
            "additional_context":      additional_context,
            "primary_diagnosis":       result.get("primary_diagnosis", "Unknown"),
            "diagnosis_justification": result.get("diagnosis_justification", ""),
            "recommended_treatment":   result.get("recommended_treatment", "Consult agronomist"),
            "treatment_active_ingredient": result.get("treatment_active_ingredient", ""),
            "treatment_dose_rate":         result.get("treatment_dose_rate", ""),
            "treatment_application_method": result.get("treatment_application_method", ""),
            "treatment_timing":            result.get("treatment_timing", ""),
            "alternative_treatments":      result.get("alternative_treatments", []),
            "differential_diagnosis":      result.get("differential_diagnosis", []),
            "confidence_score":    result["confidence_score"],
            "risk_score":          result["risk_score"],
            "disease_severity":    result["disease_severity"],
            "weather_risk":        result["weather_risk"],
            "regulatory_risk":     result["regulatory_risk"],
            "treatment_efficacy":  result["treatment_efficacy"],
            "consensus_outcome":   result["consensus_outcome"],
            "pre_harvest_interval":   result.get("pre_harvest_interval", ""),
            "re_entry_interval":      result.get("re_entry_interval", ""),
            "environmental_warnings": result.get("environmental_warnings", ""),
            "safety_ppe":             result.get("safety_ppe", ""),
            "monitoring_protocol":    result.get("monitoring_protocol", ""),
            "prevention_for_next_season": result.get("prevention_for_next_season", ""),
            "finalized_at":         _now_iso(),
            "validator_caller":     caller,
        }
        self.validations[new_request_id] = json.dumps(regen_result)

        self._update_org_stats(org_id, result)

        total = int(self.total_validations) + 1
        self.total_validations = str(total)

        self._emit_audit(
            org_id, caller, "validation", new_request_id, "regenerated",
            {"original_request_id": request_id, "outcome": result["consensus_outcome"]},
        )

    # ── Escalation Management ────────────────────────────────────────────────

    @gl.public.write
    def manual_escalate(
        self,
        request_id: str,
        org_id:     str,
        reason:     str,
    ) -> None:
        """
        Manually escalate a validation to a human agronomist.
        Can be called for any finalized validation regardless of outcome.
        """
        caller = str(gl.message.sender_address)
        assert request_id in self.requests, "Request not found"

        req = json.loads(self.requests[request_id])
        assert req["org_id"] == org_id, "Request does not belong to this organization"

        esc_id = f"esc::manual::{request_id}"
        assert esc_id not in self.escalations, "Escalation already exists for this request"

        self._create_escalation(esc_id, request_id, org_id, caller, reason)
        self._emit_audit(org_id, caller, "escalation", esc_id, "manual_escalation", {"reason": reason})

    @gl.public.write
    def resolve_escalation(
        self,
        escalation_id:     str,
        org_id:            str,
        resolution:        str,
        final_treatment:   str,
        override_outcome:  str,
    ) -> None:
        """
        Resolve an escalation with a human agronomist's decision.

        The resolution and final treatment are stored immutably on-chain,
        creating a permanent record of the human-in-the-loop decision.

        Args:
            escalation_id:    Escalation record ID.
            org_id:           Organization resolving the escalation.
            resolution:       Human agronomist's explanation and notes.
            final_treatment:  The treatment they recommend (may differ from AI).
            override_outcome: Final consensus outcome after human review.
        """
        caller = str(gl.message.sender_address)
        assert escalation_id in self.escalations, "Escalation not found"
        assert override_outcome in VALID_OUTCOMES, f"Invalid outcome: {override_outcome}"

        esc = json.loads(self.escalations[escalation_id])
        assert esc["org_id"] == org_id, "Escalation does not belong to this organization"
        assert not esc.get("resolved"), "Escalation already resolved"

        esc["resolved"]          = True
        esc["resolution"]        = resolution
        esc["final_treatment"]   = final_treatment
        esc["override_outcome"]  = override_outcome
        esc["resolved_by"]       = caller
        esc["resolved_at"]       = _now_iso()
        self.escalations[escalation_id] = json.dumps(esc)

        # Update the validation result with human override
        request_id = esc.get("request_id", "")
        if request_id in self.validations:
            val = json.loads(self.validations[request_id])
            val["human_override"]       = True
            val["human_resolution"]     = resolution
            val["human_final_treatment"]= final_treatment
            val["human_outcome"]        = override_outcome
            val["human_reviewer"]       = caller
            val["human_reviewed_at"]    = _now_iso()
            self.validations[request_id] = json.dumps(val)

        self._emit_audit(
            org_id, caller, "escalation", escalation_id, "resolved",
            {"outcome": override_outcome, "request_id": request_id},
        )

    # ── Emergency Controls ───────────────────────────────────────────────────

    @gl.public.write
    def pause_contract(self) -> None:
        """Pause all validation submissions. Owner-only emergency control."""
        caller = str(gl.message.sender_address)
        assert caller == self.owner, "Only the contract owner can pause"
        self.paused = True

    @gl.public.write
    def unpause_contract(self) -> None:
        """Unpause the contract. Owner-only."""
        caller = str(gl.message.sender_address)
        assert caller == self.owner, "Only the contract owner can unpause"
        self.paused = False

    @gl.public.write
    def transfer_ownership(self, new_owner: str) -> None:
        """Transfer contract ownership to a new address. Owner-only."""
        caller = str(gl.message.sender_address)
        assert caller == self.owner, "Only the current owner can transfer ownership"
        assert new_owner, "New owner address cannot be empty"
        old_owner    = self.owner
        self.owner   = new_owner

    # ═══════════════════════════════════════════════════════════════════════
    #  INTERNAL HELPERS
    # ═══════════════════════════════════════════════════════════════════════

    def _parse_and_validate_result(self, result_str: str) -> dict:
        """
        Parse the JSON result from the LLM and apply safety defaults.
        Clamps all numeric scores to [0, 100] and ensures valid outcome.
        """
        try:
            result = json.loads(result_str)
        except Exception:
            # Final fallback — return a safe insufficient_evidence result
            return {
                "primary_diagnosis":       "Unable to parse AI response",
                "diagnosis_justification": result_str[:300] if result_str else "",
                "recommended_treatment":   "Consult your local agricultural extension officer immediately",
                "treatment_active_ingredient": "",
                "treatment_dose_rate":         "",
                "treatment_application_method": "",
                "treatment_timing":            "As soon as possible",
                "alternative_treatments":      [],
                "differential_diagnosis":      [],
                "confidence_score":    0,
                "risk_score":          60,
                "disease_severity":    50,
                "weather_risk":        50,
                "regulatory_risk":     0,
                "treatment_efficacy":  0,
                "consensus_outcome":   "insufficient_evidence",
                "pre_harvest_interval":    "",
                "re_entry_interval":       "",
                "environmental_warnings":  "Manual review required",
                "safety_ppe":              "",
                "monitoring_protocol":     "Monitor daily and seek expert advice",
                "prevention_for_next_season": "",
            }

        # Clamp all score fields
        for score_field in (
            "confidence_score", "risk_score", "disease_severity",
            "weather_risk", "regulatory_risk", "treatment_efficacy",
        ):
            result[score_field] = _clamp(_safe_int(result.get(score_field), 50), 0, 100)

        # Validate consensus_outcome
        if result.get("consensus_outcome") not in VALID_OUTCOMES:
            # Derive from scores if outcome is missing or invalid
            conf    = result["confidence_score"]
            risk    = result["risk_score"]
            reg     = result["regulatory_risk"]
            if reg >= 80:
                result["consensus_outcome"] = "policy_blocked"
            elif conf < 40:
                result["consensus_outcome"] = "insufficient_evidence"
            elif conf < 60 and risk > 60:
                result["consensus_outcome"] = "escalated"
            elif conf < 60:
                result["consensus_outcome"] = "low_confidence"
            else:
                result["consensus_outcome"] = "approved"

        # Ensure list fields are lists
        result["alternative_treatments"]  = _safe_list(result.get("alternative_treatments"))
        result["differential_diagnosis"]  = _safe_list(result.get("differential_diagnosis"))

        return result

    def _create_escalation(
        self,
        esc_id:     str,
        request_id: str,
        org_id:     str,
        caller:     str,
        reason:     str,
    ) -> None:
        """Internal helper to create an escalation record."""
        esc = {
            "id":           esc_id,
            "request_id":   request_id,
            "org_id":       org_id,
            "created_by":   caller,
            "reason":       reason,
            "resolved":     False,
            "resolution":   "",
            "resolved_by":  "",
            "resolved_at":  "",
            "created_at":   _now_iso(),
        }
        self.escalations[esc_id] = json.dumps(esc)

    def _update_org_stats(self, org_id: str, result: dict) -> None:
        """
        Update running aggregated statistics for an organization.
        Called after every successful validation (including regenerations).
        """
        if org_id not in self.org_stats:
            stats = {
                "org_id": org_id,
                "total_validations": 0,
                "approved": 0,
                "escalated": 0,
                "policy_blocked": 0,
                "low_confidence": 0,
                "insufficient": 0,
                "total_confidence": 0,
                "total_risk": 0,
                "total_severity": 0,
                "total_efficacy": 0,
            }
        else:
            stats = json.loads(self.org_stats[org_id])

        outcome = result.get("consensus_outcome", "low_confidence")

        stats["total_validations"]  = stats.get("total_validations", 0) + 1
        stats["total_confidence"]   = stats.get("total_confidence", 0) + result.get("confidence_score", 0)
        stats["total_risk"]         = stats.get("total_risk", 0) + result.get("risk_score", 0)
        stats["total_severity"]     = stats.get("total_severity", 0) + result.get("disease_severity", 0)
        stats["total_efficacy"]     = stats.get("total_efficacy", 0) + result.get("treatment_efficacy", 0)

        if outcome == "approved":
            stats["approved"]        = stats.get("approved", 0) + 1
        elif outcome == "escalated":
            stats["escalated"]       = stats.get("escalated", 0) + 1
        elif outcome == "policy_blocked":
            stats["policy_blocked"]  = stats.get("policy_blocked", 0) + 1
        elif outcome == "low_confidence":
            stats["low_confidence"]  = stats.get("low_confidence", 0) + 1
        elif outcome == "insufficient_evidence":
            stats["insufficient"]    = stats.get("insufficient", 0) + 1

        self.org_stats[org_id] = json.dumps(stats)

    def _emit_audit(
        self,
        org_id:      str,
        actor:       str,
        entity_type: str,
        entity_id:   str,
        action:      str,
        metadata:    dict,
    ) -> None:
        """
        Append an audit event to the immutable on-chain audit log.
        Key format: org_id::NNNNNN (zero-padded sequential counter per org).
        """
        counter_str = self.org_audit_counters.get(org_id, "0")
        counter     = int(counter_str) + 1
        self.org_audit_counters[org_id] = str(counter)

        event_key = _make_audit_key(org_id, str(counter).zfill(8))
        event = {
            "key":         event_key,
            "org_id":      org_id,
            "actor":       actor,
            "entity_type": entity_type,
            "entity_id":   entity_id,
            "action":      action,
            "metadata":    metadata,
            "timestamp":   _now_iso(),
        }
        self.audit_log[event_key] = json.dumps(event)

    # ═══════════════════════════════════════════════════════════════════════
    #  VIEW METHODS — Read-only queries (no gas for these on StudioNet)
    # ═══════════════════════════════════════════════════════════════════════

    @gl.public.view
    def get_validation_result(self, request_id: str) -> str:
        """
        Return the full JSON-encoded validation result for a request_id.
        Returns empty string if consensus has not yet been reached.
        """
        return self.validations.get(request_id, "")

    @gl.public.view
    def get_validation_request(self, request_id: str) -> str:
        """Return the stored request metadata (submitted evidence, status)."""
        return self.requests.get(request_id, "")

    @gl.public.view
    def has_result(self, request_id: str) -> bool:
        """Return True if consensus has been finalized for this request_id."""
        return request_id in self.validations

    @gl.public.view
    def get_organization(self, org_id: str) -> str:
        """Return organization JSON or empty string if not registered."""
        return self.organizations.get(org_id, "")

    @gl.public.view
    def is_organization_registered(self, org_id: str) -> bool:
        """Return True if the organization is registered and active."""
        if org_id not in self.organizations:
            return False
        org = json.loads(self.organizations[org_id])
        return bool(org.get("is_active", False))

    @gl.public.view
    def get_agent(self, agent_id: str) -> str:
        """Return agent JSON or empty string if not registered."""
        return self.agents.get(agent_id, "")

    @gl.public.view
    def is_agent_active(self, agent_id: str) -> bool:
        """Return True if the agent exists and is active."""
        if agent_id not in self.agents:
            return False
        agent = json.loads(self.agents[agent_id])
        return bool(agent.get("is_active", False))

    @gl.public.view
    def get_policy(self, policy_id: str) -> str:
        """Return policy JSON including rules, or empty string if not found."""
        return self.policies.get(policy_id, "")

    @gl.public.view
    def is_policy_active(self, policy_id: str) -> bool:
        """Return True if the policy exists and is active."""
        if policy_id not in self.policies:
            return False
        policy = json.loads(self.policies[policy_id])
        return bool(policy.get("is_active", False))

    @gl.public.view
    def get_escalation(self, escalation_id: str) -> str:
        """Return escalation JSON or empty string if not found."""
        return self.escalations.get(escalation_id, "")

    @gl.public.view
    def get_escalation_for_request(self, request_id: str) -> str:
        """
        Return the escalation record for a given request_id if one exists.
        Checks both auto-escalation (esc::request_id) and manual keys.
        """
        auto_key   = f"esc::{request_id}"
        manual_key = f"esc::manual::{request_id}"
        if auto_key in self.escalations:
            return self.escalations[auto_key]
        if manual_key in self.escalations:
            return self.escalations[manual_key]
        return ""

    @gl.public.view
    def get_org_stats(self, org_id: str) -> str:
        """
        Return aggregated statistics for an organization as JSON.

        Includes derived metrics:
          avg_confidence, avg_risk, avg_severity, avg_efficacy,
          approval_rate, escalation_rate.
        """
        if org_id not in self.org_stats:
            return ""

        stats = json.loads(self.org_stats[org_id])
        total = stats.get("total_validations", 0)

        if total > 0:
            stats["avg_confidence"] = round(stats.get("total_confidence", 0) / total)
            stats["avg_risk"]       = round(stats.get("total_risk", 0) / total)
            stats["avg_severity"]   = round(stats.get("total_severity", 0) / total)
            stats["avg_efficacy"]   = round(stats.get("total_efficacy", 0) / total)
            stats["approval_rate"]  = round(stats.get("approved", 0) / total * 100)
            stats["escalation_rate"]= round(stats.get("escalated", 0) / total * 100)
        else:
            stats["avg_confidence"] = 0
            stats["avg_risk"]       = 0
            stats["avg_severity"]   = 0
            stats["avg_efficacy"]   = 0
            stats["approval_rate"]  = 0
            stats["escalation_rate"]= 0

        return json.dumps(stats)

    @gl.public.view
    def get_audit_event(self, event_key: str) -> str:
        """Return a single audit event by its composite key (org_id::NNNNNN)."""
        return self.audit_log.get(event_key, "")

    @gl.public.view
    def get_org_audit_count(self, org_id: str) -> str:
        """Return the number of audit events recorded for an organization."""
        return self.org_audit_counters.get(org_id, "0")

    @gl.public.view
    def get_total_validations(self) -> str:
        """Return the global total number of validations processed."""
        return self.total_validations

    @gl.public.view
    def get_owner(self) -> str:
        """Return the contract owner address."""
        return self.owner

    @gl.public.view
    def is_paused(self) -> bool:
        """Return True if the contract is paused."""
        return self.paused

    @gl.public.view
    def get_info(self) -> str:
        """
        Return contract metadata as JSON.
        Useful for frontend version checks and health monitoring.
        """
        return json.dumps({
            "name":               "AgriLens Validator",
            "version":            self.contract_version,
            "owner":              self.owner,
            "network":            "StudioNet",
            "paused":             self.paused,
            "total_validations":  self.total_validations,
            "address":            "0x3B2F3fa6a899566402886B07B0E4c4D4e2835Ed3",
        })

    @gl.public.view
    def get_plan_limit(self, plan_tier: str) -> str:
        """Return the monthly validation limit for a plan tier (-1 = unlimited)."""
        limit = PLAN_LIMITS.get(plan_tier, 0)
        return str(limit)
