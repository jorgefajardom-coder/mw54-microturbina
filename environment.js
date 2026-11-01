// Reflejos ligeros en celular, HDR sólo en escritorio. No importa cargadores
// ni escenas de estudio costosas hasta que el perfil los necesita.
import * as THREE from "three";

export async function setupEnvironment(renderer, scene, profile, hdrUrl) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  if (profile.kind === "celular") {
    const w = 128, h = 64;
    const data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const sky = Math.max(0, 1 - y / (h * 0.65));
      const strip = Math.pow(Math.max(0, Math.cos(x / w * Math.PI * 4)), 12);
      const light = 24 + 120 * sky + 75 * strip * sky;
      data[i] = light;
      data[i + 1] = light + 3;
      data[i + 2] = light + 8;
      data[i + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, w, h);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.needsUpdate = true;
    const environment = pmrem.fromEquirectangular(texture);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.8;
    texture.dispose();
    pmrem.dispose();
    return;
  }
  const [{ RoomEnvironment }, { HDRLoader }] = await Promise.all([
    import("three/addons/environments/RoomEnvironment.js"),
    import("three/addons/loaders/HDRLoader.js"),
  ]);
  const room = new RoomEnvironment();
  const fallback = pmrem.fromScene(room, 0.04);
  scene.environment = fallback.texture;
  room.dispose?.();
  if (!hdrUrl) { pmrem.dispose(); return; }
  new HDRLoader().load(hdrUrl, (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.8;
    fallback.dispose();
    hdr.dispose();
    pmrem.dispose();
  }, undefined, () => pmrem.dispose());
}
