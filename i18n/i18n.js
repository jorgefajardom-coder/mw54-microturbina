// Idioma del sitio: español (el original) o inglés. Script clásico que va en el <head> de cada página, antes que nada:
// - Elige el idioma por ?lang=es|en, por la elección guardada o, la primera vez, con un selector a pantalla completa
//   con el mismo aspecto que la página (el idioma del navegador viene marcado).
// - En inglés carga el diccionario (en.js) y traduce el texto del documento: nodos de texto, title, aria-label, alt,
//   placeholder y el <title>. Un MutationObserver traduce también lo que los visores escriben después (lecturas,
//   fichas de piezas, HUD), así que el código de cada página sigue escrito en español.
// - Los números pasan al formato inglés (1.200 °C → 1,200 °C; Mach 3,2 → Mach 3.2).
// - Añade a la navegación un botón ES/EN para cambiar en cualquier momento sin recargar.
// Desde el código: window.mw54i18n.t("texto") traduce (para lo que se dibuja en un canvas) y .lang dice el idioma.
(() => {
  const KEY = "mw54.lang";
  const script = document.currentScript;
  const base = script ? script.src.replace(/[^/]*$/, "") : "";
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (l) => { try { localStorage.setItem(KEY, l); } catch { /* sin almacenamiento: vale sólo esta visita */ } };
  const ok = (l) => (l === "es" || l === "en" ? l : null);
  const asked = ok(new URLSearchParams(location.search).get("lang"));
  const chosen = asked || ok(read());
  if (asked) save(asked);
  const browserLang = /^es\b/i.test(navigator.language || "") ? "es" : "en";

  const api = { lang: chosen || "es", t: (s) => s, locale: "es-ES", ready: !!chosen };
  window.mw54i18n = api;
  document.documentElement.lang = api.lang;

  // ---------- traducción ----------
  let dict = null; // Map: texto español (números ya en formato inglés) → inglés
  let phrase = null; // RegExp con las claves que pueden ir dentro de un texto más largo
  const cache = new Map();
  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "NOSCRIPT"]);
  const ATTRS = ["title", "aria-label", "alt", "placeholder"];
  const UNIT = String.raw`(?=\s?(?:°|rpm|km|m\b|mm|cm|N\b|kN|kg|g\b|ml|ft|Pa|kPa|hPa|W\b|kW|K\b|s\b|h\b|%|millones|celdas|piezas|pasos|steps|cells|million))`;
  const THOUSANDS = new RegExp(String.raw`(?<![\d.,])(\d{1,3})((?:\.\d{3})+)(?![\d.,])` + UNIT, "g");
  // formato español → inglés: primero los separadores de miles (sólo delante de una unidad, para no confundir 1.473
  // de un toFixed con mil cuatrocientos), luego la coma decimal
  const numbers = (s) => (/\d[.,]\d/.test(s) ? s.replace(THOUSANDS, (m, a, b) => a + b.replaceAll(".", "\u0001")).replace(/(\d),(\d)/g, "$1.$2").replaceAll("\u0001", ",") : s);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function setDict(entries) {
    dict = new Map();
    for (const [es, en] of entries) dict.set(numbers(es.replace(/\s+/g, " ").trim()), en);
    // dentro de textos compuestos sólo se reemplazan claves con algo de cuerpo, de la más larga a la más corta,
    // y sin partir palabras
    const keys = [...dict.keys()].filter((k) => k.length >= 4 && /\p{L}{2}/u.test(k)).sort((a, b) => b.length - a.length);
    const edge = (k) => (/^\p{L}/u.test(k) ? String.raw`(?<![\p{L}\p{N}])` : "") + esc(k) + (/\p{L}$/u.test(k) ? String.raw`(?![\p{L}])` : "");
    phrase = new RegExp(keys.map(edge).join("|"), "gu");
  }

  function tr(s) {
    if (!dict || !s) return s;
    if (!/\p{L}/u.test(s)) return numbers(s); // un número suelto (la salida de un deslizador): sólo el formato
    let hit = cache.get(s);
    if (hit !== undefined) return hit;
    const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0];
    const core = numbers(s.trim().replace(/\s+/g, " "));
    hit = dict.get(core);
    if (hit === undefined) hit = core.replace(phrase, (m) => dict.get(m));
    hit = lead + hit + tail;
    if (cache.size > 4000) cache.clear();
    cache.set(s, hit);
    return hit;
  }

  // lo traducido se recuerda para poder volver al español sin recargar
  const orig = new WeakMap(); // nodo → texto original;  elemento → { atributo: original }
  const mine = new WeakMap(); // nodo → último texto que puso la traducción
  function textNode(n) {
    const p = n.parentNode;
    if (!p || SKIP.has(p.nodeName) || (p.closest && p.closest("[data-no-i18n]"))) return;
    const v = n.nodeValue;
    if (mine.get(n) === v) return;
    const en = tr(v);
    orig.set(n, v);
    if (en !== v) { mine.set(n, en); n.nodeValue = en; } else mine.set(n, v);
  }
  function attrs(el) {
    if (el.closest && el.closest("[data-no-i18n]")) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const m = mine.get(el) || {};
      if (m[a] === v) continue;
      const o = orig.get(el) || {};
      o[a] = v; orig.set(el, o);
      const en = tr(v);
      m[a] = en; mine.set(el, m);
      if (en !== v) el.setAttribute(a, en);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) return textNode(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (SKIP.has(root.nodeName)) return; attrs(root); }
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => (n.nodeType === 1 && SKIP.has(n.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = it.nextNode(); n; n = it.nextNode()) n.nodeType === 3 ? textNode(n) : attrs(n);
  }
  function restore(root) {
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = it.currentNode; n; n = it.nextNode()) {
      if (n.nodeType === 3) { if (orig.has(n) && mine.get(n) === n.nodeValue) n.nodeValue = orig.get(n); mine.delete(n); }
      else if (n.nodeType === 1) {
        const o = orig.get(n), m = mine.get(n);
        if (o && m) for (const a in o) if (n.getAttribute(a) === m[a]) n.setAttribute(a, o[a]);
        mine.delete(n);
      }
    }
  }
  const observer = new MutationObserver((list) => {
    if (api.lang !== "en") return;
    for (const r of list) {
      if (r.type === "characterData") textNode(r.target);
      else if (r.type === "attributes") attrs(r.target);
      else for (const n of r.addedNodes) walk(n);
    }
  });

  function loadDict() {
    if (dict) return Promise.resolve();
    if (window.MW54_EN) { setDict(window.MW54_EN); return Promise.resolve(); }
    return new Promise((res, rej) => {
      const s = Object.assign(document.createElement("script"), { src: base + "en.js" });
      s.onload = () => { setDict(window.MW54_EN || []); res(); };
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function apply(l) {
    api.lang = l;
    api.locale = l === "en" ? "en-US" : "es-ES";
    api.t = l === "en" ? tr : (s) => s;
    document.documentElement.lang = l;
    if (l === "en") {
      walk(document);
      observer.observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    } else {
      observer.disconnect();
      restore(document.documentElement);
    }
    place();
    window.dispatchEvent(new CustomEvent("mw54:lang", { detail: l }));
  }

  async function choose(l) {
    save(l);
    // si la dirección traía ?lang=, se actualiza para que al recargar no vuelva el idioma anterior
    const u = new URL(location.href);
    if (u.searchParams.has("lang")) { u.searchParams.set("lang", l); history.replaceState(history.state, "", u); }
    api.ready = true;
    if (l === "en") await loadDict();
    apply(l);
  }
  api.set = choose;

  // ---------- botón ES/EN y selector inicial ----------
  const CSS = `
.mw54-lang{cursor:pointer}
nav.sections a.mw54-lang,.an-nav a.mw54-lang{min-width:2.6em;text-align:center}
#sheet a.mw54-lang{grid-column:1/-1}
#mw54-lang-pick{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px;background:color-mix(in srgb,var(--bg,var(--anatomy-page,#0d0f12)) 82%,transparent);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
#mw54-lang-pick .box{width:min(340px,100%);padding:22px 20px 18px;border-radius:16px;background:var(--panel,var(--anatomy-card,#15181d));color:var(--text,var(--anatomy-strong,#e9ecef));box-shadow:inset 0 0 0 1px var(--line,var(--anatomy-faint,#ffffff14)),0 20px 60px #0008}
#mw54-lang-pick .k{margin:0 0 4px;font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,var(--anatomy-muted,#8b939c))}
#mw54-lang-pick h2{margin:0 0 16px;font-size:17px;font-weight:600}
#mw54-lang-pick .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#mw54-lang-pick button{height:46px;border:0;border-radius:999px;background:var(--bg,var(--anatomy-page,#0d0f12));color:var(--muted,var(--anatomy-muted,#8b939c));font:600 12px ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;box-shadow:inset 0 0 0 1px var(--line,var(--anatomy-faint,#ffffff14))}
#mw54-lang-pick button:hover,#mw54-lang-pick button:focus-visible{color:var(--text,var(--anatomy-strong,#e9ecef));outline:none;box-shadow:inset 0 0 0 1px var(--text,var(--anatomy-strong,#e9ecef))}
#mw54-lang-pick button[data-suggest]{color:var(--text,var(--anatomy-strong,#e9ecef));box-shadow:inset 0 0 0 1px var(--accent,#ff8a3c)}
#mw54-lang-pick small{display:block;margin-top:12px;font-size:12px;color:var(--muted,var(--anatomy-muted,#8b939c))}
`;
  let toggle = null;
  function place() {
    if (!document.body) return;
    if (!toggle) {
      toggle = document.createElement("a");
      toggle.className = "mw54-lang";
      toggle.setAttribute("role", "button");
      toggle.dataset.noI18n = "";
    }
    // en los visores de celular la fila de arriba es sólo para los aviones: el botón va al final de «Más», a todo el
    // ancho y con el nombre del idioma entero
    const sheet = document.getElementById("sheet");
    const host = sheet || document.querySelector("nav.sections, nav.an-nav");
    if (!host) return;
    // sólo se toca lo que cambia: escribir en el botón dispara el MutationObserver, que vuelve a llamar a place()
    const other = api.lang === "en" ? "es" : "en";
    const mode = other + (sheet ? "-sheet" : "");
    if (toggle.dataset.mode !== mode) {
      toggle.dataset.mode = mode;
      toggle.href = "?lang=" + other;
      toggle.hreflang = other;
      toggle.textContent = sheet ? (other === "en" ? "English" : "Español") : other.toUpperCase();
      toggle.setAttribute("aria-label", other === "en" ? "Switch to English" : "Cambiar a español");
      toggle.title = toggle.getAttribute("aria-label");
      toggle.classList.toggle("go", !!sheet);
    }
    if (toggle.parentNode !== host || (sheet && host.lastElementChild !== toggle)) host.appendChild(toggle);
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a.mw54-lang");
    if (!a) return;
    e.preventDefault();
    choose(api.lang === "en" ? "es" : "en");
  });

  function picker() {
    const wrap = document.createElement("div");
    wrap.id = "mw54-lang-pick";
    wrap.dataset.noI18n = "";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "mw54-lang-h");
    wrap.innerHTML = `<div class="box"><p class="k">Idioma · Language</p><h2 id="mw54-lang-h">¿En qué idioma? · Which language?</h2><div class="row"><button type="button" lang="es" data-l="es">Español</button><button type="button" lang="en" data-l="en">English</button></div><small>Se puede cambiar luego con el botón ES/EN · You can switch later with the ES/EN button</small></div>`;
    const sug = wrap.querySelector(`[data-l="${browserLang}"]`);
    sug.dataset.suggest = "";
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-l]");
      if (!b) return;
      wrap.remove();
      choose(b.dataset.l);
    });
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { wrap.remove(); choose(browserLang); }
      if (e.key === "Tab") { const bs = wrap.querySelectorAll("button"); const i = [...bs].indexOf(document.activeElement); e.preventDefault(); bs[(i + 1) % 2].focus(); }
    });
    document.body.appendChild(wrap);
    sug.focus();
  }

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  // en inglés el diccionario se carga ya, antes de que se pinte la página, para no ver el español un instante
  if (api.lang === "en") document.write(`<script src="${base}en.js"><\/script>`);
  const boot = () => {
    if (api.lang === "en") { if (window.MW54_EN) setDict(window.MW54_EN); loadDict().then(() => apply("en")); }
    else place();
    // los visores montan su interfaz después (la hoja «Más» del celular): el botón se recoloca cuando aparece
    new MutationObserver(place).observe(document.body, { childList: true, subtree: true });
    // sin elección guardada se pregunta; no a los navegadores automatizados (pruebas, capturas), que seguirían en español
    if (!chosen && !navigator.webdriver) picker();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
    // en inglés se traduce mientras se lee el documento, nodo a nodo, para que el primer pintado ya salga en inglés
    if (api.lang === "en") {
      const early = new MutationObserver((list) => { if (!dict && window.MW54_EN) setDict(window.MW54_EN); if (!dict) return; for (const r of list) for (const n of r.addedNodes) walk(n); });
      early.observe(document, { subtree: true, childList: true });
      document.addEventListener("DOMContentLoaded", () => early.disconnect(), { once: true });
    }
  } else boot();
})();
