// Copia ligera de la iluminación del hangar para celulares y equipos de gama baja: la mitad de resolución (256 × 128),
// promediada en luz lineal (no en bytes RGBE), y sin compresión RLE para que gzip la reduzca. En el visor sólo alimenta
// los reflejos difusos y borrosos del PMREM, donde la diferencia con la versión de 512 × 256 apenas se ve.
// Uso: node src/hdr-small.mjs  (lee web/assets/hangar.hdr y escribe web/assets/hangar-256.hdr)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), "..", "web", "assets");
const src = readFileSync(join(ASSETS, "hangar.hdr"));

// cabecera: líneas de texto hasta una vacía, luego la de tamaño "-Y alto +X ancho"
let at = 0;
const line = () => { const end = src.indexOf(10, at); const s = src.toString("latin1", at, end); at = end + 1; return s; };
if (!line().startsWith("#?")) throw new Error("hangar.hdr no es un archivo Radiance");
while (line() !== "");
const size = /^-Y (\d+) \+X (\d+)$/.exec(line());
if (!size) throw new Error("orientación de hangar.hdr no admitida");
const H = Number(size[1]), W = Number(size[2]);

// píxeles RGBE, con líneas RLE nuevas (2 2 alto bajo) o planas
const rgbe = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++) {
  const row = rgbe.subarray(y * W * 4, (y + 1) * W * 4);
  if (src[at] === 2 && src[at + 1] === 2 && ((src[at + 2] << 8) | src[at + 3]) === W) {
    at += 4;
    for (let c = 0; c < 4; c++) {
      for (let x = 0; x < W; ) {
        let n = src[at++];
        if (n > 128) { n -= 128; const v = src[at++]; while (n--) row[4 * x++ + c] = v; }
        else while (n--) row[4 * x++ + c] = src[at++];
      }
    }
  } else { row.set(src.subarray(at, at + W * 4)); at += W * 4; }
}

// RGBE → lineal, promedio 2 × 2, lineal → RGBE
const lin = (i, c) => (rgbe[i + 3] ? rgbe[i + c] * 2 ** (rgbe[i + 3] - 136) : 0);
const w = W / 2, h = H / 2, out = new Uint8Array(w * h * 4);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const px = [0, 0, 0];
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const i = ((2 * y + dy) * W + 2 * x + dx) * 4;
    for (let c = 0; c < 3; c++) px[c] += lin(i, c) / 4;
  }
  const o = (y * w + x) * 4, m = Math.max(...px);
  if (m < 1e-32) continue;
  const e = Math.ceil(Math.log2(m)) + (m === 2 ** Math.ceil(Math.log2(m)) ? 1 : 0);
  const k = 256 / 2 ** e;
  for (let c = 0; c < 3; c++) out[o + c] = Math.min(255, Math.floor(px[c] * k));
  out[o + 3] = e + 128;
}
const head = Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${h} +X ${w}\n`, "latin1");
writeFileSync(join(ASSETS, "hangar-256.hdr"), Buffer.concat([head, Buffer.from(out)]));
console.log(`hangar-256.hdr: ${w} × ${h}, ${Math.round((head.length + out.length) / 1024)} KB`);
