// Prepara la carpeta del sitio público (repo mw54-microturbina, servido por GitHub Pages): sólo la página
// construida, su imagen para redes, robots y sitemap. El código fuente sigue en este repo privado.
// Uso: node src/to-pages.mjs [carpeta del sitio]   (por defecto, ../mw54-microturbina)
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTHOR, SITE, PORTFOLIO } from "./seo.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(process.argv[2] ?? join(ROOT, "..", "mw54-microturbina"));
mkdirSync(OUT, { recursive: true });
copyFileSync(join(ROOT, "dist", "index.html"), join(OUT, "index.html"));
copyFileSync(join(ROOT, "dist", "light.html"), join(OUT, "light.html"));
writeFileSync(join(OUT, ".nojekyll"), "");
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`);
writeFileSync(
  join(OUT, "README.md"),
  `# Microturbina Wren MW54 · anatomía interactiva\n\n**Español** · [English](#english)\n\nFigura isométrica interactiva de la microturbina Wren MW54 por **${AUTHOR}**: despiece en el orden real de los planos, simulación de montaje, arranque con flujo de aire y análisis de materiales con puntos de fusión.\n\nVer en línea: ${SITE} · Portafolio: ${PORTFOLIO}\n\n---\n\n## English\n\nInteractive isometric figure of the Wren MW54 micro-turbine by **${AUTHOR}**: exploded view in the real disassembly order from the plans, assembly simulation, start-up with airflow, and a materials analysis with melting points.\n\nView online: ${SITE} · Portfolio: ${PORTFOLIO}\n`,
);
// Imagen para redes (1200 × 630): el motor en marcha.
const shot = join(ROOT, "shots", "og.png");
const drive = join(ROOT, ".claude", "skills", "anatomy", "scripts", "drive.mjs");
execFileSync("node", [drive, join(ROOT, "dist", "index.html"), JSON.stringify([["wait", 300], ["key", "Escape"], ["key", "a"], ["wait", 8000], ["shot", shot, ".mw-stage", 1]]), "--height", "1300"], { stdio: "inherit" });
execFileSync("python", ["-c", `from PIL import Image, ImageOps; im = Image.open(r"${shot}").convert("RGB"); im = ImageOps.fit(im, (1200, 630), centering=(0.5, 0.45)); im.save(r"${join(OUT, "og.png")}", "PNG", optimize=True)`], { stdio: "inherit" });
console.log("sitio listo en", OUT);
