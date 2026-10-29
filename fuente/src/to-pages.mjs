// Prepara la carpeta del sitio público (repo mw54-microturbina, servido por GitHub Pages): el visor 3D en la raíz,
// la figura técnica en /anatomia/, imagen para redes, robots y sitemap. El código fuente sigue en este repo privado.
// Uso: node src/to-pages.mjs [carpeta del sitio]   (por defecto, ../mw54-microturbina)
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTHOR, SITE, PORTFOLIO, seoHead } from "./seo.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(process.argv[2] ?? join(ROOT, "..", "mw54-microturbina"));
mkdirSync(join(OUT, "anatomia"), { recursive: true });
copyFileSync(join(ROOT, "src", "model.mjs"), join(ROOT, "web", "model.js"));
for (const f of ["app.js", "flight.js", "model.js", "mw54.glb"]) copyFileSync(join(ROOT, "web", f), join(OUT, f));
const head = seoHead({
  title: `Wren MW54 en un entrenador a reacción · visor 3D interactivo · ${AUTHOR}`,
  description: `Visor 3D interactivo por ${AUTHOR}: la microturbina Wren MW54 según sus planos, instalada en una maqueta 1:7 de un entrenador tipo Hawk. Montaje y despiece, tren retráctil con compuertas, mandos de vuelo, mezcla de combustible, cámara de combustión, mapa de calor de materiales y simulador de vuelo.`,
  url: SITE,
  name: "Wren MW54 en un entrenador a reacción",
});
writeFileSync(join(OUT, "index.html"), readFileSync(join(ROOT, "web", "index.html"), "utf8").replace("<!--SEO-->", head));
copyFileSync(join(ROOT, "dist", "index.html"), join(OUT, "anatomia", "index.html"));
copyFileSync(join(ROOT, "dist", "light.html"), join(OUT, "anatomia", "light.html"));
writeFileSync(join(OUT, ".nojekyll"), "");
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}</loc><lastmod>${today}</lastmod></url>\n  <url><loc>${SITE}anatomia/</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`);
writeFileSync(
  join(OUT, "README.md"),
  `# Wren MW54 · visor 3D y anatomía\n\n**Español** · [English](#english)\n\nPor **${AUTHOR}**. La microturbina Wren MW54 según sus planos, instalada en una maqueta 1:7 de un entrenador a reacción: montaje y despiece, tren retráctil con compuertas, mandos de vuelo, mezcla de combustible, cámara de combustión, mapa de calor de materiales y simulador de vuelo. Figura técnica en [/anatomia/](${SITE}anatomia/).\n\nVer en línea: ${SITE} · Portafolio: ${PORTFOLIO}\n\n---\n\n## English\n\nBy **${AUTHOR}**. The Wren MW54 micro-turbine built from its plans and installed in a 1:7 model of a jet trainer: assembly and exploded view, retractable gear with doors, flight controls, fuel mixture, combustion camera, live materials heat map and a flight simulator. Technical figure at [/anatomia/](${SITE}anatomia/).\n\nView online: ${SITE} · Portfolio: ${PORTFOLIO}\n`,
);
execFileSync("python", ["-c", `from PIL import Image, ImageOps; im = Image.open(r"${join(ROOT, "shots", "hawk-v3.png")}").convert("RGB"); im = ImageOps.fit(im, (1200, 630), centering=(0.5, 0.5)); im.save(r"${join(OUT, "og.png")}", "PNG", optimize=True)`], { stdio: "inherit" });
console.log("sitio listo en", OUT);
