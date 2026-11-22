# BULK26 · registro de entrenamiento

PWA de un solo archivo (`index.html`, vanilla JS) con `sw.js` y `chart.umd.min.js`
local, desplegada en GitHub Pages. Se usa instalada en la pantalla de inicio de
**Safari iOS**: cualquier cambio tiene que funcionar ahí (sin `<a download>`
fiable en standalone, la app se reanuda sin recargar, sin botón de recargar).

## Datos: irrecuperables

- Todo vive en `localStorage['b26v2']` del iPhone. No hay servidor ni copia
  automática fuera del dispositivo. **No cambiar nunca la key.**
- Cambios de esquema **solo aditivos** (campos nuevos; nada se renombra ni se
  borra). Toda migración: copia previa en una key de respaldo
  (`b26v2_backup_*`), comprobar la copia, abortar si falla, idempotente.
- Respaldos existentes: `b26v2_backup_v1` (split), `b26v2_backup_prereset`,
  `b26v2_backup_preimport`, `b26v2_backup_pre_v3`, `b26v2_backup_pre_v4`. No
  se sobrescriben los de migración.
- `APP.dataVersion` versiona la estructura (3 = Bilbo + tobillo; 4 = cambios
  de ejercicios de la fase 5); `EXPORT_SCHEMA_VERSION` el sobre del archivo
  exportado (3 = pasos y actividad; los datos v4 siguen en 3 porque el sobre no
  cambia y una app vieja ya rechaza `dataVersion` mayor que el suyo). El
  importador debe seguir aceptando exportaciones antiguas y migrarlas.
- Cada guarda de migración compara con su número fijo (`>= 3`, `>= 4`), nunca
  con `DATA_VERSION`: si no, al subirlo la migración anterior se repite.

## Ejercicios: ids

- `prevMicro` y la analítica se indexan por id de ejercicio: **un id no se
  repite entre sesiones ni se reutiliza** después de retirarlo (aunque el
  ejercicio se llame igual, p. ej. `curl_martillo` en Tracción 2 y
  `curl_martillo_brazo` en Brazo).
- Los cambios de la v4 están en `V4_CHANGES` (por sesión: ids retirados → id
  nuevo en la posición del primero). Retirados: `predicador_manc`,
  `flex_ante_b1-3`, `ext_ante_b1-3`, `hip_thrust`, `remo_prono`. Nuevos:
  `curl_martillo_brazo`, `wrist_roller_b1-3`, `remo_multi_pecho`.
- Al retirar ejercicios, snapshots y logs archivados no se tocan. Si la sesión
  tiene series hechas en un ejercicio que se retira, no se migra en ese micro:
  queda en `APP.v4Pending` y se aplica en `confirmClose()` tras archivarla.

## Log diario, pasos y actividad (fase 4)

- Entrada de `log` (`"D1"`, `"D2"`…): `{w, c, s?, act?, actMin?, date?}`.
  `s` pasos tal como los cuenta el móvil (entero 0-100000); `act` es
  `"padel" | "baloncesto" | "futbol" | null`; `actMin` (1-600) solo si hay
  `act`; `date` es la fecha local `YYYY-MM-DD` fijada al crear la entrada.
  Todo opcional: las entradas `{w, c}` antiguas siguen siendo válidas.
- **La actividad nunca se convierte en pasos**: ni se suman ni se estiman.
  Un día con actividad cuenta como objetivo cumplido aunque tenga menos pasos
  que `goals.s` (10000 por defecto, que no se guarda). Lo que no se cumple no
  se pinta con `--down`.
- Al cerrar el micro, **antes de vaciar `log`**, se copia íntegro en
  `snapshot.log`. Además de `wHist`/`cHist` se guardan `sHist` (media de pasos
  de los días SIN actividad; `null` si no hay) y `actHist` (`{n, min}`).
- `sHist` y `actHist` van **alineados por índice con `wHist`** (índice i =
  micro i+1). Antes de añadir se rellenan con `null` hasta `wHist.length`:
  `null` es «no se registraba», distinto de `{n:0, min:0}`. Lo que vacíe
  `wHist` vacía también estos dos.
- Edición de un día (`quickEditLog`): mezcla con la entrada existente, nunca la
  sustituye (si no, se pierden pasos, actividad y fecha).

## Datos reales y repo público

- Las exportaciones reales viven en `../datos/` (fuera del repo). Úsalas como
  fixture de pruebas leyéndolas desde ahí; **nunca** las copies al repo ni a un
  commit. `.gitignore` bloquea `datos/`, `bulk26_*.json` y `*:Zone.Identifier`
  como segunda barrera. No uses `git add -A` sin mirar `git status`.

## Despliegue

- **Subir `CACHE_VERSION` en `sw.js` en cada despliegue** que cambie cualquier
  archivo: es lo que hace que el iPhone instale la versión nueva.
- **El push a `main` (= despliegue) lo hace el usuario.** Trabajo en rama, commits
  pequeños, sin merge ni push sin confirmación.

## Nunca exigir reinstalar la PWA

En iOS la PWA instalada tiene su propio contenedor de almacenamiento y no se
asume que `b26v2` sobreviva a quitarla y volver a añadirla. Ningún cambio puede
requerir reinstalarla: nada de tocar `apple-mobile-web-app-status-bar-style`
(se queda en `black`) ni otros metadatos que iOS fija al instalar. Los cambios
del manifest que solo se aplican al reinstalar se pueden hacer, pero no se
cuenta con ellos.

## Diseño

Tokens de color en `:root` (claro) y `prefers-color-scheme: dark`; ningún color
fuera de tokens, tampoco en Chart.js (se leen con `getComputedStyle`).
Tipografía autoalojada en `fonts/` (Barlow / Barlow Condensed, OFL), precacheada
por `sw.js`: nada de fuentes por red.

## Restricciones

- Sin dependencias ni build: nada de npm, CDNs nuevos ni frameworks.
- Probar en navegador real (Playwright/Chromium sirve de aproximación, no
  sustituye a Safari iOS).
