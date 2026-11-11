/**
 * Minimal zero-dependency static server for this folder.
 *
 *   node serve.cjs          -> http://127.0.0.1:4173/
 *   node serve.cjs 8080     -> http://127.0.0.1:8080/
 *
 * Any other static host (Netlify, Cloudflare Pages, GitHub Pages, nginx,
 * `python -m http.server`, `npx serve`) works just as well.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.argv[2] || 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let file = path.join(root, urlPath);

    if (!file.startsWith(root)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, "index.html");
    }
    if (!fs.existsSync(file) && fs.existsSync(file + ".html")) {
      file += ".html";
    }
    if (!fs.existsSync(file)) {
      // Real 404 status (never a soft 404) with the styled error page when present.
      const notFound = path.join(root, "404.html");
      if (fs.existsSync(notFound)) {
        res.writeHead(404, { "Content-Type": TYPES[".html"], "Cache-Control": "no-cache" });
        fs.createReadStream(notFound).pipe(res);
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`Wave Car Studio (static) -> http://127.0.0.1:${port}/`);
  });
