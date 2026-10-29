# MW54 · anatomía de una microturbina

Figura isométrica interactiva de la Wren MW54 para el portafolio (portfolio-3d, `public/lab/mw54/`).
Se hace con la skill **anatomy**, que viene incluida en `.claude/skills/anatomy` para que funcione en sesiones en la nube.

- `src/model.mjs`: el modelo (datos GTBA, termodinámica aproximada, materiales y puntos de fusión). Todo número que muestra la figura sale de aquí.
- `src/build.mjs`: geometría con el kit (`.claude/skills/anatomy/kit`), escribe `dist/index.html` (oscuro) y `dist/light.html`.
- `src/live.js`, `src/mw54.css`: el comportamiento y estilo de la página.

Comandos: `npm run build`, `npm run audit` (debe terminar en `audit passed`), `npm run lines` (debe dar `line ends: 0`), `npm run shot`. Las comprobaciones necesitan Chrome o Chromium.

Reglas del repo: los commits y PR van **sin** líneas de coautoría ni atribución de Claude; el README es bilingüe (español primero, luego inglés).

Textos de la figura en español. Para publicarla en el portafolio se copia `dist/` a `portfolio-3d/public/lab/mw54/`.
