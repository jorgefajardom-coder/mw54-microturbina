// Qué dispositivo abre la página y cómo dibujar en él. Decide entre la interfaz de escritorio y la de celular (misma
// URL; ?vista=celular o ?vista=escritorio fuerza una) y arma el perfil de calidad a partir del hardware real del
// teléfono: GPU, memoria, núcleos y densidad de pantalla. Con ?debug=1 muestra todo eso en pantalla, útil al depurar
// por USB con chrome://inspect.

const params = new URLSearchParams(location.search);

export function detect() {
  const forced = params.get("vista");
  if (forced === "celular" || forced === "escritorio") return forced;
  const ua = navigator.userAgent;
  const phone = navigator.userAgentData?.mobile ?? /Android.+Mobile|iPhone|iPod|Windows Phone/i.test(ua);
  const tablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const touchOnly = matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches;
  return phone || tablet || touchOnly ? "celular" : "escritorio";
}

function gpuName() {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return String(name || "");
  } catch {
    return "";
  }
}

// Gama del teléfono: GPU conocida primero, luego memoria y núcleos (Chrome en Android da deviceMemory en GB).
function tierOf(gpu) {
  const mem = navigator.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const high = /Adreno \(TM\) (6[4-9]\d|7\d\d|8\d\d)|Adreno.*(7[3-9]\d|8\d\d)|Mali-G7[1-9]|Mali-G(6|7|9)1\d|Immortalis|Xclipse|Apple GPU|Apple A1[5-9]|Apple M/i;
  const low = /Adreno \(TM\) ([1-5]\d\d|60\d|61\d)|Mali-[2-4]\d\d|Mali-T|Mali-G(31|51|52|57)|PowerVR|SGX|Vivante/i;
  if (low.test(gpu) || mem <= 3 || cores <= 4) return "baja";
  if (high.test(gpu) && mem >= 6) return "alta";
  return "media";
}

const size = () => [Math.round(innerWidth), Math.round(innerHeight)];

export async function profileFor(kind) {
  const dpr = devicePixelRatio || 1;
  if (kind === "escritorio") {
    return { kind, tier: "alta", gpu: gpuName(), size, antialias: true, pixelRatio: Math.min(dpr, 2), minPixelRatio: 1, adaptive: true, shadowSize: 2048, textureSize: 2048, fit: (a) => Math.min(2.6, Math.max(1, 1.25 / a)) };
  }
  const gpu = gpuName();
  const tier = tierOf(gpu);
  const Q = { alta: [2, 2048, 2048, true], media: [1.6, 1536, 1024, true], baja: [1.25, 1024, 1024, false] }[tier];
  let model = "";
  try { model = (await navigator.userAgentData?.getHighEntropyValues?.(["model"]))?.model ?? ""; } catch {}
  return {
    kind, tier, gpu, model, size,
    antialias: Q[3],
    pixelRatio: Math.min(dpr, Q[0]),
    minPixelRatio: Math.min(dpr, 0.8),
    adaptive: true,
    shadowSize: Q[1],
    textureSize: Q[2],
    // en vertical se aleja la cámara hasta que la envergadura cabe en el ancho; en horizontal, casi como escritorio
    fit: (a) => (a < 1 ? Math.min(2.8, Math.max(1.1, 1.3 / a)) : Math.max(1, 1.15 / Math.min(a, 1.15))),
  };
}

export function loadStyle(href) {
  return new Promise((ok) => {
    const l = Object.assign(document.createElement("link"), { rel: "stylesheet", href });
    l.onload = l.onerror = ok;
    document.head.appendChild(l);
  });
}

// Panel de diagnóstico (?debug=1): modelo, GPU, gama, pantalla, densidad y fps, para leerlo en el teléfono o en
// chrome://inspect mientras está conectado por USB.
export function debugPanel(profile) {
  const lines = () => [
    `${profile.kind} · gama ${profile.tier}${profile.model ? ` · ${profile.model}` : ""}`,
    profile.gpu || "GPU sin nombre",
    `pantalla ${screen.width}×${screen.height} · ventana ${innerWidth}×${innerHeight} · dpr ${devicePixelRatio}`,
    `memoria ${navigator.deviceMemory ?? "?"} GB · núcleos ${navigator.hardwareConcurrency ?? "?"} · ${screen.orientation?.type ?? ""}`,
  ];
  console.info("[perfil]", { ...profile, size: profile.size() });
  if (params.get("debug") !== "1") return null;
  const el = Object.assign(document.createElement("pre"), { id: "debug" });
  document.body.appendChild(el);
  let stats = "";
  const draw = () => (el.textContent = [...lines(), stats].join("\n"));
  draw();
  addEventListener("resize", draw);
  return (s) => { stats = `${s.fps.toFixed(0)} fps · densidad ${s.ratio.toFixed(2)}`; draw(); };
}
