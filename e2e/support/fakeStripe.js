// A stand-in for the bits of Stripe the payments function uses. The function's
// Stripe client is pointed here (STRIPE_API_BASE, emulator only), so it creates
// sessions with the real SDK; the "hosted checkout" page shows what would be
// charged, and paying sends a signed checkout.session.completed webhook to the
// function, exactly as Stripe would, before redirecting to success_url.
const crypto = require("crypto");
const http = require("http");
const qs = require("qs");
const cfg = require("./config");

const sessions = new Map();
let count = 0;

const pounds = (minor) => `£${(minor / 100).toFixed(2)}`;
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"})[c]);

function createSession(params) {
  const id = `cs_test_e2e_${Date.now()}_${++count}`;
  const lines = (params.line_items || []).map((l) => ({
    name: l.price_data.product_data.name,
    unit: Number(l.price_data.unit_amount),
    quantity: Number(l.quantity),
  }));
  const subtotal = lines.reduce((a, l) => a + l.unit * l.quantity, 0);
  const rate = params.shipping_options && params.shipping_options[0] && params.shipping_options[0].shipping_rate_data;
  const shipping = rate ? Number(rate.fixed_amount.amount) : 0;
  const session = {
    id,
    object: "checkout.session",
    url: `${cfg.FAKE_STRIPE_URL}/pay/${id}`,
    mode: "payment",
    payment_status: "unpaid",
    currency: (lines.length && params.line_items[0].price_data.currency) || "gbp",
    amount_subtotal: subtotal,
    amount_total: subtotal + shipping,
    total_details: {amount_shipping: shipping, amount_discount: 0, amount_tax: 0},
    metadata: params.metadata || {},
    customer_email: params.customer_email || null,
    success_url: params.success_url,
    cancel_url: params.cancel_url,
    payment_intent_data: params.payment_intent_data || null,
    lines,
  };
  sessions.set(id, session);
  return session;
}

function checkoutPage(s) {
  const rows = s.lines.map((l) =>
    `<tr data-testid="line"><td>${escape(l.name)} × ${l.quantity}</td><td>${pounds(l.unit * l.quantity)}</td></tr>`).join("");
  const delivery = s.total_details.amount_shipping ?
    `<tr data-testid="delivery-fee"><td>Delivery</td><td>${pounds(s.total_details.amount_shipping)}</td></tr>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Fake Stripe Checkout</title></head>
<body style="font-family:system-ui;max-width:480px;margin:40px auto">
<h1>Fake Stripe Checkout</h1>
<table style="width:100%">${rows}${delivery}
<tr><th align="left">Total</th><th align="left" data-testid="total">${pounds(s.amount_total)}</th></tr></table>
<form method="post" action="/pay/${s.id}">
<label>Email <input name="email" value="customer@e2e.test"></label>
<button type="submit">Pay ${pounds(s.amount_total)}</button>
</form>
<p><a href="${escape(s.cancel_url.replace("{CHECKOUT_SESSION_ID}", s.id))}">Cancel</a></p>
</body></html>`;
}

function signature(payload) {
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac("sha256", cfg.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  return `t=${t},v1=${v1}`;
}

async function pay(s, email) {
  s.payment_status = "paid";
  s.status = "complete";
  s.customer_details = {email, name: "E2E Customer", phone: null};
  const {lines, ...object} = s;
  const payload = JSON.stringify({
    id: `evt_e2e_${s.id}`,
    object: "event",
    type: "checkout.session.completed",
    data: {object},
  });
  const res = await fetch(cfg.WEBHOOK_URL, {
    method: "POST",
    headers: {"content-type": "application/json", "stripe-signature": signature(payload)},
    body: payload,
  });
  if (!res.ok) throw new Error(`Webhook rejected: ${res.status} ${await res.text()}`);
}

const readBody = (req) => new Promise((resolve) => {
  let data = "";
  req.on("data", (c) => (data += c));
  req.on("end", () => resolve(data));
});

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, {"content-type": type});
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, cfg.FAKE_STRIPE_URL);
    if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
      const {lines, ...session} = createSession(qs.parse(await readBody(req)));
      return send(res, 200, session);
    }
    const match = /^\/pay\/([\w-]+)$/.exec(url.pathname);
    const s = match && sessions.get(match[1]);
    if (match && !s) return send(res, 404, "Unknown session", "text/plain");
    if (s && req.method === "GET") return send(res, 200, checkoutPage(s), "text/html");
    if (s && req.method === "POST") {
      const email = qs.parse(await readBody(req)).email || "customer@e2e.test";
      await pay(s, email);
      res.writeHead(303, {location: s.success_url.replace("{CHECKOUT_SESSION_ID}", s.id)});
      return res.end();
    }
    if (url.pathname === "/health") return send(res, 200, {ok: true});
    return send(res, 404, {error: {message: `Fake Stripe has no ${req.method} ${url.pathname}`}});
  } catch (err) {
    console.error("[fake-stripe]", err);
    return send(res, 500, {error: {message: err.message}});
  }
});

server.listen(cfg.FAKE_STRIPE_PORT, "127.0.0.1", () =>
  console.log(`[fake-stripe] listening on ${cfg.FAKE_STRIPE_URL}`));
