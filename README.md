# AgriLens

Decentralized crop validation platform powered by Genlayer intelligent contracts. Farmers submit crop evidence — photos, symptoms, and location — and receive AI-driven diagnoses and treatment recommendations validated through on-chain multi-validator consensus.

## How It Works

1. **Submit Evidence** — A farmer uploads a crop photo, describes symptoms, and shares their location. Real-time weather data is fetched automatically via OpenWeatherMap.

2. **On-Chain Consensus** — The evidence is sent to a Genlayer intelligent contract. Multiple independent AI validators each analyze the data using `gl.nondet.exec_prompt`, and Genlayer's equivalence principle (`gl.eq_principle.prompt_comparative`) ensures they agree on the diagnosis category and treatment approach before the result is finalized on-chain.

3. **Receive Results** — The farmer gets a diagnosis, recommended treatment, confidence score, risk assessment, and timing guidance. Every validation is recorded on-chain with a transparent, tamper-proof audit trail.

This multi-validator consensus eliminates single-point-of-failure risks of centralized AI — no single model or server decides a farmer's treatment plan.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Recharts |
| Auth & Database | Supabase (SSR auth, PostgreSQL, Storage) |
| Blockchain | Genlayer Intelligent Contract (Python) on StudioNet |
| Weather | OpenWeatherMap API |
| Wallet | Client-side key generation, AES-GCM encrypted storage |

## Genlayer Integration

The core of AgriLens is the intelligent contract at [`contracts/agrilens_validator.py`](contracts/agrilens_validator.py). It handles:

- **Organization & agent registration** — On-chain identity management for farms and automated agents
- **Crop validation via LLM consensus** — Each validator independently runs an agronomist AI prompt, then `prompt_comparative` compares outputs to reach consensus on diagnosis and treatment
- **Policy enforcement** — Optional regional agricultural policies that constrain validation outcomes
- **Escalation handling** — Low-confidence or high-risk results are flagged for human agronomist review
- **Audit trail** — Every validation, escalation, and resolution is stored immutably on-chain

The contract uses `gl.nondet.exec_prompt` (non-deterministic LLM execution) inside `gl.eq_principle.prompt_comparative` (equivalence principle for consensus), which is the canonical Genlayer pattern for multi-validator AI agreement.

## Features

- **Crop Validation** — Submit symptoms and photos for AI-powered diagnosis with on-chain consensus
- **Photo Evidence** — Upload crop photos stored on Supabase Storage
- **Weather-Aware** — Automatic weather context from the farmer's location
- **Community Knowledge Base** — Public validations shared to help other farmers
- **Risk Analytics** — Dashboard with validation trends, confidence scores, and risk metrics
- **Audit Trail** — Full history of all validations and on-chain transactions
- **Policy Management** — Define regional rules that guide validation outcomes
- **Escalation System** — Flag uncertain cases for expert review

## Project Structure

```
AgriLens/
├── apps/web/                  # Next.js frontend
│   ├── src/app/
│   │   ├── (auth)/            # Login, registration
│   │   ├── (dashboard)/       # Dashboard, validations, analytics, etc.
│   │   └── api/validate/      # Validation API route (Genlayer + fallback)
│   └── src/lib/
│       ├── supabase/          # Supabase client & middleware
│       └── wallet/            # Wallet generation & encryption
├── contracts/                 # Genlayer intelligent contract (Python)
├── scripts/                   # Contract deployment script
└── supabase/functions/        # Supabase Edge Functions
```

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (with `farmer-photos` storage bucket)
- Genlayer contract deployed on StudioNet
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

Deploy the intelligent contract to Genlayer StudioNet via [Genlayer Studio](https://studio.genlayer.com), then set the contract address in your environment variables.

## License

MIT
