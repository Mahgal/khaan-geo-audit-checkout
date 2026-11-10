# KHAAN GEO Audit Checkout — AI Visibility Audits You Can Buy in One Click

**Type a brand. Watch AI search answer live buyer questions — and see whether your brand is in the answer. Then check out with PayPal and order the full audit.**

- Live demo: `https://geo-demo.khaan.si` (placeholder — replaced at deploy time)
- Demo video: `<VIDEO_URL>` (placeholder)
- Built for the **PayPal AI Hackathon** (Devpost) by **Khaan Superintelligence** — founded November 2026, Anchorage, Alaska, bootstrapped, pre-revenue. We say this plainly because this README contains no invented users, revenue, or testimonials — only what the product demonstrably does.

## Inspiration

Search is changing shape. More and more buyers no longer scroll ten blue links — they ask an AI and read one synthesized answer. If your brand is not in that answer, you are not "ranked lower." You are **absent**.

We run [KHAAN.SI](https://khaan.si), a live AI answer engine that searches the web in real time and answers with numbered, verifiable sources. While building it, we kept seeing brands that had no idea whether AI answers mention them at all — and no simple way to buy an answer to that question. So we turned our own engine into the storefront: the free preview *is* the product working, and PayPal makes it purchasable in the same flow.

## What it does

1. **Free preview (the AI half).** Enter a brand and a category. The app generates five buyer-style questions ("What is the best AI video generator in 2026?"), samples **live** answers from the KHAAN.SI search/answer pipeline, and reports, per question: whether the brand was **Mentioned** or **Absent**, and which competitors were named instead. It closes with a short AI commentary that only restates the sampled facts. Everything is labeled: single engine, single sample, with a timestamp.
2. **Checkout (the PayPal half).** The full GEO Visibility Audit (founding price **$299**, list $499 — the same pricing as our live service page at khaan.si/geo) is sold through **PayPal Checkout**: the order is created and captured **server-side** with the Orders v2 API, the price is fixed in server code (the client can never name its own price), and the buyer pays with a PayPal sandbox account in the official popup. A confirmation page shows the order id, the PayPal order id, the amount, and delivery terms (full audit by email within 5 business days).
3. **Honest degradation.** If live sampling is unavailable, the preview falls back to a **clearly labeled snapshot** using a fictional brand — never silent fake "live" data. If PayPal credentials are not configured, the app runs in **Demo Mode**: the checkout walks the exact same flow against simulated PayPal responses, badged as simulated everywhere it appears.

## How we built it

- **Zero-dependency Node.js** service (`server.js` + `lib/`): serves the single-page storefront and five JSON endpoints — `/api/preview`, `/api/orders/create`, `/api/orders/capture`, `/api/config`, `/api/health`. Orders persist to a JSON store (`lib/store.js`).
- **AI sampling** (`lib/preview.js`): category question templates → `POST https://khaan.si/api/ask` (our production multi-source search-and-answer pipeline — hosted LLM synthesis, including Cloudflare Workers AI) → normalized string matching for brand/competitor presence.
- **Payments** (`lib/paypal.js`): OAuth2 client-credentials → Orders v2 create/capture, `PayPal-Request-Id` idempotency, capture verification fallback, amount hard-coded server-side. Frontend uses the PayPal JS SDK Buttons and only ever receives the public client-id from `/api/config`.
- **Design**: single page, black-and-gold, no account, no tracking — preview to paid order in about a minute.

## Tools (as required by the hackathon)

- **PayPal Developer Platform** — JS SDK + Orders v2 API, sandbox environment (the payment core of the product).
- **KHAAN.SI answer pipeline** — our own multi-source live web search (Bing HTML/RSS + DDG Lite) with hosted LLM answer synthesis (multi-provider, including Cloudflare Workers AI), with numbered sources (the audit engine).
- **Node.js** — the entire app runtime; zero third-party dependencies.
- **Cloudflare** — DNS and hosting for KHAAN.SI, whose answer API the preview samples.

## Run it locally

Requirements: Node.js ≥ 18. No `npm install` needed (zero dependencies).

```bash
git clone https://github.com/Mahgal/khaan-geo-audit-checkout.git
cd khaan-geo-audit-checkout
node server.js
# open http://localhost:8080
```

- **Zero-config**: with no credentials the app boots in **Demo Mode** — generate a preview, walk the (simulated) checkout, get an order confirmation. Perfect for a first look.
- **Real sandbox checkout**: copy `.env.example` to `.env`, fill `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` from developer.paypal.com → Apps & Credentials → Sandbox → your app, restart. The official PayPal button renders; pay with any Sandbox **Personal** test account (Dashboard → Testing Tools → Sandbox Accounts).
- Preview sampling calls the public KHAAN.SI API; if it is unreachable you will see the labeled snapshot mode instead — that is by design.

## Challenges & what we learned

- **Server-side or it didn't happen.** The tempting shortcut is creating orders in the browser; we kept create/capture on the server so price integrity and idempotency are real, not theatrical.
- **AI answers are evidence, handle them like it.** A visibility claim is only worth making if it is reproducible: question text, engine, timestamp, and matching rules are all in the output or in `lib/preview.js`.
- **Design for the demo you can actually run.** Credentials, networks, and third-party uptime all fail at the worst moment — labeled fallbacks keep the product honest *and* keep it demonstrable.

## What's next

Swap the sandbox credentials for live ones and this checkout becomes the production order page for the GEO service already priced at khaan.si/geo; widen the audit to multiple engines; add the Audit+Fix and Monitoring SKUs.

## License

MIT — see `LICENSE`.
