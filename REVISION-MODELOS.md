# Revisión de modelos y referencias

Fecha: 31 de octubre de 2026.

Resultado: los modelos no se pueden considerar idénticos a los planos. Hay
diferencias dimensionales comprobables y faltan referencias acotadas para
verificar la totalidad de las superficies e interiores. Después de la revisión
se aplicó un primer ajuste dimensional al F-14 y al F-22, descrito al final.

## Método y límites

Se revisaron las fuentes de Blender y las dimensiones de los cinco GLB publicados.
Los cinco GLB son idénticos por SHA-256 a sus copias en `fuente/web/`.
`python fuente/tools/measure_glb.py`, ejecutado desde la raíz, calcula las cajas
envolventes a partir de los límites POSITION y las transformaciones de escena.
No descodifica Draco: una caja local girada puede sobreestimar el volumen real.
Las longitudes del F-14 y F-22 se contrastaron además con las coordenadas de
sus estabilizadores y morros en el generador; los nodos extremos no tienen
rotaciones locales. Las medidas corresponden a la postura exportada, no a
todas las posiciones de mandos o alas.

No se realizó una superposición visual de tres vistas ni se verificaron
tolerancias de fabricación. La descarga local de los planos Wren falló por DNS;
el buscador permitió consultar su texto, pero el OCR degrada algunas cotas.
Por eso las cifras ilegibles se dejan pendientes de lectura visual.
La auditoría existente `npm run audit` se inició desde `fuente/`, no produjo
resultado después de varios minutos y se interrumpió. No se considera aprobada.

## Comparación inicial de aviones, antes de editar

| Modelo | Envolvente GLB, largo × envergadura × alto (m) | Referencia | Evaluación |
| --- | --- | --- | --- |
| Hawk con MW54, escala 1:7 | 1,596 × 1,347429 × 0,450 | RAF: longitud 11,9 m, envergadura 9,4 m a tamaño real | La longitud equivale a 11,172 m: 0,728 m menos que RAF (6,12 %). La comparación requiere fijar si se incluye la sonda. |
| F-14D | 19,650001 × 19,540 × 4,850 | NATOPS: largo 62 ft 8,5 in = 19,1135 m; alto 16 ft = 4,8768 m; envergadura a 20°: 64 ft 1,5 in = 19,5453 m | Longitud excedida en unos 0,5365 m (2,81 %); la envergadura abierta es cercana. El extremo trasero lo fija el estabilizador. |
| F-22 | 19,100001 × 13,560001 × 4,850 | USAF: largo 62 ft 1 in = 18,923 m; envergadura 44 ft 6 in = 13,5636 m | Longitud excedida en unos 0,177 m (0,94 %). El extremo trasero lo fija el estabilizador. La coincidencia de envergadura no verifica el contorno. |
| SR-71 | 32,700002 × 16,940001 × 5,825 | NASA: 32,73 × 16,94 × 5,63 m, altura estacionado | Envergadura cercana; diferencia de longitud de unos 3 cm y altura unos 19,5 cm mayor. Revisar postura del tren y definición de altura antes de corregir. |
| SR-72/Darkstar | 21,160001 × 9,984250 × 5,088059 | El código declara forma del Darkstar y cotas estimadas; constantes 21,2 m entre NOSE y TAIL y 10,06 m entre puntas | No se encontró un juego de planos acotados que permita certificarlo como SR-72. Las constantes declaradas tampoco son la envolvente exacta del GLB. |

Fuentes consultadas:

- [RAF: Hawk T1](https://www.raf.mod.uk/aircraft/hawk-t1/).
- [The Hawk Story, Royal Aeronautical Society](https://www.aerosociety.com/media/4842/the-hawk-story.pdf), sección 2.5.8: longitud de fuselaje 11,459 m y envergadura 9,39 m. La longitud de fuselaje y la longitud total RAF tienen definiciones distintas; incluso frente al fuselaje, los 11,172 m del modelo quedan por debajo.
- [NAVAIR 01-F14AAD-1, NATOPS F-14D](https://server.3rd-wing.net/public/Bureau_VF31/Docs%20F-14%20r%C3%A9el/F-14D%20Flight%20Manual.pdf), tabla Aircraft Characteristics and Limitations y figura 1-1.
- [USAF: F-22 Raptor](https://www.af.mil/About-Us/Fact-Sheets/Display/Article/104506/f-22-raptor/), datos indexados; la apertura directa devolvió 403.
- [NASA: SR-71 Blackbird, FS-2008-6-030-DFRC](https://www.nasa.gov/wp-content/uploads/2021/09/495839main_FS-030_SR-71.pdf), Specifications and Performance.

## MW54: discrepancias internas

En `fuente/src/model.mjs`, `SPEC.caseLength` declara 90,5 mm, pero las estaciones
de carcasa son 28 a 112 mm: 84 mm. `fuente/blender/engine.py` usa también
28 a 112 mm. La diferencia interna es 6,5 mm (7,18 % de la cifra declarada).
La lámina Case Outer, pieza 021, issue 3, está localizada, pero su cota debe
confirmarse visualmente antes de cambiar estaciones.

La tapa delantera también difiere entre representaciones: el perfil interior
de Blender termina en 34,6 mm, mientras que la figura usa `S.shroud[1] = 38`.
No comparten realmente todos los perfiles aunque los comentarios lo sugieren.
El generador 3D recibe metadatos de `model.json`, pero define muchas cotas y
cantidades de forma literal en Python.

Se localizó [Wren, MW54 Turbo-Jet: Plans and Building Instructions, 44 páginas](https://energiazero.org/cartelle/disegno/varie/MW-54-Turbo-Jet-Engine-Plans.pdf),
con G.A. issue 4 y listas de piezas issue 3/4. Las cantidades legibles incluyen
seis vaporizadores, dos rodamientos y cuatro aletas de salida, coincidentes con
los bucles correspondientes del generador. Esto no valida sus perfiles ni cotas.

## Otros motores

- [Pratt & Whitney: F119](https://www.rtx.com/prattwhitney/products/military-engines/f119) confirma fan de tres etapas, compresor de seis, turbinas de una etapa por eje y vectorización de ±20°. La arquitectura del generador concuerda en esos puntos. No aporta planos de cada álabe o sección para validar sus medidas.
- [GE: ficha F110](https://www.geaerospace.com/sites/default/files/2023_ge_aero_f110_datasheet_digital.pdf) describe las variantes -129 y -132. No debe usarse para certificar dimensionalmente el F110-GE-400 del F-14.
- [USAF Museum: J58](https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/195665/USAFmuseum/pratt-whitney-j58-turbojet/) es una referencia oficial identificada; la geometría interna detallada queda sin verificar.
- El TBCC del SR-72 queda como representación conceptual sin planos acotados verificados.

## Trabajo pendiente para una equivalencia geométrica

Obtener imágenes legibles de las láminas y fijar la variante exacta de cada
avión y motor. Después, comparar contornos en planta, perfil y frente,
secciones, posiciones de motores, pivotes y dimensiones de piezas. Corregir
geometría sólo contra cotas verificadas y volver a exportar GLB y CAD.
Las comprobaciones de choques y montaje complementan esa revisión, pero no
demuestran igualdad con los planos.

## Primera edición: longitud del F-14 y F-22

Se ajustó provisionalmente la longitud de ambos modelos, deformando únicamente
el morro por delante de la estación delantera de la cabina. La estación permanece
fija. Las alas, flechas, colas, motores y posiciones de instalación no cambian.
El tren se traslada como una pieza rígida, sin deformar las ruedas.

| Modelo | Largo anterior (m) | Largo generado (m) | Objetivo (m) |
| --- | --- | --- | --- |
| F-14D | 19,650001 | 19,113501 | 19,1135 |
| F-22 | 19,100001 | 18,923001 | 18,923 |

El ajuste cumple las cotas generales. La distribución de la reducción en el
morro es provisional: no deriva de una superposición de perfiles ni demuestra
que cada sección del fuselaje corresponda al avión real. La MW54, el Hawk,
el SR-71 y el SR-72 no se modificaron en esta etapa.

Se regeneraron los GLB de `fuente/web/` y sus copias en la raíz, además de
los FBX y OBJ correspondientes en `fuente/cad/`. No se publicó en GitHub.

Validación realizada con Blender 5.2:

- Prueba geométrica de longitud, pivote desplazado, rotación inicial, rueda rígida y rutas de despiece: aprobada.
- Comparación de los GLB anteriores y nuevos: mismos nombres de piezas y metadatos; motores, alas y colas mantienen sus transformaciones, cantidades de vértices y límites geométricos.
- Medición de los GLB regenerados: longitudes de la tabla; alturas y envergaduras sin cambios.
- Render de ambos GLB e inspección visual: realizados.
- Comprobación de interferencias, armado, mandos y despiece con umbral de 8 mm: F-14 registra 14 avisos y F-22 registra 12, tanto antes como después del ajuste. Persisten interferencias preexistentes; no se considera una auditoría sin choques.

También se corrigió la lectura de argumentos de `check_overlap.py` al ejecutarlo
con Blender: ahora sólo interpreta lo que sigue a `--`, evitando confundir el
valor de `--python-exit-code 1` con un umbral geométrico de 1 mm.

## Segunda edición: piezas apoyadas y montaje estable

Los cinco modelos se revisaron en posición armada. Se añadieron apoyos
ilustrativos donde faltaban uniones: bulones de superficies móviles, bases de
derivas, soportes de motores, uniones de las alas del F-14 y anclajes de
bandejas, carriles, pedales y tubo de empuje del Hawk. Los herrajes forman
parte de la malla correspondiente y acompañan su movimiento o despiece.
Sus medidas son recursos de representación; no se presentan como cotas
verificadas de los planos originales.

El visor ahora abre con el avión armado. Se eliminó la animación automática
que lo separaba a los 600 ms, la flotación aleatoria y el rebote al encajar.
El botón Montar recoge desde la posición actual, sin separar primero todas
las piezas. El despiece queda disponible mediante su botón.

Se incorporó `fuente/blender/check_connections.py`: compara superficies del
GLB y recorre un grafo desde el fuselaje para detectar también conjuntos
flotantes cuyos componentes sí se tocan entre sí. La tolerancia es 1 mm para
juntas; cada motor se agrupa completo para revisar su instalación. No es una
auditoría de todas sus holguras internas ni sustituye la prueba de choques.

Validación de esta edición:

- Los cinco GLB pasan el modo `--strict`, sin conjuntos desconectados del fuselaje con la tolerancia indicada.
- Cinco pruebas de movimiento pasan: extremos estacionarios, trayectorias, ausencia de sobrepaso al montar y recogida desde una posición parcial en ambos visores.
- La prueba de anclajes confirma que se conservan pivotes, metadatos y la piel de la pieza fija.
- Se regeneraron los cinco GLB, FBX y OBJ y se revisaron vistas renderizadas del estado armado.
- Los archivos del sitio se actualizaron localmente. No se publicó en GitHub.

## Tercera edición: carga y memoria en celular

Los visores del Hawk, los cuatro aviones y Aero usan un perfil móvil con
presupuesto de píxeles. La geometría y las piezas se conservan.

- En celular no se descarga `hangar.hdr` (425.019 bytes). Se generan reflejos ligeros con una textura de 128 × 64.
- Los cinco módulos de posprocesado que antes se importaban estáticamente se cargan sólo en escritorio. El teléfono usa render directo, sin sus búferes ni pases adicionales.
- Las texturas procedurales del piso pasan de 2048 a 512 por lado en gama alta, y de 1024 a 256 en media y baja: 16 veces menos texeles en cada caso. Esto reduce el trabajo síncrono de generación y su memoria, sin afirmar que toda la página cargue 16 veces más rápido.
- Se reducen las sombras y la resolución inicial según la gama. El modo de ahorro de datos selecciona el perfil bajo.
- El decodificador Draco usa un trabajador en celular y se libera al terminar, también si falla la carga.
- La consulta del modelo del teléfono sólo se hace con `?debug=1`, sin bloquear el arranque normal.
- El escenario de vuelo del Hawk se construye al pulsar Volar, evitando crear la pista y el terreno ocultos durante el arranque.

Validación: 12 pruebas automatizadas aprobadas, que incluyen el montaje
anterior, los perfiles de las tres gamas, el presupuesto de píxeles, los reflejos
móviles, la liberación del decodificador y la creación diferida del escenario.
Se verificaron sintaxis y referencias locales del sitio generado. La prueba
visual en navegador no se pudo completar: la vista previa no pudo acceder al
servidor local (timeout). No se midieron FPS ni tiempos de carga en un teléfono
físico; las reducciones anteriores corresponden a recursos y configuración.
