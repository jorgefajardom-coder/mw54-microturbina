// Cabecera de la página publicada: título, descripción, autoría y datos estructurados a nombre de Jorge Andres
// Fajardo Mora, con la misma forma del nombre que usa su portafolio, para que los buscadores asocien la obra a él.
export const AUTHOR = "Jorge Andres Fajardo Mora";
export const SITE = "https://jorgefajardom-coder.github.io/mw54-microturbina/";
export const PORTFOLIO = "https://jorgefajardom-coder.github.io/singularity/";
export const LINKEDIN = "";

const TITLE = `Microturbina Wren MW54 · anatomía interactiva · ${AUTHOR}`;
const DESCRIPTION = `Figura isométrica interactiva de la microturbina Wren MW54 por ${AUTHOR}: despiece en el orden real de los planos, simulación de montaje, arranque con flujo de aire, análisis de materiales con puntos de fusión y dos motores instalados en un reactor bimotor de aeromodelismo.`;
const esc = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function seoHead() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: "Microturbina Wren MW54 · anatomía interactiva",
    description: DESCRIPTION,
    url: SITE,
    inLanguage: "es",
    image: `${SITE}og.png`,
    author: { "@type": "Person", name: AUTHOR, url: PORTFOLIO, jobTitle: "Technical Product Manager & Mechatronics Engineer" },
    creator: { "@type": "Person", name: AUTHOR, url: PORTFOLIO },
    keywords: "MW54, Wren Turbines, microturbina, turbojet, aeromodelismo, análisis de materiales, punto de fusión, despiece, Jorge Andres Fajardo Mora",
  };
  return (
    `<title>${esc(TITLE)}</title>` +
    `<meta name="description" content="${esc(DESCRIPTION)}">` +
    `<meta name="author" content="${AUTHOR}">` +
    `<link rel="canonical" href="${SITE}">` +
    `<meta property="og:type" content="article">` +
    `<meta property="og:title" content="${esc(TITLE)}">` +
    `<meta property="og:description" content="${esc(DESCRIPTION)}">` +
    `<meta property="og:url" content="${SITE}">` +
    `<meta property="og:image" content="${SITE}og.png">` +
    `<meta property="article:author" content="${PORTFOLIO}">` +
    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta name="twitter:title" content="${esc(TITLE)}">` +
    `<meta name="twitter:description" content="${esc(DESCRIPTION)}">` +
    `<meta name="twitter:image" content="${SITE}og.png">` +
    `<script type="application/ld+json">${JSON.stringify(ld)}</script>`
  );
}

// Pie con la firma visible: el nombre también en el texto de la página, no sólo en las etiquetas.
export const SIGNATURE = `<footer class="mw-signature">Figura, modelo y análisis por <a href="${PORTFOLIO}" rel="author">${AUTHOR}</a>.</footer>`;
