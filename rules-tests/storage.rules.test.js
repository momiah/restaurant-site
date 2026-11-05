const fs = require("fs");
const path = require("path");
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { ref, uploadBytes, getBytes, deleteObject } = require("firebase/storage");
const { doc, setDoc } = require("firebase/firestore");

let env;
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-menudock",
    storage: { rules: fs.readFileSync(path.join(__dirname, "..", "storage.rules"), "utf8") },
    // Storage rules look up owners/{uid} in Firestore to know which restaurant is theirs.
    firestore: { rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8") },
  });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearStorage();
  await env.clearFirestore();
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), "owners", "tacoOwner"), { restaurantId: "taco-monster", role: "owner" })
  );
});

const jpeg = { contentType: "image/jpeg" };
const owner = () => env.authenticatedContext("tacoOwner").storage();

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

describe("menu photos from the owner's dashboard", () => {
  it("an owner can upload, replace and delete their own menu photos", async () => {
    const photo = ref(owner(), "restaurants/taco-monster/menu/soft-taco.jpg");
    await assertSucceeds(uploadBytes(photo, png, jpeg));
    await assertSucceeds(uploadBytes(photo, png, jpeg));
    await assertSucceeds(getBytes(ref(env.unauthenticatedContext().storage(), "restaurants/taco-monster/menu/soft-taco.jpg")));
    await assertSucceeds(deleteObject(photo));
  });
  it("an owner cannot upload to another restaurant", async () => {
    await assertFails(uploadBytes(ref(owner(), "restaurants/noodle-lab/menu/x.jpg"), png, jpeg));
  });
  it("an owner can only upload menu photos, not the logo or other files", async () => {
    await assertFails(uploadBytes(ref(owner(), "restaurants/taco-monster/logo"), png, jpeg));
    await assertFails(uploadBytes(ref(owner(), "restaurants/taco-monster/menu/script.html"), png, { contentType: "text/html" }));
  });
  it("photos are capped at 5 MB", async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    await assertFails(uploadBytes(ref(owner(), "restaurants/taco-monster/menu/huge.jpg"), big, jpeg));
  });
  it("signed-in users who aren't owners cannot upload menu photos", async () => {
    await assertFails(uploadBytes(ref(env.authenticatedContext("rando").storage(), "restaurants/taco-monster/menu/x.jpg"), png, jpeg));
  });
});

describe("menu import uploads", () => {
  const pdf = { contentType: "application/pdf" };
  const path = "menu-imports/taco-monster/1700000000-menu.pdf";

  it("an owner can upload a menu file for their restaurant and read it back", async () => {
    await assertSucceeds(uploadBytes(ref(owner(), path), png, pdf));
    await assertSucceeds(getBytes(ref(owner(), path)));
    await assertSucceeds(deleteObject(ref(owner(), path)));
  });
  it("Word, Excel, CSV and photos are accepted; other types are not", async () => {
    for (const contentType of [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "image/jpeg",
    ]) {
      await assertSucceeds(uploadBytes(ref(owner(), `menu-imports/taco-monster/f-${contentType.length}`), png, { contentType }));
    }
    await assertFails(uploadBytes(ref(owner(), "menu-imports/taco-monster/x.html"), png, { contentType: "text/html" }));
    await assertFails(uploadBytes(ref(owner(), "menu-imports/taco-monster/x.exe"), png, { contentType: "application/octet-stream" }));
  });
  it("menu files are private: the public and other owners can't read or upload them", async () => {
    await assertSucceeds(uploadBytes(ref(owner(), path), png, pdf));
    await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), path)));
    await assertFails(getBytes(ref(env.authenticatedContext("rando").storage(), path)));
    await assertFails(uploadBytes(ref(owner(), "menu-imports/noodle-lab/menu.pdf"), png, pdf));
  });
  it("menu files are capped at 20 MB", async () => {
    await assertFails(uploadBytes(ref(owner(), "menu-imports/taco-monster/big.pdf"), new Uint8Array(20 * 1024 * 1024 + 1), pdf));
  });
});
