// api/login.js
// Vercel Serverless Function: verifies login credentials server-side.
//
// Credentials live in Vercel environment variables WITHOUT the VITE_ prefix
// (LOGIN_USER / LOGIN_PASSWORD), so they are only visible to this function
// at runtime and never get embedded in the client JS bundle.
//
// Contract:
//   POST /api/login  { username, password }
//   -> 200 { ok: true }                        valid credentials
//   -> 401 { ok: false, error: "invalid" }     wrong credentials
//   -> 405                                     non-POST
//   -> 500 { ok: false, error: "config" }      env vars missing (deploy issue)

import crypto from 'crypto';

// Brute-force throttle: every failed attempt costs the attacker a fixed
// wait before the response arrives. Legitimate logins are not delayed.
// In-memory (per lambda instance), so it is a slowdown, not a hard lock.
const FAILURE_DELAY_MS = 1500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a ?? ''));
  const bufB = Buffer.from(String(b ?? ''));
  // timingSafeEqual requires equal lengths; compare fixed-size hashes so
  // response time does not leak which part failed or its length.
  const hashA = crypto.createHash('sha256').update(bufA).digest();
  const hashB = crypto.createHash('sha256').update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const { LOGIN_USER, LOGIN_PASSWORD } = process.env;
  if (!LOGIN_USER || !LOGIN_PASSWORD) {
    return res.status(500).json({ ok: false, error: 'config' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(401).json({ ok: false, error: 'invalid' });
  }

  const usernameOk = safeEqual(body?.username, LOGIN_USER);
  const passwordOk = safeEqual(body?.password, LOGIN_PASSWORD);

  if (usernameOk && passwordOk) {
    return res.status(200).json({ ok: true });
  }
  await sleep(FAILURE_DELAY_MS);
  return res.status(401).json({ ok: false, error: 'invalid' });
}
