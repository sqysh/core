// Builds the native iOS shell (native/ios) and launches it in the simulator, loading the local development server:
//   npm run dev:https      (first, in another terminal)
//   npm run ios:dev        (IOS_SIMULATOR="iPhone 18 Pro Max" npm run ios:dev for another device)
// Development only, and not the production architecture.
//
// Database: the app only ever loads https://localhost:3000, and it is only started once that server answers with a
// certificate from this Mac's mkcert CA, which is what `npm run dev:https` serves after verifying the development Neon
// database (plain `npm run dev` is HTTP and is refused). Certificate validation is never turned off: the simulator is
// given the same mkcert CA this Mac already trusts, so iOS validates the certificate as usual.
import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { request } from "node:https";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const SERVER = "https://localhost:3000";
const DEVICE = process.env.IOS_SIMULATOR ?? "iPhone 18 Pro";

const stop = (why) => {
  console.error(`\n${why}\n`);
  process.exit(1);
};

// ── the mkcert CA, and the dev:https server signed by it ──
let caFile;
try {
  caFile = join(
    execFileSync("mkcert", ["-CAROOT"], { encoding: "utf8" }).trim(),
    "rootCA.pem",
  );
} catch {
  stop("mkcert is not installed. Run: brew install mkcert");
}
if (!existsSync(caFile))
  stop(
    `No mkcert CA at ${caFile}. Run \`npm run dev:https\` once to create it.`,
  );

await new Promise((resolve) => {
  const req = request(
    SERVER,
    { method: "HEAD", ca: readFileSync(caFile), timeout: 10_000 },
    (res) => {
      res.resume();
      resolve();
    },
  );
  req.on("timeout", () => req.destroy(new Error("timed out")));
  req.on("error", (err) =>
    stop(
      `${SERVER} is not the local HTTPS development server (${err.message}).\nStart it first: npm run dev:https`,
    ),
  );
  req.end();
});
console.log(`Development server: ${SERVER} (mkcert certificate verified)`);

// ── the simulator, trusting the mkcert CA ──
const devices = JSON.parse(
  execFileSync("xcrun", ["simctl", "list", "devices", "available", "--json"], {
    encoding: "utf8",
  }),
);
const device = Object.values(devices.devices)
  .flat()
  .find((d) => d.name === DEVICE);
if (!device)
  stop(
    `No available simulator named "${DEVICE}". See: xcrun simctl list devices available`,
  );
if (device.state !== "Booted")
  execFileSync("xcrun", ["simctl", "boot", device.udid], { stdio: "inherit" });
execFileSync(
  "xcrun",
  ["simctl", "keychain", device.udid, "add-root-cert", caFile],
  { stdio: "inherit" },
);
// show the simulator window when the Simulator app is installed; the simulator itself runs either way
try {
  execFileSync("open", ["-b", "com.apple.iphonesimulator"], { stdio: "ignore" });
} catch {
  console.warn("Simulator app not found; the simulator is running without a window (open it from Xcode).");
}
console.log(`Simulator: ${DEVICE} (${device.udid}), mkcert CA trusted\n`);

// ── sync, build and launch ──
const child = spawn(
  join(root, "node_modules/.bin/cap"),
  ["run", "ios", "--target", device.udid],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, CORE_NATIVE_DEV_SERVER: SERVER },
  },
);
child.on("exit", (code) => process.exit(code ?? 0));
