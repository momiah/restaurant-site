// End-to-end: the admin console's server actions (Stripe onboarding, owner logins)
// against the Firestore + Auth emulators, with a fake Stripe.
const path = require("path");
const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
const pa = require("../functions/platformAdmin");

const TACO = "taco-monster";
const BASE = "https://us-central1-demo.cloudfunctions.net/payments";
let app, db, auth, stripe, accounts;

beforeAll(() => {
  app = admin.initializeApp({ projectId: "demo-menudock" }, "platform-admin");
  db = app.firestore();
  auth = app.auth();
});
afterAll(() => app.delete());

beforeEach(async () => {
  await db.recursiveDelete(db.collection("restaurants"));
  await db.recursiveDelete(db.collection("stripeOnboarding"));
  await db.recursiveDelete(db.collection("owners"));
  await db.doc(`restaurants/${TACO}`).set({ name: "Taco Monster", status: "active", payments: { provider: "stripe-connect", stripeAccountId: "" } });
  await db.doc("restaurants/noodle-lab").set({ name: "Noodle Lab", status: "active" });

  accounts = {};
  let n = 0;
  stripe = {
    accounts: {
      create: jest.fn(async (params) => {
        const acct = { id: `acct_${++n}`, livemode: false, charges_enabled: false, payouts_enabled: false, details_submitted: false, capabilities: { transfers: "inactive" }, requirements: { currently_due: ["individual.dob"] }, params };
        accounts[acct.id] = acct;
        return acct;
      }),
      retrieve: jest.fn(async (id) => {
        if (!accounts[id]) throw Object.assign(new Error("No such account"), { code: "resource_missing", statusCode: 404 });
        return accounts[id];
      }),
    },
    accountLinks: { create: jest.fn(async (p) => ({ url: `https://connect.stripe.com/setup/e/${p.account}/xyz`, ...p })) },
  };
});

const finishOnboarding = (id) => Object.assign(accounts[id], { charges_enabled: true, payouts_enabled: true, details_submitted: true, capabilities: { transfers: "active" }, requirements: { currently_due: [] } });

describe("admin only", () => {
  it("refuses anyone without the admin claim", () => {
    expect(() => pa.assertAdmin(undefined)).toThrow(/sign in/);
    expect(() => pa.assertAdmin({ uid: "owner1", token: {} })).toThrow(/Only MenuDock admins/);
    expect(() => pa.assertAdmin({ uid: "me", token: { admin: true } })).not.toThrow();
  });
});

describe("Stripe onboarding", () => {
  it("creates an Express account and a link that never expires, without routing orders to it yet", async () => {
    const res = await pa.stripeOnboardingLink(db, stripe, { restaurantId: TACO, baseUrl: BASE, livemode: false });
    expect(stripe.accounts.create).toHaveBeenCalledWith(expect.objectContaining({ type: "express", country: "GB", metadata: { restaurantId: TACO } }));
    expect(res.url).toMatch(new RegExp(`^${BASE}/stripe-onboarding\\?r=taco-monster&t=[0-9a-f]{48}$`));

    const r = (await db.doc(`restaurants/${TACO}`).get()).data();
    expect(r.payments.stripeAccountId).toBe(""); // checkout keeps using the platform account until it's ready
    expect(r.payments.stripeStatus).toMatchObject({ accountId: "acct_1", ready: false, stillNeeded: 1 });
    // The secret token is NOT on the public restaurant record.
    expect(JSON.stringify(r)).not.toContain(res.url.split("t=")[1]);
  });

  it("asking again gives the same link and the same account", async () => {
    const a = await pa.stripeOnboardingLink(db, stripe, { restaurantId: TACO, baseUrl: BASE, livemode: false });
    const b = await pa.stripeOnboardingLink(db, stripe, { restaurantId: TACO, baseUrl: BASE, livemode: false });
    expect(b.url).toBe(a.url);
    expect(stripe.accounts.create).toHaveBeenCalledTimes(1);
  });

  it("makes a new live account once the key is live", async () => {
    const test = await pa.stripeOnboardingLink(db, stripe, { restaurantId: TACO, baseUrl: BASE, livemode: false });
    const live = await pa.stripeOnboardingLink(db, stripe, { restaurantId: TACO, baseUrl: BASE, livemode: true });
    expect(live.accountId).not.toBe(test.accountId);
    expect(live.url).not.toBe(test.url);
  });

  it("the link opens a fresh Stripe page; a wrong or other restaurant's token gets nothing", async () => {
    const { url } = await pa.stripeOnboardingLink(db, stripe, { restaurantId: TACO, baseUrl: BASE, livemode: false });
    const token = new URL(url).searchParams.get("t");
    const to = await pa.onboardingRedirect(db, stripe, { restaurantId: TACO, token, baseUrl: BASE });
    expect(to).toBe("https://connect.stripe.com/setup/e/acct_1/xyz");
    expect(stripe.accountLinks.create).toHaveBeenCalledWith({
      account: "acct_1", type: "account_onboarding",
      refresh_url: `${BASE}/stripe-onboarding?r=taco-monster&t=${token}`,
      return_url: `${BASE}/stripe-onboarding-done?r=taco-monster&t=${token}`,
    });

    expect(await pa.onboardingRedirect(db, stripe, { restaurantId: TACO, token: "0".repeat(48), baseUrl: BASE })).toBeNull();
    expect(await pa.onboardingRedirect(db, stripe, { restaurantId: "noodle-lab", token, baseUrl: BASE })).toBeNull();
    expect(await pa.onboardingRedirect(db, stripe, { restaurantId: TACO, token: undefined, baseUrl: BASE })).toBeNull();
    expect(await pa.onboardingRedirect(db, stripe, { restaurantId: "../x", token, baseUrl: BASE })).toBeNull();
  });

  it("orders start paying into the account only once Stripe says it's ready", async () => {
    await pa.stripeOnboardingLink(db, stripe, { restaurantId: TACO, baseUrl: BASE, livemode: false });
    expect((await pa.syncStripeAccount(db, stripe, TACO)).ready).toBe(false);
    expect((await db.doc(`restaurants/${TACO}`).get()).get("payments.stripeAccountId")).toBe("");

    finishOnboarding("acct_1");
    expect(await pa.syncStripeAccount(db, stripe, TACO)).toMatchObject({ ready: true, payoutsEnabled: true });
    const payments = (await db.doc(`restaurants/${TACO}`).get()).get("payments");
    expect(payments).toMatchObject({ stripeAccountId: "acct_1", stripeLivemode: false, stripeStatus: { ready: true } });
  });

  it("refresh with no account set up yet says so", async () => {
    expect(await pa.syncStripeAccount(db, stripe, "noodle-lab")).toBeNull();
  });

  it("unknown restaurants are refused", async () => {
    await expect(pa.stripeOnboardingLink(db, stripe, { restaurantId: "nope", baseUrl: BASE, livemode: false })).rejects.toThrow(/doesn't exist/);
  });
});

describe("owner logins", () => {
  it("creates the login with a temporary password and links it to the restaurant", async () => {
    const email = `owner-${Date.now()}@tacomonster.test`;
    const res = await pa.createOwnerLogin(db, auth, { restaurantId: TACO, email: ` ${email.toUpperCase()} ` });
    expect(res).toMatchObject({ email, created: true });
    expect(res.temporaryPassword).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
    expect((await db.doc(`owners/${res.uid}`).get()).data()).toMatchObject({ restaurantId: TACO, role: "owner", email });

    // Again: same login, no new password, nothing moved.
    const again = await pa.createOwnerLogin(db, auth, { restaurantId: TACO, email });
    expect(again).toMatchObject({ uid: res.uid, created: false, temporaryPassword: null });
  });

  it("won't move a login that already runs another restaurant", async () => {
    const email = `shared-${Date.now()}@x.test`;
    await pa.createOwnerLogin(db, auth, { restaurantId: TACO, email });
    await expect(pa.createOwnerLogin(db, auth, { restaurantId: "noodle-lab", email })).rejects.toThrow(/already runs another restaurant/);
  });

  it("won't turn a MenuDock admin login into an owner", async () => {
    const email = `admin-${Date.now()}@menudock.test`;
    const user = await auth.createUser({ email, password: "Passw0rd!" });
    await auth.setCustomUserClaims(user.uid, { admin: true });
    await expect(pa.createOwnerLogin(db, auth, { restaurantId: TACO, email })).rejects.toThrow(/admin login/);
  });

  it("needs a real email address", async () => {
    await expect(pa.createOwnerLogin(db, auth, { restaurantId: TACO, email: "not-an-email" })).rejects.toThrow(/email/);
  });
});
