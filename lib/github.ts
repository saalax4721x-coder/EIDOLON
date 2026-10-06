import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const key = () => {
  const value = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY is not configured.");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32) throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
  return decoded;
};

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(value: string) {
  const [iv, tag, ciphertext] = value.split(".");
  if (!iv || !tag || !ciphertext) throw new Error("Invalid encrypted GitHub secret.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

export function createGithubPkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = require("node:crypto").createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function githubRepoFromReference(reference: string) {
  const value = reference.trim().replace(/\.git$/i, "").replace(/\/$/, "");
  const match = value.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)$/i);
  if (match) return { owner: match[1], repo: match[2] };
  const short = value.match(/^([^/]+)\/([^/]+)$/);
  return short ? { owner: short[1], repo: short[2] } : null;
}

export async function githubApi(path: string, accessToken: string) {
  return fetch("https://api.github.com" + path, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + accessToken,
      "X-GitHub-Api-Version": "2026-03-10",
    },
    cache: "no-store",
  });
}
