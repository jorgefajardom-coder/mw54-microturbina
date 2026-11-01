import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export function createDesktopComposer(renderer, scene, camera, profile, { aoRadius = 0.5 } = {}) {
  const tier = profile.kind === "escritorio" ? "alta" : profile.tier;
  if (tier === "baja") return { render: () => renderer.render(scene, camera), setSize() {}, bloom: null };
  const [w, h] = profile.size();
  // búfer de color con decimales sólo donde la GPU sabe dibujar en él (si no, el lienzo sale negro) y suavizado de bordes
  // con las muestras que admita
  const ext = renderer.extensions;
  const half = ext.has("EXT_color_buffer_float") || ext.has("EXT_color_buffer_half_float");
  const samples = profile.antialias ? Math.min(4, renderer.capabilities.maxSamples || 0) : 0;
  const target = new THREE.WebGLRenderTarget(w, h, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, samples });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (tier === "alta") {
    gtao = new GTAOPass(scene, camera, w, h);
    gtao.updateGtaoMaterial({ radius: aoRadius, distanceExponent: 1.4, thickness: aoRadius * 2, scale: 1.1, samples: 12, screenSpaceRadius: false });
    gtao.blendIntensity = 0.85;
    // la oclusión no debe ver los volúmenes de llama ni los vidrios: se esconden mientras dibuja sus normales
    const hide = gtao._overrideVisibility.bind(gtao);
    gtao._overrideVisibility = () => {
      hide();
      scene.traverse((o) => {
        if (o.isMesh && o.visible && (o.userData.noAO || (o.material?.transparent && o.material.opacity < 0.95))) { o.visible = false; gtao._visibilityCache.push(o); }
      });
    };
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.45, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    setSize(width, height) { composer.setSize(width, height); gtao?.setSize(width, height); },
    setPixelRatio(r) { composer.setPixelRatio(r); },
    bloom,
  };
}

