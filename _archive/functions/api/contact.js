/**
 * Cloudflare Pages Function — POST /api/contact
 * ---------------------------------------------------------------------------
 * Kept for Pages compatibility. The implementation lives in `lib/contact.js`
 * so the Worker entry (`worker.js`) and this Function share one code path.
 *
 * On the live site the request is handled by `worker.js`; Pages never sees it.
 */

import { handleContact, methodNotAllowed } from "../../lib/contact.js";

export async function onRequestPost({ request, env }) {
  return handleContact(request, env);
}

export async function onRequestGet() {
  return methodNotAllowed();
}
