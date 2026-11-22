// Starts the dev server over trusted local HTTPS (mkcert), still reachable from a phone on the same Wi-Fi:
//   npm run dev:https
// Needs mkcert (`brew install mkcert`). Writes a certificate for localhost, this Mac's current LAN addresses and its
// Bonjour name into ./certificates (git-ignored), and makes a new one when those change. Nothing is exposed beyond the
// local network, and no tunnel is used.
//
// Database: it reads DATABASE_URL and DIRECT_URL from .env.dev-https.local (git-ignored) and starts only if both are the
// verified development Neon endpoint; production endpoints, unknown ones and unreadable ones are refused. The same
// development database may also be the one in .env. Credentials are never printed.
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname, networkInterfaces } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dir = join(root, "certificates");
const cert = join(dir, "dev.pem");
const key = join(dir, "dev-key.pem");
const names = join(dir, "dev.names");

const stop = (why) => {
  console.error(`\n${why}\n`);
  process.exit(1);
};

// ── the development database, and never production ──
const dbFile = join(root, ".env.dev-https.local");
if (!existsSync(dbFile)) {
  stop(
    `Missing ${dbFile}\nCreate it with the DEVELOPMENT database only (the commented "NEON - DEV" lines in .env):\n\n  DATABASE_URL=postgresql://…dev…\n  DIRECT_URL=postgresql://…dev…\n`,
  );
}
process.loadEnvFile(dbFile);

// Neon endpoints are named ep-<name>-<id>, with "-pooler" on the pooled address: that endpoint id is the identity. Only
// the verified development endpoint is allowed; the known production endpoints are refused by name; anything else (a
// different Neon database, another host, a URL that can't be read) is refused too, because it can't be verified.
const DEV_ENDPOINTS = ["ep-sparkling-hill-attqopw1"];
const PRODUCTION_ENDPOINTS = ["ep-sparkling-river-apgahow5"];

/** The endpoint id in a Neon connection URL, or null (nothing from the URL's credentials is ever returned or printed) */
const endpointOf = (url) => {
  try {
    const host = new URL(url).hostname;
    if (!host.endsWith(".neon.tech")) return null;
    return host.split(".")[0].replace(/-pooler$/, "") || null;
  } catch {
    return null;
  }
};

for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  const value = process.env[name] ?? "";
  if (!value) stop(`${name} is missing from .env.dev-https.local (it needs both DATABASE_URL and DIRECT_URL).`);
  const endpoint = endpointOf(value);
  if (!endpoint) stop(`${name} in .env.dev-https.local is not a readable Neon URL, so its database can't be verified. Refusing.`);
  if (PRODUCTION_ENDPOINTS.includes(endpoint)) stop(`${name} in .env.dev-https.local is a PRODUCTION database (${endpoint}). Refusing.`);
  if (!DEV_ENDPOINTS.includes(endpoint))
    stop(`${name} in .env.dev-https.local is not the verified development database (${endpoint}). Refusing.`);
}
// The same development database in .env is fine. A production URL in .env is not a problem either, because the two
// checked above replace it for this server; but it is reported, so it is never a surprise.
const envFile = readFileSync(join(root, ".env"), "utf8");
for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  const endpoint = endpointOf(envFile.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1] ?? "");
  if (endpoint && PRODUCTION_ENDPOINTS.includes(endpoint))
    console.warn(`Note: .env ${name} is a production endpoint; this server uses the development one from .env.dev-https.local.`);
}
const devHost = endpointOf(process.env.DATABASE_URL);

// ── the certificate ──
try {
  execFileSync("mkcert", ["-version"], { stdio: "ignore" });
} catch {
  stop("mkcert is not installed. Run: brew install mkcert");
}
const lan = Object.values(networkInterfaces())
  .flat()
  .filter(
    (n) =>
      n &&
      n.family === "IPv4" &&
      !n.internal &&
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(n.address),
  )
  .map((n) => n.address);
const wanted = [
  "localhost",
  "127.0.0.1",
  "::1",
  ...lan,
  `${hostname().replace(/\.local$/, "")}.local`,
].sort();
if (
  !existsSync(cert) ||
  !existsSync(key) ||
  !existsSync(names) ||
  readFileSync(names, "utf8") !== wanted.join("\n")
) {
  mkdirSync(dir, { recursive: true });
  console.log(`Making a certificate for: ${wanted.join(", ")}`);
  execFileSync("mkcert", ["-cert-file", cert, "-key-file", key, ...wanted], {
    stdio: "inherit",
  });
  writeFileSync(names, wanted.join("\n"));
}

console.log(`\nDatabase: ${devHost}`);
console.log(`On this Mac:  https://localhost:3000`);
for (const ip of lan) console.log(`On your phone: https://${ip}:3000`);
console.log("");

const child = spawn(
  join(root, "node_modules/.bin/next"),
  [
    "dev",
    "--turbo",
    "-H",
    "0.0.0.0",
    "--experimental-https",
    "--experimental-https-key",
    key,
    "--experimental-https-cert",
    cert,
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: "--no-deprecation",
      // check-in works outside the meeting window on this server (development only; DEV_SIMULATE_MEETING=0 follows the real schedule)
      DEV_SIMULATE_MEETING: process.env.DEV_SIMULATE_MEETING ?? "1",
    },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
