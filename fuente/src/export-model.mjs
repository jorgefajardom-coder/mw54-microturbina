// Vuelca el modelo (estaciones, cantidades, materiales, despiece) a JSON para Blender y el visor 3D:
// así el modelo 3D y la figura técnica salen de los mismos números.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SPEC, S, COUNTS, PARTS, MOVES, STAGGER, ASSEMBLY } from "./model.mjs";
import { PLANE, SYSTEMS, TANK_ML, HOPPER_ML } from "./aircraft-model.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = { SPEC, S, COUNTS, PARTS, MOVES, STAGGER, ASSEMBLY, PLANE, SYSTEMS, TANK_ML, HOPPER_ML };
for (const out of [join(ROOT, "blender", "model.json"), join(ROOT, "web", "model.json")]) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(data, null, 1));
}
console.log("model.json escrito");
