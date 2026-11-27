// npm run e2e: start the Firestore, Auth and Functions emulators (demo project, so
// nothing can reach production), then run the Playwright journeys inside them.
// The fake Stripe and the website dev server are started by playwright.config.js.
const {spawnSync} = require("child_process");
const fs = require("fs");
const path = require("path");
const cfg = require("./support/config");

const root = path.join(__dirname, "..");
const secretFile = path.join(root, "functions", ".secret.local");
const wroteSecrets = !fs.existsSync(secretFile);
if (wroteSecrets) {
  fs.writeFileSync(secretFile,
      `STRIPE_SECRET_KEY=${cfg.STRIPE_SECRET_KEY}\nSTRIPE_WEBHOOK_SECRET=${cfg.STRIPE_WEBHOOK_SECRET}\nANTHROPIC_API_KEY=unused\n`);
}

const args = process.argv.slice(2).map((a) => JSON.stringify(a)).join(" ");
const result = spawnSync(
    path.join(__dirname, "node_modules", ".bin", "firebase"),
    ["emulators:exec", "--config", path.join(root, "firebase.e2e.json"), "--only", "firestore,auth,functions",
      "--project", cfg.PROJECT_ID, `npx playwright test ${args}`],
    {
      cwd: __dirname,
      stdio: "inherit",
      env: {...process.env, STRIPE_API_BASE: cfg.FAKE_STRIPE_URL},
    },
);

if (wroteSecrets) fs.rmSync(secretFile, {force: true});
process.exit(result.status ?? 1);
