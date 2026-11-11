# Wave Car Studio — static HTML build

A plain HTML/CSS/JS mirror of the React site in this repository. Same markup,
same compiled design system, same behaviour — no React, no build step, no
`node_modules`.

```
static-html/
├── index.html            ← src/routes/index.tsx      (Home)
├── services.html         ← src/routes/services.tsx   (Services)
├── about.html            ← src/routes/about.tsx      (About Us)
├── contact.html          ← src/routes/contact.tsx    (Contact)
├── serve.cjs             ← tiny local web server
├── worker.js             ← Worker entry: optional /api/contact + static assets
├── wrangler.jsonc        ← Worker name, assets binding, run_worker_first
├── .assetsignore         ← keeps build files out of the public upload
├── .dev.vars.example     ← template for local secrets (optional transports)
├── zoho-setup.mjs        ← local helper for the optional Zoho transport
├── _routes.json          ← Pages-only fallback (unused by the Worker)
├── lib/
│   └── contact.js        ← optional server-side send logic (Zoho + fallbacks)
├── functions/
│   └── api/
│       └── contact.js    ← Pages-compatible re-export of lib/contact.js
├── favicon.ico           ← 16 / 32 / 48 multi-size icon
├── favicon.svg           ← 512 dark tile + embedded wordmark
├── site.webmanifest      ← PWA manifest (48 / 96 / 192 / 512)
├── robots.txt            ← crawl rules + Sitemap line
├── sitemap.xml           ← all four pages (clean URLs)
├── _redirects            ← 301s for .html and the old site's URLs
├── _headers             ← security response headers
├── css/
│   ├── tailwind.css      ← compiled from src/styles.css (tokens + utilities)
│   └── site.css          ← behaviour layer (header state, nav active, reveal)
├── js/
│   └── site.js           ← SiteHeader + Reveal + CalibrationPanel + contact form
├── img/
│   ├── wave-car-studio.png     ← header/footer lockup
│   ├── wave-logo.png           ← hero wordmark
│   ├── og-image.png            ← 1200×630 social card
│   ├── icon-1024.png           ← master icon
│   ├── favicon-48x48.png       ← Google search favicon
│   ├── favicon-96x96.png       ← Google search favicon
│   ├── favicon-192x192.png     ← manifest / Android
│   ├── favicon-512x512.png     ← manifest / JSON-LD logo
│   ├── favicon-32x32.png
│   ├── favicon-16x16.png
│   ├── apple-touch-icon.png    ← 180×180 iOS
│   └── wcs-emblem.png          ← unused in the current pages
└── video/
    ├── hero.mp4                ← hero background
    └── acoustic-sweep.mp4      ← unused in the current pages
```

## Run it

```powershell
cd "C:\Users\ROG HERO\Documents\Default Project\WaveCarStudio\static-html"
node serve.cjs            # http://127.0.0.1:4173/
```

Any static host works — Netlify, Cloudflare Pages, GitHub Pages, nginx,
`python -m http.server`, `npx serve`. Upload the contents of this folder as-is.
The **form works on any of them too**, because it posts straight to Web3Forms;
the Cloudflare Worker is only how the live domain happens to be served.

## Brand icons (why Google now shows the WAVE mark)

Google's search favicon needs a **square icon in a 48px multiple** (48, 96, 144,
192, 512). The old `favicon.png` was 64×64, which Google ignores.

This build ships a full set generated from the hero WAVE wordmark on the brand
background `#0A0C0F`:

| File | Size | Purpose |
| --- | --- | --- |
| `favicon.ico` | 16 / 32 / 48 | browser tabs, legacy |
| `favicon.svg` | 512 | modern browsers (dark `<rect>` + base64 PNG `<image>`) |
| `img/favicon-48x48.png` | 48 | Google search favicon |
| `img/favicon-96x96.png` | 96 | Google search favicon |
| `img/favicon-192x192.png` | 192 | manifest / Android / msapplication |
| `img/favicon-512x512.png` | 512 | manifest / JSON-LD `logo` |
| `img/apple-touch-icon.png` | 180 | iOS home screen |

Every page declares them in `<head>` alongside `site.webmanifest`, `theme-color`
and the `msapplication-*` tags. The JSON-LD `AutomotiveBusiness.logo` points at
`img/favicon-512x512.png`, so search engines have an explicit logo reference.

## Crawl structure (why the sections read cleanly)

The page body is one flat landmark tree:

```
<body>                     ← min-h-screen bg-background text-foreground
  <header>                 ← primary nav
  <main>
    <section aria-labelledby="…">
      <h1> / <h2>          ← one heading per section, with a stable id
      <article>            ← cards, each with its own <h3>
    </section>
  </main>
  <footer>
</body>
```

- Every `<section>` carries `aria-labelledby` pointing at its heading.
- One `<h1>` per page; sections use `<h2>`; cards use `<h3>`.
- The decorative `01 — Introduction` style labels are real `<h2>`s on the
  services/about pages and remain visual labels elsewhere.
- The `.reveal` class sits on the inner shell, **not** on `<section>`, so section
  borders and the paper background never fade.
- Footer column titles are `<p class="label">` (not headings), and the contact
  details are wrapped in `<address>`.
- No wrapper `<div>` around the page — the body carries the layout classes.

## SEO files

- `robots.txt` — allows Googlebot, Googlebot-Image, Bingbot, Twitterbot and
  facebookexternalhit, and ends with `Sitemap: https://wavecarstudio.co.in/sitemap.xml`.
- `sitemap.xml` — the four pages with `lastmod`, `changefreq`, `priority`.
- `site.webmanifest` — name, theme/background colour, icon set.
- Per-page `<head>` — canonical, `og:url`, `og:image` (1200×630), Twitter card,
  `robots: index, follow, max-image-preview:large`, and JSON-LD `@graph`
  (`AutomotiveBusiness` + `WebPage` + `WebSite` + `BreadcrumbList`).

Canonical URLs are the **clean** form with no `.html`:

```
https://wavecarstudio.co.in/
https://wavecarstudio.co.in/services
https://wavecarstudio.co.in/about
https://wavecarstudio.co.in/contact
```

Every internal link, the canonical tag, `og:url`, the JSON-LD `url`/`@id`, the
breadcrumb and the sitemap all use these four URLs, so there is nothing to
redirect for normal navigation. Change all four together if the domain differs.

## URLs, redirects and headers

The site has no `.html` in any link. The static host serves `/services` from
`services.html` (Cloudflare Workers does this automatically; `serve.cjs` does it
locally; Netlify/Pages do it too).

- **`_redirects`** (12 rules) keeps the old site's URLs alive with **301s**:
  `/audit`, `/acoustic-systems`, `/doorstep-service`, `/faq` (and their `.html`
  forms) → `/services`, and every `.html` → its clean URL. Edit the target if you
  later add a dedicated FAQ or audit page.
- **`_headers`** adds `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options` and `Permissions-Policy` to every response.
- Both files are parsed by the platform and are **not** served (they 404 if you
  request them directly).

Verified against the real Worker: all four clean pages return `200`, all `.html`
and legacy URLs return `301`, and `_redirects` / `_headers` / build files return
`404`.

## Adding social media links (when ready)

Three places, all optional. Send me the URLs and I will wire them in on all four
pages:

1. **Footer** — each page's `<footer>` has a Home / Services / About Us /
   Contact list. Add anchored links next to them, reusing the existing classes
   (`text-foreground/80 transition-colors hover:text-primary`) so they match.
2. **JSON-LD `sameAs`** — each page's `<head>` has
   `"sameAs":["https://wave.net.in"]` on the `AutomotiveBusiness` object. Add the
   profile URLs there so Google links the business to them:
   `"sameAs":["https://wave.net.in","https://www.instagram.com/…","https://www.facebook.com/…"]`
3. **Contact page** — an extra row in the contact details block, if you want them
   shown there too.

Tip: use full `https://` URLs, and keep the same order on every page so the
markup stays consistent.

## How the React app maps to the static build

### Pages

| React route | File | `<title>` | Active nav |
| --- | --- | --- | --- |
| `/` | `index.html` | Wave Car Studio — Automotive Solutions, Thoughtfully Delivered | Home |
| `/services` | `services.html` | Services — Wave Car Studio | Services |
| `/about` | `about.html` | About Us — Wave Car Studio | About Us |
| `/contact` | `contact.html` | Contact — Wave Car Studio | Contact |

### Components

| React source | Static equivalent |
| --- | --- |
| `src/routes/__root.tsx` | the shared `<head>` block on every page (meta, icons, OG tags, JSON-LD, fonts, CSS) |
| `src/components/SiteHeader.tsx` | `<header class="site-header">` at the top of each page |
| `src/components/SiteFooter.tsx` | `<footer>` at the bottom of each page |
| `src/components/Hero.tsx` | `index.html` → `<section id="top">` |
| `src/components/Sections.tsx` → `Introduction` | `index.html` → `<section id="introduction">` |
| `src/components/Sections.tsx` → `ServicesPreview` | `index.html` → `<section id="services">` |
| `src/components/Sections.tsx` → `Approach` | `index.html` → `<section id="approach">` |
| `src/components/Sections.tsx` → `Conversation` | `index.html` → `<section id="conversation">` |
| `src/components/Sections.tsx` → `ContactInvite` | `index.html` → `<section id="contact" class="tone-paper">` |
| `src/components/CalibrationPanel.tsx` | `services.html` → `[data-calibration]` + `site.js` |
| `src/components/Reveal.tsx` | `class="reveal"` + IntersectionObserver in `site.js` |
| `src/components/site.ts` (`NAV`, `CONTACTS`, `SERVICES`) | content written into the pages; contacts duplicated in `site.js` for the form |
| `src/styles.css` | `css/tailwind.css` (compiled) + `css/site.css` (added behaviour) |

### Design system

`css/tailwind.css` is the **compiled** output of `src/styles.css` — the same file
the React app serves. It carries the whole design system unchanged:

- oklch colour tokens (`--background`, `--primary`, `--hairline`, `--paper`, …)
- the `@theme inline` mapping (`bg-primary`, `text-muted-foreground`, …)
- typography utilities: `display-xl`, `display-lg`, `label`, `nav-link`, `btn-label`
- the inverted `.tone-paper` section scope
- motion: `hero-in`, `slow-zoom`, `wave-bar`, `reveal-*`, reduced-motion rules
- fonts: Syne (display), Manrope (body), JetBrains Mono — loaded from Google Fonts

Because the CSS is pre-compiled, **only class names that already existed in the
React source work**. If you add a new Tailwind utility to a page, re-export the
CSS from the project (`npm run dev` and fetch `/src/styles.css?direct`, or run a
real build) rather than expecting it to appear automatically.

### Behaviour (`js/site.js`)

Four React components were interactive; each is re-implemented in vanilla JS:

1. **Header** — `.site-header` gets `.is-solid` when scrolled past 16px, when the
   mobile drawer is open, or always on non-overlay pages. Mobile drawer is
   `#mobile-nav[data-open="true"]`, body scroll locks, hamburger becomes an X.
2. **Reveal** — blocks with `.reveal` that start below the fold get
   `.reveal-pending` and fade up on intersection (same 24px / 0.9s curve).
   Anything already on screen renders immediately, so content is never hidden
   when JS is off.
3. **Calibration panel** — the two `role="tab"` buttons swap bar heights,
   bar colours and the four readouts between the factory and calibrated profiles.
4. **Enquiry form** — validates, then POSTs JSON to Web3Forms and shows the
   sent / error state in place. If the endpoint is unreachable, it opens a
   prefilled `mailto:` draft so the enquiry is never lost.

## Contact form delivery (Web3Forms)

The form posts directly to **Web3Forms** (`https://api.web3forms.com/submit`),
which delivers the enquiry by email to **audit@wavecarstudio.co.in**.

**Why not Zoho directly?** The domain's mail is hosted on Zoho
(MX: `mx.zoho.in`), but a website cannot send *as* the domain without a
credential, and Cloudflare Workers cannot open an SMTP connection. Web3Forms is
a form relay — it sends the mail on the site's behalf, so **your Zoho account,
mailbox and DNS are never touched**. It also makes the site fully static: the
form works on any host.

### One-time setup (about 2 minutes)

1. Create an access key at <https://web3forms.com/#start>. Enter
   **audit@wavecarstudio.co.in** as the email — the key is sent there.
2. Paste the key into `contact.html`, replacing `YOUR_WEB3FORMS_ACCESS_KEY`:

   ```html
   <input type="hidden" name="access_key" value="YOUR_KEY_HERE" />
   ```

3. *(Recommended)* In the Web3Forms dashboard, restrict the key to
   `wavecarstudio.co.in` so nobody else can post with it.

The key is public by design (it ships inside the HTML), which is why the domain
restriction matters. Free tier: 250 submissions/month.

### How it is wired

- **JavaScript on** — `js/site.js` POSTs the form as JSON and shows the in-page
  "Thank you" state without navigating.
- **JavaScript off** — the form posts natively to Web3Forms, and its `redirect`
  field returns the visitor to `/contact?sent=1`, which the script shows as the
  sent state.
- **If Web3Forms is unreachable** — the visitor's mail app opens with the
  enquiry prefilled, so nothing is lost.
- **Honeypot** — the hidden `botcheck` field catches bots; Web3Forms silently
  accepts and drops those submissions.
- **Reply-To** — set automatically when the visitor leaves an email address.

### Optional — server-side transports (currently inactive)

`lib/contact.js`, `functions/api/contact.js` and the `/api/contact` route in
`worker.js` are kept for a future server-side setup where the sending key never
reaches the browser. They are **not used** by the current form. The code
supports, in priority order:

| Priority | Transport | Required secrets |
| --- | --- | --- |
| 1 | **Zoho Mail API** (existing mailbox) | `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` |
| 2 | **Zoho ZeptoMail** (transactional add-on) | `ZEPTOMAIL_TOKEN` |
| 3 | **Cloudflare Email Service** (paid plan) | `EMAIL` binding |
| 4 | **Resend** (fallback) | `RESEND_API_KEY` |

#### Zoho Mail API details

1. Open the Zoho API Console for your data centre — India:
   <https://api-console.zoho.in>.
2. **Add Client → Server-based Application** (or **Self Client**).
3. Copy the **Client ID** and **Client Secret**.
4. Generate a grant code with the scopes
   `ZohoMail.messages.CREATE,ZohoMail.accounts.READ`.
5. Exchange the grant code for a refresh token (valid indefinitely). Use the
   same redirect URI you registered for the client:

   ```powershell
   $body = @{
     grant_type    = "authorization_code"
     client_id     = "YOUR_CLIENT_ID"
     client_secret = "YOUR_CLIENT_SECRET"
     code          = "YOUR_GRANT_CODE"
     redirect_uri  = "YOUR_REDIRECT_URI"
   }
   Invoke-RestMethod -Method Post -Uri "https://accounts.zoho.in/oauth/v2/token" -Body $body
   ```

   The response contains `refresh_token`. Store it as a secret.
6. Add the secrets to the Worker (run from this folder):

   ```powershell
   npx wrangler secret put ZOHO_CLIENT_ID     --config wrangler.jsonc
   npx wrangler secret put ZOHO_CLIENT_SECRET --config wrangler.jsonc
   npx wrangler secret put ZOHO_REFRESH_TOKEN --config wrangler.jsonc
   ```

   Secrets are stored on the Worker, not in this folder — do not commit them.

7. Deploy:

   ```powershell
   npx wrangler deploy --config wrangler.jsonc
   ```

   `wrangler.jsonc` already sets `name = "wavecarstudio-html-v5"`, so this
   replaces the code and assets of the Worker that currently serves the apex
   domain. **Test on the `*.workers.dev` URL first** (see below) if you want to
   check the form before switching the live site.

> **Why `--config`?** The repository root contains a generated
> `.wrangler/deploy/config.json` (from the React/TanStack build) that points at
> `.output/server/wrangler.json`. Without `--config`, Wrangler sees two config
> files and refuses to run. Passing `--config wrangler.jsonc` scopes every
> command to this folder.

The sender defaults to `audit@wavecarstudio.co.in`. To use a different sender,
set `CONTACT_FROM` to an address that exists in the Zoho account (or an alias).
The Worker extracts the address from `Name <email>`.

#### ZeptoMail

If ZeptoMail is enabled on your Zoho account, create a **Send Mail Token** and
set `ZEPTOMAIL_TOKEN`. The endpoint defaults to `api.zeptomail.in`; set
`ZEPTOMAIL_DC=com` for the US data centre. ZeptoMail requires the domain to be
verified in ZeptoMail (it adds its own DNS records).

#### Cloudflare Email Service / Resend

- **Cloudflare Email Service:** add an `EMAIL` binding of type "Email" (Workers
  Paid plan).
- **Resend:** set `RESEND_API_KEY` and verify the domain in Resend. Resend adds
  its own SPF/DKIM records, which must coexist with the existing
  `v=spf1 include:zoho.in ~all` record.

`wrangler.jsonc` sets `assets.run_worker_first: ["/api", "/api/*"]`, so only API
requests enter the Worker; every other request is served straight from the
static-asset edge. `.assetsignore` keeps `worker.js`, `lib/`, `functions/`,
`zoho-setup.mjs`, `serve.cjs`, `README.md`, `.dev.vars*` and the Wrangler config
out of the public upload.

### Deploying safely (this replaces the live build)

The Worker `wavecarstudio-html-v5` currently serves the **old 5-page site** at
`https://wavecarstudio.co.in`. Deploying from this folder replaces it with the
new build and the working contact form. The only prerequisite is the Web3Forms
access key above — there are no secrets to set.

1. **Preview on `workers.dev`** — deploy under a temporary name so the live
   domain is untouched:

   ```powershell
   npx wrangler deploy --config wrangler.jsonc --name wavecarstudio-html-preview
   ```

   Open `https://wavecarstudio-html-preview.<your-subdomain>.workers.dev/contact`
   and submit a test enquiry. It should arrive at `audit@wavecarstudio.co.in`.

2. **Then deploy the real Worker:**

   ```powershell
   npx wrangler deploy --config wrangler.jsonc
   ```

   Submit one final test on the live site.

### Optional variables

| Variable | Default |
| --- | --- |
| `CONTACT_TO` | `audit@wavecarstudio.co.in` |
| `CONTACT_FROM` | `Wave Car Studio <audit@wavecarstudio.co.in>` |
| `ZOHO_DC` | `in` (India; `com`, `eu`, `com.au`, `jp` as needed) |
| `ZOHO_ACCOUNT_ID` | looked up automatically |
| `ZEPTOMAIL_DC` | `in` |

### Local testing

- `node serve.cjs`, then open `http://127.0.0.1:4173/contact.html`. Because the
  form posts straight to Web3Forms, a local submit with a real access key
  **sends a real email** — no Worker, no secrets, no `.dev.vars`.
- `npx wrangler dev --config wrangler.jsonc` runs the full Worker at
  `http://127.0.0.1:8787/` if you want to test the deployed shape (static
  assets + optional `/api/contact`).
- `npx wrangler deploy --config wrangler.jsonc --dry-run` validates the config
  and the asset list without deploying.
- Verified: native POST wiring, AJAX payload (`access_key` / `subject` /
  `from_name` / `replyto` / `botcheck`), honeypot, success and error states, the
  `mailto:` fallback, the `?sent=1` return path, and non-exposure of build files.
- The optional server-side transport has its own suite: Zoho token/account/send,
  ZeptoMail, Resend, the Cloudflare binding, validation, provider failure and
  HTML escaping.

Contacts (phone, email, WhatsApp) are in `js/site.js` and in the page footers.

## Differences from the React version

These are intentional, and none of them change the rendered result:

- **No client-side router.** Links are real `.html` files, so each page is a full
  load. That is what makes it hostable anywhere.
- **No hydration.** The page is fully rendered in the HTML; `site.js` only adds
  behaviour.
- **Header state is CSS.** The React version toggled Tailwind class strings; here
  a `.is-solid` class and `aria-current="page"` do the same job (see `site.css`).
- **`og:image` / canonical use `https://wavecarstudio.co.in`**, matching the
  React source. Change them when you deploy if the domain differs.
- **`wcs-emblem.png` and `acoustic-sweep.mp4`** are copied from `src/assets` for
  parity but are not referenced by any page.

## Content map (for editing)

| Page | Sections, in order |
| --- | --- |
| `index.html` | hero → 01 Introduction → 02 Our Services → 03 Our Approach → 04 Conversation → Contact (paper) |
| `services.html` | page intro → Service Categories (4) → What Calibration Changes (RTA panel) → Need Help Choosing? |
| `about.html` | page intro → Our Approach (3 steps) → Building for the Future |
| `contact.html` | Contact details + Enquiry Form |

Every page shares the same header and footer markup; edit them in all four files
(or add a small include step if this becomes a maintained site).

## Regenerating the build

The page bodies, head block and SEO files are produced by two Node scripts kept
outside the site folder (in `%TEMP%\opencode`):

- `wcs-lib.cjs` — shared `<head>`, header, footer, page shell, JSON-LD
- `wcs-build.cjs` — the four page bodies + `robots.txt`, `sitemap.xml`,
  `site.webmanifest`

Run from that temp folder:

```powershell
node wcs-build.cjs "C:\Users\ROG HERO\Documents\Default Project\WaveCarStudio\static-html"
```

The icon set is generated separately from `img/wave-logo.png` with the brand
background `#0A0C0F` (see the icon table above).
