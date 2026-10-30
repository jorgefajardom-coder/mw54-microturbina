// Servidor estático mínimo para probar el visor en local con los tipos MIME correctos.
// Uso: node src/serve.mjs [carpeta] [puerto]
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const ROOT = resolve(process.argv[2] ?? "web");
const PORT = Number(process.argv[3] ?? 8765);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary", ".png": "image/png", ".webp": "image/webp", ".css": "text/css", ".svg": "image/svg+xml" };
createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path.endsWith("/")) path += "index.html";
  try {
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("no encontrado");
  }
}).listen(PORT, "127.0.0.1", () => console.log(`sirviendo ${ROOT} en http://127.0.0.1:${PORT}/`));
