// Prepara la carpeta del sitio público (repo mw54-microturbina, servido por GitHub Pages): el visor 3D en la raíz,
// la figura técnica en /anatomia/, imagen para redes, robots y sitemap. El código fuente sigue en este repo privado.
// Uso: node src/to-pages.mjs [carpeta del sitio]   (por defecto, ../mw54-microturbina)
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AUTHOR, SITE, PORTFOLIO, seoHead } from "./seo.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(process.argv[2] ?? join(ROOT, "..", "mw54-microturbina"));
mkdirSync(join(OUT, "anatomia"), { recursive: true });
for (const d of ["sr72", "f22", "f14", "sr71", "jet"]) mkdirSync(join(OUT, d), { recursive: true });
copyFileSync(join(ROOT, "src", "model.mjs"), join(ROOT, "web", "model.js"));
for (const f of ["app.js", "core.js", "desktop.js", "mobile.js", "device.js", "flight.js", "controls.js", "floor.js", "base.css", "desktop.css", "mobile.css", "model.js", "mw54.glb", "hangar.hdr"]) copyFileSync(join(ROOT, "web", f), join(OUT, f));
const head = seoHead({
  title: `Wren MW54 en un entrenador a reacción · visor 3D interactivo · ${AUTHOR}`,
  description: `Visor 3D interactivo por ${AUTHOR}: la microturbina Wren MW54 según sus planos, instalada en una maqueta 1:7 de un entrenador tipo Hawk. Montaje y despiece, tren retráctil con compuertas, mandos de vuelo, mezcla de combustible, cámara de combustión, mapa de calor de materiales y simulador de vuelo.`,
  url: SITE,
  name: "Wren MW54 en un entrenador a reacción",
});
writeFileSync(join(OUT, "index.html"), readFileSync(join(ROOT, "web", "index.html"), "utf8").replace("<!--SEO-->", head));
for (const f of ["core.js", "desktop.js", "mobile.js", "boot.js"]) copyFileSync(join(ROOT, "web", "jet", f), join(OUT, "jet", f));
const JETS = {
  sr72: {
    title: `Lockheed Martin SR-72 y su motor TBCC · visor 3D interactivo · ${AUTHOR}`,
    description: `Visor 3D interactivo por ${AUTHOR}: el concepto SR-72 de Skunk Works con la forma del Darkstar de Top Gun: Maverick y sus dos motores de ciclo combinado (turbofán y estatorreactor ramjet/scramjet en disposición over-under). Montaje y despiece, compuerta divisora y rampa de entrada que se mueven con el Mach, corte con el flujo coloreado por temperatura, perfil de misión hasta Mach 6 y mapa de calor de materiales.`,
    name: "Lockheed Martin SR-72 y su motor de ciclo combinado",
  },
  f22: {
    title: `F-22 Raptor y sus motores F119 · visor 3D interactivo · ${AUTHOR}`,
    description: `Visor 3D interactivo por ${AUTHOR}: el Lockheed Martin F-22 Raptor a escala real con sus dos Pratt & Whitney F119. Fan de 3 etapas, compresor de 6, turbinas contrarrotativas, postquemador y tobera bidimensional de empuje vectorial; supercrucero, corte con el flujo, despiece y mapa de calor de materiales.`,
    name: "F-22 Raptor y sus motores F119",
  },
  f14: {
    title: `F-14 Tomcat y sus motores F110 · visor 3D interactivo · ${AUTHOR}`,
    description: `Visor 3D interactivo por ${AUTHOR}: el Grumman F-14D Tomcat a escala real según las cotas de su manual NATOPS, con sus dos General Electric F110-GE-400. Alas de geometría variable que se mueven de 20° a 68° con el Mach, rampas de la toma, corte con el flujo, despiece del motor y mapa de calor de materiales.`,
    name: "F-14 Tomcat y sus motores F110",
  },
  sr71: {
    title: `SR-71 Blackbird y sus motores J58 · visor 3D interactivo · ${AUTHOR}`,
    description: `Visor 3D interactivo por ${AUTHOR}: el Lockheed SR-71 Blackbird a escala real con sus dos Pratt & Whitney J58. Cono de entrada que se retrasa con el Mach, tubos de derivación al postquemador, eyector, perfil de misión a Mach 3,2, corte con el flujo, despiece y mapa de calor de materiales.`,
    name: "SR-71 Blackbird y sus motores J58",
  },
};
for (const [jet, meta] of Object.entries(JETS)) {
  for (const f of ["app.js", "config.js", "sim.js", "parts.json", `${jet}.glb`]) copyFileSync(join(ROOT, "web", jet, f), join(OUT, jet, f));
  const html = readFileSync(join(ROOT, "web", jet, "index.html"), "utf8").replace("<!--SEO-->", seoHead({ ...meta, url: `${SITE}${jet}/` }));
  writeFileSync(join(OUT, jet, "index.html"), html);
}
copyFileSync(join(ROOT, "dist", "index.html"), join(OUT, "anatomia", "index.html"));
copyFileSync(join(ROOT, "dist", "light.html"), join(OUT, "anatomia", "light.html"));
writeFileSync(join(OUT, ".nojekyll"), "");
writeFileSync(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}sitemap.xml\n`);
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}</loc><lastmod>${today}</lastmod></url>\n  <url><loc>${SITE}sr72/</loc><lastmod>${today}</lastmod></url>\n  <url><loc>${SITE}f22/</loc><lastmod>${today}</lastmod></url>\n  <url><loc>${SITE}f14/</loc><lastmod>${today}</lastmod></url>\n  <url><loc>${SITE}sr71/</loc><lastmod>${today}</lastmod></url>\n  <url><loc>${SITE}anatomia/</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`);
writeFileSync(
  join(OUT, "README.md"),
  `# Wren MW54 · visor 3D y anatomía\n\n**Español** · [English](#english)\n\nPor **${AUTHOR}**. La microturbina Wren MW54 según sus planos, instalada en una maqueta 1:7 de un entrenador a reacción: montaje y despiece, tren retráctil con compuertas, cabina en tándem con mandos que se mueven, mezcla de combustible, cámara de combustión, mapa de calor de materiales y simulador de vuelo con palancas táctiles para celular y mando de juego. Además, a escala real y con sus motores en despiece: el concepto SR-72 de Lockheed Martin y su ciclo combinado en [/sr72/](${SITE}sr72/), el F-22 Raptor con sus F119 en [/f22/](${SITE}f22/), el F-14 Tomcat con sus F110 en [/f14/](${SITE}f14/) y el SR-71 Blackbird con sus J58 en [/sr71/](${SITE}sr71/). Cada página se adapta al dispositivo: interfaz propia para celular y para escritorio. Figura técnica en [/anatomia/](${SITE}anatomia/).\n\nVer en línea: ${SITE} · Portafolio: ${PORTFOLIO}\n\n---\n\n## English\n\nBy **${AUTHOR}**. The Wren MW54 micro-turbine built from its plans and installed in a 1:7 model of a jet trainer: assembly and exploded view, retractable gear with doors, tandem cockpit with moving controls, fuel mixture, combustion camera, live materials heat map and a flight simulator with touch sticks for phones and gamepad support. Also at full scale with their engines in exploded view: the Lockheed Martin SR-72 concept and its combined cycle at [/sr72/](${SITE}sr72/), the F-22 Raptor with its F119s at [/f22/](${SITE}f22/), the F-14 Tomcat with its F110s at [/f14/](${SITE}f14/) and the SR-71 Blackbird with its J58s at [/sr71/](${SITE}sr71/). Every page adapts to the device, with its own phone and desktop interface. Technical figure at [/anatomia/](${SITE}anatomia/).\n\nView online: ${SITE} · Portfolio: ${PORTFOLIO}\n`,
);
// la imagen para redes sale de una captura del visor; si no la hay, se conserva la que ya tiene el sitio
if (existsSync(join(ROOT, "shots", "hawk-v3.png"))) execFileSync("python", ["-c", `from PIL import Image, ImageOps; im = Image.open(r"${join(ROOT, "shots", "hawk-v3.png")}").convert("RGB"); im = ImageOps.fit(im, (1200, 630), centering=(0.5, 0.5)); im.save(r"${join(OUT, "og.png")}", "PNG", optimize=True)`], { stdio: "inherit" });
console.log("sitio listo en", OUT);
