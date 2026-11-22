const {defineConfig, devices} = require("@playwright/test");
const cfg = require("./support/config");

const siteEnv = {
  BROWSER: "none",
  PORT: String(cfg.SITE_PORT),
  REACT_APP_USE_EMULATORS: "1",
  REACT_APP_FIRESTORE_EMULATOR_PORT: String(cfg.FIRESTORE_PORT),
  REACT_APP_RESTAURANT_ID: "",
  REACT_APP_RESTAURANT_SLUG: "",
  REACT_APP_FUNCTIONS_URL: cfg.FUNCTIONS_URL,
  REACT_APP_FIREBASE_API_KEY: "demo-api-key",
  REACT_APP_FIREBASE_AUTH_DOMAIN: `${cfg.PROJECT_ID}.firebaseapp.com`,
  REACT_APP_FIREBASE_PROJECT_ID: cfg.PROJECT_ID,
  REACT_APP_FIREBASE_STORAGE_BUCKET: `${cfg.PROJECT_ID}.appspot.com`,
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: "0",
  REACT_APP_FIREBASE_APP_ID: "demo-app",
  REACT_APP_FIREBASE_MEASUREMENT_ID: "",
};

module.exports = defineConfig({
  testDir: "./tests",
  globalSetup: require.resolve("./support/globalSetup"),
  globalTeardown: require.resolve("./support/globalTeardown"),
  workers: 1,
  timeout: 60_000,
  expect: {timeout: 15_000},
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", {open: "never"}]],
  use: {
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    screenshot: process.env.E2E_SCREENSHOTS ? "on" : "only-on-failure",
  },
  webServer: [
    {
      command: "node support/fakeStripe.js",
      url: `${cfg.FAKE_STRIPE_URL}/health`,
      reuseExistingServer: false,
    },
    {
      command: "npm start",
      cwd: "..",
      url: `http://localhost:${cfg.SITE_PORT}`,
      env: siteEnv,
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ],
});
