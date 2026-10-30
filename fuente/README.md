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
- **SR-72** (`web/sr72/`): el concepto de Lockheed Martin Skunk Works a escala real con dos motores de ciclo combinado (TBCC): turbofán de la clase F100/F110 arriba y estatorreactor de modo dual (ramjet/scramjet) abajo, con entrada y tobera compartidas. La rampa de entrada y la compuerta divisora se mueven con el Mach, el corte muestra el flujo coloreado por temperatura y el perfil de misión lleva el avión a Mach 6. Las cotas son estimaciones a partir de las imágenes publicadas del concepto.

```bash
pip install bpy                      # Blender como módulo de Python
python blender/build_headless.py     # web/mw54.glb
python blender/build_sr72.py         # web/sr72/sr72.glb
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
- **SR-72** (`web/sr72/`): Lockheed Martin Skunk Works' concept at full scale with two turbine-based combined-cycle (TBCC) engines: an F100/F110-class turbofan on top and a dual-mode ramjet/scramjet below, sharing inlet and nozzle. The inlet ramp and splitter flap move with Mach number, the cutaway shows the airflow coloured by temperature and the mission profile takes the aircraft to Mach 6. Dimensions are estimates from the published concept images.

```bash
pip install bpy                      # Blender as a Python module
python blender/build_headless.py     # web/mw54.glb
python blender/build_sr72.py         # web/sr72/sr72.glb
python blender/assets/make_insignia.py
node src/serve.mjs web               # http://127.0.0.1:8765/
node src/to-pages.mjs                # copies the site to ../mw54-microturbina
```

Reflections: *Empty Warehouse 01* HDRI from [Poly Haven](https://polyhaven.com/a/empty_warehouse_01) (CC0).
