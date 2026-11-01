import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (name) => readFileSync(new URL("../web/" + name, import.meta.url), "utf8");
const deviceSource = read("device.js").replace(/export /g, "");
function device({ memory = 4, cores = 8, gpu = "generic", width = 390, height = 844, saveData = false } = {}) {
  let entropyCalls = 0;
  const navigator = { deviceMemory: memory, hardwareConcurrency: cores, connection: { saveData },
    userAgent: "Android Mobile", userAgentData: { mobile: true,
      getHighEntropyValues() { entropyCalls++; throw Error("No debe bloquear la carga"); } } };
  const gl = { getParameter: () => gpu, getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 1, loseContext() {} }) };
  const api = new Function("location", "navigator", "document", "matchMedia", "devicePixelRatio", "innerWidth", "innerHeight",
    deviceSource + ";return {detect,profileFor};")(
    { search: "" }, navigator, { createElement: () => ({ getContext: () => gl }) },
    () => ({ matches: true }), 3, width, height);
  return { ...api, entropyCalls: () => entropyCalls };
}

test("celulares de las tres gamas respetan el presupuesto de píxeles y texturas", async () => {
  for (const [options, tier, maxPixels] of [
    [{ memory: 2, cores: 4 }, "baja", 500000],
    [{ memory: 4 }, "media", 900000],
    [{ memory: 8, gpu: "Adreno (TM) 740" }, "alta", 1250000],
  ]) {
    const api = device({ ...options, width: 1440, height: 3200 });
    assert.equal(api.detect(), "celular");
    const p = await api.profileFor("celular");
    assert.equal(p.tier, tier);
    assert.ok(1440 * 3200 * p.pixelRatio ** 2 <= maxPixels + 1);
    assert.ok(p.minPixelRatio <= p.pixelRatio);
    assert.ok(p.textureSize <= 512);
    assert.ok(p.shadowSize <= 1024);
    assert.equal(p.antialias, false);
    assert.equal(p.dracoWorkers, 1);
    assert.equal(api.entropyCalls(), 0);
  }
});

test("el ahorro de datos fuerza el perfil ligero; escritorio conserva su calidad", async () => {
  const api = device({ memory: 8, gpu: "Adreno (TM) 740", saveData: true });
  assert.equal((await api.profileFor("celular")).tier, "baja");
  const p = await api.profileFor("escritorio");
  assert.equal(p.textureSize, 2048);
  assert.equal(p.shadowSize, 2048);
  assert.equal(p.antialias, true);
});

const look = read("look.js");
test("el render móvil no necesita módulos de posprocesado ni búferes extra", async () => {
  const start = look.indexOf("export async function createComposer");
  const code = look.slice(start, look.indexOf("// Microdetalle", start)).replace("export ", "");
  const create = new Function(code + ";return createComposer;")();
  let renders = 0;
  const renderer = { render() { renders++; } };
  const composer = await create(renderer, {}, {}, { kind: "celular", tier: "alta" });
  composer.setSize(390, 844);
  composer.render();
  assert.equal(renders, 1);
  assert.equal(composer.bloom, null);
});

test("el entorno móvil se crea sin descargar HDR y libera los recursos temporales", async () => {
  const source = read("environment.js").replace(/^import .*;$/gm, "").replace("export ", "");
  let textureDisposed = 0, generatorDisposed = 0, pixels = 0;
  const THREE = {
    DataTexture: class { constructor(data) { pixels = data.length; } dispose() { textureDisposed++; } },
    PMREMGenerator: class {
      fromEquirectangular() { return { texture: "reflejos" }; }
      fromScene() { throw Error("No debe construir un estudio completo"); }
      dispose() { generatorDisposed++; }
    },
  };
  const setup = new Function("THREE", source + ";return setupEnvironment;")(THREE);
  const scene = {};
  await setup({}, scene, { kind: "celular" }, "no-debe-descargarse.hdr");
  assert.equal(scene.environment, "reflejos");
  assert.equal(pixels, 128 * 64 * 4);
  assert.equal(textureDisposed, 1);
  assert.equal(generatorDisposed, 1);
});

for (const fail of [false, true]) {
  test(`Draco se libera después de ${fail ? "un error" : "terminar la decodificación"}`, async () => {
    const start = look.indexOf("export async function loadModel");
    const code = look.slice(start, look.indexOf("// Si el teléfono", start)).replace("export ", "");
    let dispose = 0, workerLimit = 0, finish;
    const pending = new Promise((resolve, reject) => { finish = () => fail ? reject(Error("fallo")) : resolve("modelo"); });
    class Draco {
      setDecoderPath() { return this; } setDecoderConfig() { return this; }
      setWorkerLimit(n) { workerLimit = n; } preload() {} dispose() { dispose++; }
    }
    class GLTF { setDRACOLoader() { return this; } loadAsync() { return pending; } }
    const load = new Function("DRACOLoader", "GLTFLoader", code + ";return loadModel;")(Draco, GLTF);
    const result = load("modelo.glb", "draco/", { workerLimit: 1 });
    assert.equal(workerLimit, 1);
    assert.equal(dispose, 0);
    finish();
    if (fail) await assert.rejects(result, /fallo/);
    else assert.equal(await result, "modelo");
    assert.equal(dispose, 1);
  });
}

test("el escenario de vuelo se construye una sola vez al usarlo", () => {
  const source = read("core.js");
  const start = source.indexOf("let flight = null;");
  const code = source.slice(start, source.indexOf("// ── vista de cabina", start));
  let builds = 0;
  const ensure = new Function("createFlight",
    "const scene={},camera={},model={},op={},motor={},setSurfaces={},gearState={},pad={};" + code + ";return ensureFlight;")(
    () => { builds++; return { enter() {} }; });
  assert.equal(builds, 0);
  const first = ensure();
  assert.equal(builds, 1);
  assert.equal(ensure(), first);
  assert.equal(builds, 1);
});
