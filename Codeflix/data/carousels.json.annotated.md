# carousels.json - Documentación

Este archivo acompaña a `carousels.json` y explica las claves y su uso en la aplicación.

Contenido y significado:
- `recommended`: array de `id` de películas recomendadas que se mostrarán en un carrusel "Recomendadas" en la UI.
- `favoritesJapan`: array de `id` seleccionados como favoritos de la categoría Japón.
- `favoritesSpain`: array de `id` para la categoría España.
- `favoritesUSA`: array de `id` para la categoría EE. UU.
- `koreanHorror`: array de `id` con películas coreanas seleccionadas para ese carrusel.
- `frenchExtreme`: array de `id` con películas de cine francés extremo.

Notas operacionales:
- Los arrays contienen `id` que deben existir en `movies.json`. Si hay `id` duplicados o faltantes, el frontend podría mostrar entradas vacías o errores de renderizado.
- Si cambias `movies.json` (por ejemplo reasignando IDs), actualiza `carousels.json` para mantener la coherencia.
- Se recomienda mantener una convención para los nombres de las claves (por ejemplo camelCase o snake_case) y documentarla si vas a añadir nuevos carruseles.

Si quieres que genere una verificación automática que identifique `id` en `carousels.json` que no existan en `movies.json`, puedo añadir un script que lo valide y reporte inconsistencias.

Fin de `carousels.json.annotated.md`.
