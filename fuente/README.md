# MW54 · anatomía de una microturbina / anatomy of a micro-turbine

**Español** · [English](#english)

Figura isométrica interactiva de la microturbina Wren MW54: despiece, simulación de montaje, funcionamiento con flujo de aire y análisis de materiales con sus puntos de fusión.

```bash
npm run build   # dist/index.html y dist/light.html
npm run audit   # comprueba la geometría
```

Hecha con la skill [anatomy](https://github.com/wheresryan22/anatomy) (MIT), incluida en `.claude/skills/anatomy`.
Datos del motor: [GTBA · MW54](https://www.gtba.co.uk/engine_designs/mw54.php).

### Visor 3D (`web/`)

- **Hawk + MW54** (`web/index.html`): maqueta 1:7 de un entrenador a reacción con la MW54, cabina en tándem cuyos mandos se mueven con los del piloto, montaje y despiece, mapa de calor y simulador de vuelo. En celular se vuela con dos palancas táctiles dispuestas como una emisora de radiocontrol (modo 2); también acepta mando de juego.
- **SR-72** (`web/sr72/`): el concepto de Lockheed Martin Skunk Works con la forma del Darkstar de *Top Gun: Maverick* (21,2 m × 10,1 m, según su diseñador Daniel Simon) con dos motores de ciclo combinado (TBCC): turbofán de la clase F100/F110 arriba y estatorreactor de modo dual (ramjet/scramjet) abajo, con entrada y tobera compartidas. La rampa de entrada y la compuerta divisora se mueven con el Mach, el corte muestra el flujo coloreado por temperatura y el perfil de misión lleva el avión a Mach 6. Las cotas son estimaciones a partir de las imágenes publicadas del concepto.
- **F-22 Raptor** (`web/f22/`) y **SR-71 Blackbird** (`web/sr71/`) a escala real, con sus Pratt & Whitney F119 (fan de 3 etapas, compresor de 6, turbinas contrarrotativas, tobera bidimensional de empuje vectorial) y J58 (compresor de 9 etapas, cono de entrada móvil, tubos de derivación al postquemador, eyector).
- **F-14 Tomcat** (`web/f14/`) según las cotas públicas de su manual NATOPS, con sus General Electric F110-GE-400 (fan de 3 etapas, compresor de 9, turbinas de 1 y 2 etapas, tobera de pétalos) y las alas de geometría variable, que giran de 20° a 68° con el Mach.
- Los cuatro aviones usan el mismo visor (`web/jet/`): núcleo común, interfaz de escritorio e interfaz de celular. Cada avión aporta su `config.js`, su `sim.js` y su `parts.json`.
- **Escritorio y celular** van separados en la misma URL: `device.js` detecta el dispositivo y carga `desktop.js` o `mobile.js` con su hoja de estilos. En celular, la calidad (densidad de píxeles, sombras, texturas) se fija según la GPU, la memoria y los núcleos del teléfono, y se ajusta sola con los fps reales. `?vista=celular` o `?vista=escritorio` fuerza una interfaz; `?debug=1` muestra el perfil del teléfono y los fps en pantalla.

```bash
pip install bpy                      # Blender como módulo de Python
python blender/build_headless.py     # web/mw54.glb
python blender/build_jet.py sr72     # web/sr72/sr72.glb (también f22, f14 y sr71)
python blender/assets/make_insignia.py
node src/serve.mjs web               # http://127.0.0.1:8765/
node src/to-pages.mjs                # copia el sitio a ../mw54-microturbina
```

Reflejos: HDRI *Empty Warehouse 01* de [Poly Haven](https://polyhaven.com/a/empty_warehouse_01) (CC0).

---

## English

Interactive isometric figure of the Wren MW54 micro-turbine: exploded view, assembly simulation, running engine with airflow, and a materials analysis with melting points.

```bash
npm run build   # dist/index.html and dist/light.html
npm run audit   # checks the geometry
```

Built with the [anatomy](https://github.com/wheresryan22/anatomy) skill (MIT), included in `.claude/skills/anatomy`.
Engine data: [GTBA · MW54](https://www.gtba.co.uk/engine_designs/mw54.php).

### 3D viewer (`web/`)

- **Hawk + MW54** (`web/index.html`): a 1:7 jet trainer model with the MW54, a tandem cockpit whose controls follow the pilot's inputs, assembly and exploded view, heat map and flight simulator. On phones it flies with two touch sticks laid out like a Mode 2 RC transmitter; gamepads work too.
- **SR-72** (`web/sr72/`): Lockheed Martin Skunk Works' concept shaped like the Darkstar from *Top Gun: Maverick* (21.2 m × 10.1 m, per its designer Daniel Simon) with two turbine-based combined-cycle (TBCC) engines: an F100/F110-class turbofan on top and a dual-mode ramjet/scramjet below, sharing inlet and nozzle. The inlet ramp and splitter flap move with Mach number, the cutaway shows the airflow coloured by temperature and the mission profile takes the aircraft to Mach 6. Dimensions are estimates from the published concept images.
- **F-22 Raptor** (`web/f22/`) and **SR-71 Blackbird** (`web/sr71/`) at full scale, with their Pratt & Whitney F119 (3-stage fan, 6-stage compressor, counter-rotating turbines, 2D thrust-vectoring nozzle) and J58 (9-stage compressor, translating inlet spike, bypass tubes to the afterburner, ejector).
- **F-14 Tomcat** (`web/f14/`) from the public dimensions in its NATOPS flight manual, with its General Electric F110-GE-400s (3-stage fan, 9-stage compressor, 1- and 2-stage turbines, iris nozzle) and variable-sweep wings that move from 20° to 68° with Mach number.
- All four aircraft share one viewer (`web/jet/`): a common core, a desktop interface and a phone interface. Each aircraft provides its own `config.js`, `sim.js` and `parts.json`.
- **Desktop and phone** are separate at the same URL: `device.js` detects the device and loads `desktop.js` or `mobile.js` with its stylesheet. On phones, quality (pixel density, shadows, textures) is set from the phone's GPU, memory and cores, and adjusts itself to the real frame rate. `?vista=celular` or `?vista=escritorio` forces an interface; `?debug=1` shows the phone profile and fps on screen.

```bash
pip install bpy                      # Blender as a Python module
python blender/build_headless.py     # web/mw54.glb
python blender/build_jet.py sr72     # web/sr72/sr72.glb (también f22, f14 y sr71)
python blender/assets/make_insignia.py
node src/serve.mjs web               # http://127.0.0.1:8765/
node src/to-pages.mjs                # copies the site to ../mw54-microturbina
```

Reflections: *Empty Warehouse 01* HDRI from [Poly Haven](https://polyhaven.com/a/empty_warehouse_01) (CC0).
