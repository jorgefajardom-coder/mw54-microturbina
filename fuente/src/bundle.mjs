// Empaqueta el visor para el sitio publicado: cada página queda en un archivo minificado con three.js incluido, y lo
// que comparten (three.js, el núcleo de los aviones, la interfaz de celular o de escritorio) va en trozos comunes que el
// navegador guarda en caché una sola vez. Así la página no depende de un CDN ni encadena decenas de módulos sueltos.
// El código fuente sigue en web/ como módulos sin empaquetar (con su importmap), para probarlo en local tal cual.
import { build } from "esbuild";
import { rmSync } from "node:fs";
import { join, relative } from "node:path";

// página → módulo de entrada (relativo a web/)
export const ENTRIES = { hawk: "js/app.js", sr72: "sr72/app.js", f22: "f22/app.js", f14: "f14/app.js", sr71: "sr71/app.js", aero: "aero/aero.js" };

// Devuelve, por página, el archivo de entrada y los trozos que importa de forma estática (para precargarlos).
export async function bundle(webDir, outDir) {
  const jsDir = join(outDir, "js");
  rmSync(jsDir, { recursive: true, force: true });
  const result = await build({
    entryPoints: Object.fromEntries(Object.entries(ENTRIES).map(([name, src]) => [name, join(webDir, src)])),
    outdir: jsDir,
    bundle: true,
    splitting: true,
    format: "esm",
    minify: true,
    target: ["es2022", "chrome89", "safari15", "firefox89"],
    entryNames: "[name]-[hash]",
    chunkNames: "chunks/[name]-[hash]",
    metafile: true,
    legalComments: "linked",
    logLevel: "warning",
  });
  const rel = (p) => relative(outDir, p).replaceAll("\\", "/");
  const out = {};
  const outputs = result.metafile.outputs;
  // todo lo que la página va a pedir, también lo que llega por import() (la interfaz y three.js), para precargarlo
  // en paralelo en vez de descubrirlo módulo a módulo
  const closure = (file, seen = new Set()) => {
    for (const i of outputs[file]?.imports ?? []) if (!i.external && !seen.has(i.path)) { seen.add(i.path); closure(i.path, seen); }
    return seen;
  };
  for (const [file, info] of Object.entries(outputs)) {
    if (!info.entryPoint) continue;
    const name = Object.keys(ENTRIES).find((n) => info.entryPoint.replaceAll("\\", "/").endsWith(`web/${ENTRIES[n]}`));
    out[name] = { file: rel(file), preload: [...closure(file)].map(rel) };
  }
  return out;
}

// Cambia el arranque de una página fuente por su paquete: quita el importmap y la conexión al CDN, y precarga los trozos.
// `up` es el prefijo hasta la raíz del sitio ("./" en la raíz, "../" en una subcarpeta).
export function useBundle(html, entry, up) {
  const preload = [entry.file, ...entry.preload].map((f) => `<link rel="modulepreload" href="${up}${f}">`).join("\n");
  const swapped = html
    .replace(/<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net">\n?/, "")
    .replace(/<link rel="modulepreload" href="https:\/\/cdn\.jsdelivr\.net[^"]*">/, preload)
    .replace(/<script type="importmap">[^<]*<\/script>\n?/, "")
    .replace(/<script type="module" src="\.\/(app|aero)\.js"><\/script>|<script type="module" src="\.\/js\/app\.js"><\/script>/, `<script type="module" src="${up}${entry.file}"></script>`);
  if (swapped.includes("cdn.jsdelivr.net") || swapped.includes("importmap") || !swapped.includes(entry.file)) throw new Error(`no se pudo cambiar el arranque por ${entry.file}`);
  return swapped;
}
