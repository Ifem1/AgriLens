# AgriLens

AgriLens is a decentralized crop validation platform powered by GenLayer intelligent contracts. Farmers submit crop claims, public evidence sources, weather or agro references, photo evidence, and treatment requests. GenLayer validators fetch independent public evidence and reach consensus on crop condition, weather relevance, and treatment safety.

## How It Works

1. **Submit evidence** - A farmer describes the crop issue, shares farm location, and can add public evidence URLs, weather/agro source URLs, photo/evidence URLs, and pesticide or treatment guidance URLs.

2. **Fetch evidence in GenLayer** - The frontend and backend pass URLs to the contract, but they do not verify them. The GenLayer contract uses validator web access (`gl.nondet.web.request`) to fetch submitted public URLs inside consensus execution.

3. **Reach canonical consensus** - Validators evaluate fetched evidence with `gl.nondet.exec_prompt`, then `gl.eq_principle.prompt_comparative` compares a minimal canonical JSON verdict: evidence checked, weather consistency, photo support, treatment safety, verdict, and confidence band.

4. **Receive a verdict** - Results are evidence-backed: approved, rejected, needs expert review, or insufficient evidence. Every validation is recorded with an on-chain transaction and audit trail.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Recharts |
| Auth & Database | Supabase (SSR auth, PostgreSQL, Storage) |
| Blockchain | GenLayer Intelligent Contract (Python) on StudioNet |
| Weather | OpenWeatherMap API plus validator-fetched public weather/agro sources |
| Wallet | Client-side key generation, AES-GCM encrypted storage |

## GenLayer Integration

The core contract is [`contracts/agrilens_validator.py`](contracts/agrilens_validator.py). It handles:

- **Organization and agent registration** - On-chain identity management for farms and automated agents
- **Evidence-backed validation** - Validators fetch submitted public sources using GenLayer web access and evaluate fetched content
- **Strict canonical JSON consensus** - Consensus applies to stable fields instead of long explanations
- **Treatment safety review** - Pesticide or treatment requests are checked against fetched public guidance where provided
- **Escalation handling** - Rejected, uncertain, or safety-critical cases can be routed to expert review
- **Audit trail** - Validations, escalations, and resolutions are stored immutably on-chain

## Features

- **Crop validation** - Submit crop claims and public evidence for evidence-backed on-chain consensus
- **Photo evidence** - Upload crop photos or provide public photo/evidence URLs
- **Weather relevance** - Submit public weather/agro URLs for validator-side consistency checks
- **Treatment safety** - Submit treatment names, pesticide names, and public guidance URLs
- **Community knowledge base** - Public validations help other farmers with similar issues
- **Risk analytics** - Dashboard with validation trends and outcome breakdowns
- **Policy management** - Define regional rules that guide validation outcomes
- **Escalation system** - Flag uncertain or safety-critical cases for expert review

## Evidence Limitations

- AgriLens can verify public web evidence submitted as URLs.
- It should not claim to fully inspect private or inaccessible photos.
- If image-level analysis is not supported, photo evidence is marked as supportive, weak, unavailable, or not_checked based on fetched page text, metadata, captions, or accessibility.
- Safety-critical treatment advice returns needs_expert_review when evidence is weak, uncertain, inaccessible, or missing jurisdiction-specific label guidance.

## Project Structure

```text
AgriLens/
  apps/web/                  # Next.js frontend
    src/app/
      (auth)/                # Login, registration
      (dashboard)/           # Dashboard, validations, analytics, etc.
      api/validate/          # Passes evidence to GenLayer
    src/lib/
      supabase/              # Supabase client and middleware
      wallet/                # Wallet generation and encryption
  contracts/                 # GenLayer intelligent contract
  scripts/                   # Contract deployment script
  supabase/functions/        # Supabase Edge Functions
```

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project with a `farmer-photos` storage bucket
- GenLayer contract deployed on StudioNet
- OpenWeatherMap API key

### Environment Variables

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=your_contract_address
GENLAYER_RPC_URL=https://studio.genlayer.com/api
GENLAYER_OWNER_PRIVATE_KEY=0x_your_owner_private_key

OPENWEATHERMAP_API_KEY=your_api_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Install & Run

```bash
npm install
cd apps/web
npm run dev
```

### Deploy Contract

Deploy the intelligent contract to GenLayer StudioNet via [GenLayer Studio](https://studio.genlayer.com), then set the contract address in your environment variables.

## License

MIT
