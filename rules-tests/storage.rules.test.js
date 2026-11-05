const fs = require("fs");
const path = require("path");
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { ref, uploadBytes, getBytes } = require("firebase/storage");

let env;
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-menudock",
    storage: { rules: fs.readFileSync(path.join(__dirname, "..", "storage.rules"), "utf8") },
  });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearStorage());

describe("restaurant images", () => {
  it("an admin can upload a logo, and anyone can read it", async () => {
    const adminStorage = env.authenticatedContext("adminUid", { admin: true }).storage();
    await assertSucceeds(uploadBytes(ref(adminStorage, "restaurants/taco-monster/logo"), png));
    await assertSucceeds(getBytes(ref(env.unauthenticatedContext().storage(), "restaurants/taco-monster/logo")));
  });
  it("the public and non-admin users cannot upload", async () => {
    await assertFails(uploadBytes(ref(env.unauthenticatedContext().storage(), "restaurants/taco-monster/logo"), png));
    await assertFails(uploadBytes(ref(env.authenticatedContext("rando").storage(), "restaurants/taco-monster/logo"), png));
  });
  it("nothing outside restaurants/ is writable", async () => {
    const adminStorage = env.authenticatedContext("adminUid", { admin: true }).storage();
    await assertFails(uploadBytes(ref(adminStorage, "random/file"), png));
  });
});
