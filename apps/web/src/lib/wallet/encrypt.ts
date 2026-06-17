"use client";

const PBKDF2_ITERATIONS = 200_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPrivateKey(privateKey: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv   = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key  = await deriveKey(password, salt);
  const enc  = new TextEncoder();

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    enc.encode(privateKey)
  );

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptPrivateKey(encryptedData: string, password: string): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));
  const salt     = combined.slice(0, SALT_LENGTH);
  const iv       = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const data     = combined.slice(SALT_LENGTH + IV_LENGTH);
  const key      = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}
