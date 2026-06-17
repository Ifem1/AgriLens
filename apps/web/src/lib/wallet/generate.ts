import { ethers } from "ethers";

export interface GeneratedWallet {
  address: string;
  privateKey: string;
  mnemonic: string | null;
}

export async function generateWallet(): Promise<GeneratedWallet> {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase ?? null,
  };
}
