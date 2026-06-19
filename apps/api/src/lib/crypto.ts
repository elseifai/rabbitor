import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function encryptionKey(): Buffer {
  const raw = process.env.ADDRESS_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!raw) {
    throw new Error("ADDRESS_ENCRYPTION_KEY or JWT_SECRET is required for address encryption");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

/** AES-256-GCM encrypt — prefixed with v1: for version detection. */
export function encryptAddress(plain: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptAddress(stored: string): string {
  if (!stored.startsWith("v1:")) {
    try {
      return Buffer.from(stored, "base64").toString("utf8");
    } catch {
      return stored;
    }
  }

  const parts = stored.split(":");
  if (parts.length !== 4) return stored;

  const iv = Buffer.from(parts[1]!, "base64");
  const tag = Buffer.from(parts[2]!, "base64");
  const data = Buffer.from(parts[3]!, "base64");
  const decipher = crypto.createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
