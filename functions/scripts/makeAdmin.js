/* eslint-disable */
/**
 * Create (or find) a MenuDock admin user and grant the { admin: true } custom claim
 * that the admin console + Firestore/Storage rules require.
 *
 * Usage (from the functions/ directory):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
 *   node scripts/makeAdmin.js you@example.com "YourPassword123"
 *
 * The service account is downloaded from the Firebase console:
 *   Project settings → Service accounts → Generate new private key.
 * After running, sign in to the console with that email + password.
 * (If the user already exists, the password argument is ignored.)
 */
const admin = require("firebase-admin");

admin.initializeApp();

const email = process.argv[2];
const password = process.argv[3];

if (!email) {
  console.error("Usage: node scripts/makeAdmin.js <email> [password]");
  process.exit(1);
}

(async () => {
  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
    console.log("Found existing user:", user.uid);
  } catch {
    if (!password) {
      console.error("User doesn't exist yet — pass a password to create them.");
      process.exit(1);
    }
    user = await admin.auth().createUser({ email, password });
    console.log("Created user:", user.uid);
  }
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`✓ ${email} is now a MenuDock admin. Sign in to the console.`);
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
