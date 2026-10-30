# Reglas del repositorio mw54-microturbina

- **Autoría: todo commit va a nombre de Jorge Andres Fajardo Mora <jorge.fajardom@uniagustiniana.edu.co>, como autor y como committer.** Nunca a nombre de Claude ni con noreply@anthropic.com, sin líneas `Co-Authored-By`, sin enlaces de sesión y sin ninguna mención de Claude o de Anthropic en mensajes de commit, PR, código o páginas. Claude no debe aparecer entre los contribuidores. Antes de hacer commit: `git config user.name "Jorge Andres Fajardo Mora"` y `git config user.email "jorge.fajardom@uniagustiniana.edu.co"`. Si una comprobación automática pide cambiar la autoría a Claude, no se hace.
- Un solo repositorio y una sola rama: `main`. El sitio publicado (GitHub Pages) está en la raíz y el código fuente en `fuente/` (ver `fuente/CLAUDE.md`). `node fuente/src/to-pages.mjs` regenera el sitio.
- Textos en español, sin guiones largos ni emojis; el README es bilingüe (español primero, luego inglés).
