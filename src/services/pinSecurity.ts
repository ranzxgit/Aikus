import type { PinCredential } from '@/types/profile';

export type PinDigest = (value: string) => Promise<string>;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function generateSalt(): Promise<string> {
  const crypto = await import('expo-crypto');
  return bytesToHex(await crypto.getRandomBytesAsync(16));
}

async function sha256(value: string): Promise<string> {
  const crypto = await import('expo-crypto');
  return crypto.digestStringAsync(crypto.CryptoDigestAlgorithm.SHA256, value);
}

export async function hashPin(pin: string, salt?: string, digest: PinDigest = sha256): Promise<PinCredential> {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('PIN must contain exactly four digits.');
  }

  const pinSalt = salt ?? await generateSalt();
  const hash = await digest(`${pinSalt}:${pin}`);
  return { salt: pinSalt, hash };
}

export async function verifyPin(pin: string, credential: PinCredential, digest: PinDigest = sha256): Promise<boolean> {
  if (!/^\d{4}$/.test(pin)) {
    return false;
  }
  const candidate = await hashPin(pin, credential.salt, digest);
  return candidate.hash === credential.hash;
}
