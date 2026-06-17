#!/usr/bin/env python3
"""
AgriLens — Genlayer Contract Deployment Script
================================================
Deploys contracts/agrilens_validator.py to Genlayer StudioNet.

Prerequisites:
  pip install genlayer-py  (or: pip install genlayer)

Usage:
  python scripts/deploy_contract.py

After deployment:
  1. Copy the printed contract address.
  2. Set it in .env.local:
       NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x...
  3. Redeploy the frontend to Vercel (or restart the local dev server).
"""

import os
import sys
import json
from pathlib import Path

CONTRACT_FILE = Path(__file__).parent.parent / "contracts" / "agrilens_validator.py"
RPC_URL = os.environ.get("GENLAYER_RPC_URL", "https://studio.genlayer.com/api")

# ── Try to import the Genlayer SDK ──────────────────────────────────────────
try:
    from genlayer import Client  # type: ignore
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False


def deploy_via_sdk() -> str:
    """Deploy using the official Genlayer Python SDK."""
    client = Client(rpc_url=RPC_URL)

    print(f"[deploy] Reading contract: {CONTRACT_FILE}")
    source = CONTRACT_FILE.read_text(encoding="utf-8")

    print("[deploy] Deploying to StudioNet…")
    result = client.deploy_contract(source=source, args=[], value=0)

    address: str = result["contractAddress"]
    tx_hash: str = result.get("transactionHash", "N/A")
    print(f"\n✅ Deployment successful!")
    print(f"   Contract address : {address}")
    print(f"   Transaction hash : {tx_hash}")
    print(f"\nNext step — add to .env.local:")
    print(f"   NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS={address}")
    return address


def deploy_via_rpc() -> str:
    """Fallback: deploy using raw JSON-RPC."""
    import urllib.request

    source = CONTRACT_FILE.read_text(encoding="utf-8")

    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "gen_deployContract",
        "params": [{"source": source, "args": [], "value": "0x0"}],
    }).encode()

    req = urllib.request.Request(
        RPC_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    print(f"[deploy] Sending to {RPC_URL}…")
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read())

    if "error" in body:
        raise RuntimeError(f"RPC error: {body['error']}")

    result = body["result"]
    address: str = result.get("contractAddress") or result.get("address") or str(result)
    print(f"\n✅ Deployment successful!")
    print(f"   Contract address : {address}")
    print(f"\nNext step — add to .env.local:")
    print(f"   NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS={address}")
    return address


if __name__ == "__main__":
    if not CONTRACT_FILE.exists():
        print(f"ERROR: Contract file not found at {CONTRACT_FILE}", file=sys.stderr)
        sys.exit(1)

    print("═══════════════════════════════════════")
    print("  AgriLens — Genlayer Contract Deploy  ")
    print("═══════════════════════════════════════")
    print(f"  RPC URL  : {RPC_URL}")
    print(f"  Contract : {CONTRACT_FILE.name}")
    print()

    try:
        if SDK_AVAILABLE:
            address = deploy_via_sdk()
        else:
            print("[deploy] Genlayer SDK not found — using raw RPC fallback.")
            print("[deploy] Install SDK with: pip install genlayer-py")
            address = deploy_via_rpc()

        # Write address to .env.local automatically if file exists
        env_file = Path(__file__).parent.parent / ".env.local"
        if env_file.exists():
            content = env_file.read_text(encoding="utf-8")
            marker = "NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS="
            if marker in content:
                lines = content.splitlines()
                updated = "\n".join(
                    f"{marker}{address}" if l.startswith(marker) else l
                    for l in lines
                )
                env_file.write_text(updated + "\n", encoding="utf-8")
                print(f"\n[deploy] Updated {env_file} automatically.")
            else:
                with env_file.open("a", encoding="utf-8") as f:
                    f.write(f"\n{marker}{address}\n")
                print(f"\n[deploy] Appended contract address to {env_file}.")

    except Exception as exc:
        print(f"\n❌ Deployment failed: {exc}", file=sys.stderr)
        sys.exit(1)
