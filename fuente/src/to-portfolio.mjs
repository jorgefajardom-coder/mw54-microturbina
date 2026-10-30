// Copia la figura construida al portafolio (portfolio-3d/public/lab/mw54/) y hace su miniatura.
// Uso: node src/to-portfolio.mjs [ruta del portafolio]   (por defecto, ../portfolio-3d)
import { copyFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORTFOLIO = resolve(process.argv[2] ?? join(ROOT, "..", "portfolio-3d"));
const LAB = join(PORTFOLIO, "public", "lab", "mw54");
mkdirSync(LAB, { recursive: true });
copyFileSync(join(ROOT, "dist", "index.html"), join(LAB, "index.html"));
copyFileSync(join(ROOT, "dist", "light.html"), join(LAB, "light.html"));

// Miniatura: el motor en marcha a los 8 s, recortada a la tarjeta y pasada a WebP.
const shot = join(ROOT, "shots", "portfolio-thumb.png");
const drive = join(ROOT, ".claude", "skills", "anatomy", "scripts", "drive.mjs");
execFileSync("node", [drive, join(ROOT, "dist", "index.html"), JSON.stringify([["wait", 300], ["key", "Escape"], ["key", "a"], ["wait", 8000], ["shot", shot, ".mw-stage", 1]]), "--height", "1300"], { stdio: "inherit" });
execFileSync("python", ["-c", `from PIL import Image; im = Image.open(r"${shot}").convert("RGB"); im.thumbnail((1200, 1200)); im.save(r"${join(PORTFOLIO, "public", "images", "mw54-anatomia.webp")}", "WEBP", quality=82)`], { stdio: "inherit" });
console.log("copiado a", LAB);
