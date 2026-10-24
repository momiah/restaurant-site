// Menu import: real file parsing (docx/xlsx/csv), a fake Claude client, and the
// owner checks. No network or API key needed.
const JSZip = require("jszip");
const ExcelJS = require("exceljs");
const {
  ImportError, MENU_SCHEMA, MODEL, assertCanImport, cleanDraft, extractMenu, fileKind, importPath, toContentBlocks,
} = require("../menuImport");

// Smallest valid .docx: the parts mammoth needs to read paragraphs.
async function makeDocx(paragraphs) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  const body = paragraphs.map((t) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`).join("");
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({type: "nodebuffer"});
}

async function makeXlsx(rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Menu");
  rows.forEach((r) => ws.addRow(r));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// Fake Anthropic client: records the request, returns a canned final message.
function fakeClient(message) {
  const calls = [];
  return {
    calls,
    beta: {messages: {stream: (params) => {
      calls.push(params);
      return {finalMessage: () => Promise.resolve(message)};
    }}},
  };
}
const answer = (obj, extra = {}) => ({
  stop_reason: "end_turn",
  content: [{type: "thinking", thinking: ""}, {type: "text", text: JSON.stringify(obj)}],
  ...extra,
});

describe("reading the uploaded file", () => {
  it("reads a Word document's text", async () => {
    const buf = await makeDocx(["STARTERS", "Nachos - £5.50", "Crispy tortilla chips"]);
    const [block] = await toContentBlocks(buf, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "menu.docx");
    expect(block.type).toBe("text");
    expect(block.text).toContain("Nachos - £5.50");
    expect(block.text).toContain("<menu_file name=\"menu.docx\">");
  });

  it("reads every row of a spreadsheet, quoting cells with commas", async () => {
    const buf = await makeXlsx([["Category", "Item", "Price"], ["Tacos", "Soft Taco, beef", 2.15], ["Drinks", "Pepsi Max", 1.2]]);
    const [block] = await toContentBlocks(buf, "", "prices.xlsx");
    expect(block.text).toContain("Sheet: Menu");
    expect(block.text).toContain("Tacos,\"Soft Taco, beef\",2.15");
    expect(block.text).toContain("Drinks,Pepsi Max,1.2");
  });

  it("passes CSV through as text", async () => {
    const [block] = await toContentBlocks(Buffer.from("Item,Price\nChurros,3"), "text/csv", "menu.csv");
    expect(block.text).toContain("Churros,3");
  });

  it("sends photos and PDFs to Claude as they are", async () => {
    const jpg = Buffer.from([0xff, 0xd8, 0xff]);
    expect(await toContentBlocks(jpg, "image/jpeg", "menu.jpg")).toEqual([
      {type: "image", source: {type: "base64", media_type: "image/jpeg", data: jpg.toString("base64")}},
    ]);
    const [pdf] = await toContentBlocks(Buffer.from("%PDF-1.4"), "application/pdf", "menu.pdf");
    expect(pdf).toMatchObject({type: "document", source: {type: "base64", media_type: "application/pdf"}});
  });

  it("explains unsupported, empty, broken and oversized files", async () => {
    expect(() => fileKind("application/msword", "menu.doc")).toThrow(/\.docx or PDF/);
    expect(() => fileKind("application/vnd.ms-excel", "menu.xls")).toThrow(/\.xlsx or CSV/);
    expect(() => fileKind("application/zip", "menu.zip")).toThrow(ImportError);
    await expect(toContentBlocks(Buffer.alloc(0), "text/csv", "a.csv")).rejects.toThrow(/empty/);
    await expect(toContentBlocks(Buffer.from("not a zip"), "", "a.docx")).rejects.toThrow(/couldn't open that Word/);
    await expect(toContentBlocks(Buffer.alloc(6 * 1024 * 1024), "image/png", "a.png")).rejects.toThrow(/too large/);
  });
});

describe("asking Claude for the menu", () => {
  const draft = {
    categories: [
      {category: " Tacos ", items: [{name: " Soft Taco ", description: "Beef, lettuce", price: 2.149}, {name: "", description: "", price: 1}]},
      {category: "Empty", items: []},
      {category: "", items: [{name: "Mystery", description: "", price: null}]},
    ],
    warnings: ["Burrito has two sizes; used the lower price.", "  "],
  };

  it("uses structured output on the default model, with fallback, and cleans the result", async () => {
    const client = fakeClient(answer(draft));
    const result = await extractMenu(client, [{type: "text", text: "menu"}]);

    const [req] = client.calls;
    expect(req.model).toBe(MODEL);
    expect(req.output_config.format).toEqual({type: "json_schema", schema: MENU_SCHEMA});
    expect(req.fallbacks).toBe("default");
    expect(req.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect(req.messages[0].content[0]).toEqual({type: "text", text: "menu"});

    expect(result).toEqual({
      categories: [
        {category: "Tacos", items: [{name: "Soft Taco", description: "Beef, lettuce", price: 2.15}]},
        {category: "Menu", items: [{name: "Mystery", description: "", price: null}]},
      ],
      warnings: ["Burrito has two sizes; used the lower price."],
    });
  });

  it("tells the owner when Claude declines or the menu is too long", async () => {
    await expect(extractMenu(fakeClient(answer({}, {stop_reason: "refusal", content: []})), [])).rejects.toMatchObject({code: "declined"});
    await expect(extractMenu(fakeClient(answer({}, {stop_reason: "max_tokens"})), [])).rejects.toMatchObject({code: "too-long"});
  });

  it("passes on Claude's explanation when the file isn't a menu", async () => {
    const client = fakeClient(answer({categories: [], warnings: ["This looks like a receipt, not a menu."]}));
    await expect(extractMenu(client, [])).rejects.toThrow("This looks like a receipt, not a menu.");
  });

  it("schema is strict (every object closed, every field required)", () => {
    const walk = (s) => {
      if (s.type === "object") {
        expect(s.additionalProperties).toBe(false);
        expect(s.required.sort()).toEqual(Object.keys(s.properties).sort());
        Object.values(s.properties).forEach(walk);
      }
      if (s.type === "array") walk(s.items);
    };
    walk(MENU_SCHEMA);
  });

  it("cleanDraft copes with junk", () => {
    expect(cleanDraft(null)).toEqual({categories: [], warnings: []});
    expect(cleanDraft({categories: [{category: "A", items: [{name: "x", price: -3}]}]}).categories[0].items[0].price).toBeNull();
  });
});

describe("who can import", () => {
  const db = (owners) => ({collection: () => ({doc: (uid) => ({get: async () => ({
    exists: !!owners[uid], get: (k) => owners[uid] && owners[uid][k],
  })})})});
  const owners = {tacoOwner: {restaurantId: "taco-monster"}};

  it("the restaurant's owner and MenuDock admins can", async () => {
    await expect(assertCanImport(db(owners), {uid: "tacoOwner", token: {}}, "taco-monster")).resolves.toBeUndefined();
    await expect(assertCanImport(db({}), {uid: "a", token: {admin: true}}, "taco-monster")).resolves.toBeUndefined();
  });
  it("other owners, strangers and signed-out callers cannot", async () => {
    await expect(assertCanImport(db(owners), {uid: "tacoOwner", token: {}}, "noodle-lab")).rejects.toMatchObject({code: "permission-denied"});
    await expect(assertCanImport(db(owners), {uid: "rando", token: {}}, "taco-monster")).rejects.toMatchObject({code: "permission-denied"});
    await expect(assertCanImport(db(owners), undefined, "taco-monster")).rejects.toMatchObject({code: "unauthenticated"});
  });
  it("only files in that restaurant's import folder", () => {
    expect(importPath("taco-monster", "menu-imports/taco-monster/1-menu.pdf")).toBe("menu-imports/taco-monster/1-menu.pdf");
    expect(() => importPath("taco-monster", "menu-imports/noodle-lab/1.pdf")).toThrow(ImportError);
    expect(() => importPath("taco-monster", "menu-imports/taco-monster/../../noodle-lab/x")).toThrow(ImportError);
    expect(() => importPath("taco-monster", "restaurants/taco-monster/logo")).toThrow(ImportError);
  });
});
