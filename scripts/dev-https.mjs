// Starts the dev server over trusted local HTTPS (mkcert), still reachable from a phone on the same Wi-Fi:
//   npm run dev:https
// Needs mkcert (`brew install mkcert`). Writes a certificate for localhost, this Mac's current LAN addresses and its
// Bonjour name into ./certificates (git-ignored), and makes a new one when those change. Nothing is exposed beyond the
// local network, and no tunnel is used.
//
// Database: this never uses the DATABASE_URL in .env (which points at production). It reads the development database
// from .env.dev-https.local (git-ignored) and refuses to start without it, or if it is the .env database.
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
const hostOf = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};
const devHost = hostOf(process.env.DATABASE_URL ?? "");
if (!devHost) stop(".env.dev-https.local needs a valid DATABASE_URL.");
const envDb = readFileSync(join(root, ".env"), "utf8").match(
  /^DATABASE_URL=(.*)$/m,
)?.[1];
const stripPooler = (h) => h.replace("-pooler", "");
if (envDb && stripPooler(hostOf(envDb)) === stripPooler(devHost)) {
  stop(
    `DATABASE_URL in .env.dev-https.local is the same database as the one active in .env (${devHost}). Refusing.`,
  );
}

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
    env: { ...process.env, NODE_OPTIONS: "--no-deprecation" },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
