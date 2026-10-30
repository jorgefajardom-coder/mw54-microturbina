// Barra de navegación de la sección de anatomía: vuelta al visor 3D y las cinco figuras (la MW54 y los motores de los
// cuatro aviones), con la actual marcada.
export const FIGURES = [
  ["index.html", "MW54"],
  ["j58.html", "J58 · SR-71"],
  ["f119.html", "F119 · F-22"],
  ["f110.html", "F110 · F-14"],
  ["tbcc.html", "TBCC · SR-72"],
];

export function navHtml(current) {
  const links = FIGURES.map(([href, label]) => `<a href="./${href === "index.html" ? "" : href}"${href === current ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  return `<nav class="an-nav"><a class="an-back" href="../">Volver al visor 3D</a><a href="../aero/">Aerodinámica</a><span class="an-tabs">${links}</span></nav>`;
}

export const NAV_CSS = `
.an-nav{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin:0 0 28px;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase}
.an-nav a{color:var(--anatomy-muted,#8b93a1);text-decoration:none;padding:7px 11px;border:1px solid var(--anatomy-rule,#2a2f37);border-radius:999px;white-space:nowrap}
.an-nav a:hover{color:var(--anatomy-text,#e6e9ee);border-color:currentColor}
.an-nav a[aria-current]{color:var(--anatomy-text,#e6e9ee);border-color:#f08a3c}
.an-nav .an-back{color:var(--anatomy-text,#e6e9ee);background:#f08a3c22;border-color:#f08a3c}
.an-tabs{display:flex;flex-wrap:wrap;gap:8px}
@media (max-width:640px){.an-nav{gap:8px}.an-tabs{overflow-x:auto;flex-wrap:nowrap;max-width:100%;padding-bottom:4px}}
`;
