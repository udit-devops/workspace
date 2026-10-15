/**
 * AES-256-GCM encryption for third-party tokens stored in the database.
 *
 * Key comes from TOKEN_ENCRYPTION_KEY (falls back to JWT_SECRET so local dev
 * works without extra config). Stored format: "enc:v1:<iv>:<tag>:<ciphertext>"
 * (base64 parts). Values without the prefix are treated as legacy plaintext.
 */
import crypto from "node:crypto";

const PREFIX = "enc:v1:";

function key(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error("TOKEN_ENCRYPTION_KEY or JWT_SECRET must be set");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, data].map((b) => b.toString("base64")).join(":");
}

export function decryptToken(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const [iv, tag, data] = stored.slice(PREFIX.length).split(":").map((p) => Buffer.from(p, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
