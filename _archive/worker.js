/**
 * Cloudflare Worker — Wave Car Studio static site + contact endpoint
 * ---------------------------------------------------------------------------
 * The site itself is a set of static files in this directory, uploaded as
 * Workers static assets. This entry only exists to run the enquiry form:
 *
 *   POST /api/contact   -> handleContact()  (Zoho Mail API and fallbacks)
 *   GET  /api/contact   -> 405 JSON
 *   anything else       -> env.ASSETS.fetch(request)
 *
 * `wrangler.jsonc` sets `assets.run_worker_first: ["/api/*"]`, so static
 * requests bypass this script and are served straight from the edge.
 */

import { handleContact, methodNotAllowed } from "./lib/contact.js";

const CONTACT_PATH = "/api/contact";

function notFound() {
  return new Response(JSON.stringify({ success: false, message: "Not found." }), {
    status: 404,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === CONTACT_PATH || pathname === `${CONTACT_PATH}/`) {
      if (request.method !== "POST") return methodNotAllowed();
      return handleContact(request, env);
    }

    // Unknown API routes should be a JSON 404, never the HTML site.
    if (pathname === "/api" || pathname.startsWith("/api/")) return notFound();

    return env.ASSETS.fetch(request);
  },
};
