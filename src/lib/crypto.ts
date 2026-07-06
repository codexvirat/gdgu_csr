import crypto from "node:crypto";

function encKey() {
  const hex = process.env.AADHAAR_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("AADHAAR_ENC_KEY must be a 32-byte hex string");
  }
  return Buffer.from(hex, "hex");
}

function hmacKey() {
  const hex = process.env.AADHAAR_HMAC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("AADHAAR_HMAC_KEY must be a 32-byte hex string");
  }
  return Buffer.from(hex, "hex");
}

export function normalizeAadhaar(raw: string) {
  return raw.replace(/[\s-]/g, "");
}

/** Format-only validation per PRD 6.2 — 12 digits. Full UIDAI verification is out of scope for v1. */
export function isValidAadhaarFormat(raw: string) {
  return /^\d{12}$/.test(normalizeAadhaar(raw));
}

function encryptString(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

function decryptString(stored: string) {
  const [ivB64, tagB64, ciphertextB64] = stored.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}

export function encryptAadhaar(rawAadhaar: string) {
  const value = normalizeAadhaar(rawAadhaar);
  const aadhaarEncrypted = encryptString(value);
  const aadhaarHash = crypto.createHmac("sha256", hmacKey()).update(value).digest("hex");
  const aadhaarLast4 = value.slice(-4);
  return { aadhaarEncrypted, aadhaarHash, aadhaarLast4 };
}

export function decryptAadhaar(stored: string) {
  return decryptString(stored);
}

export function encryptPin(pin: string) {
  return encryptString(pin);
}

export function decryptPin(stored: string) {
  return decryptString(stored);
}

export function hashAadhaarLookup(rawAadhaar: string) {
  return crypto.createHmac("sha256", hmacKey()).update(normalizeAadhaar(rawAadhaar)).digest("hex");
}

export function maskAadhaar(last4: string) {
  return `XXXX-XXXX-${last4}`;
}
