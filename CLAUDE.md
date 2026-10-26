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
  `b26v2_backup_preimport`, `b26v2_backup_pre_v3`. No se sobrescriben los de
  migración.
- `APP.dataVersion` versiona la estructura (3 = Bilbo + tobillo);
  `EXPORT_SCHEMA_VERSION` el sobre del archivo exportado. El importador debe
  seguir aceptando exportaciones antiguas.

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

## Restricciones

- Sin dependencias ni build: nada de npm, CDNs nuevos ni frameworks.
- Probar en navegador real (Playwright/Chromium sirve de aproximación, no
  sustituye a Safari iOS).
