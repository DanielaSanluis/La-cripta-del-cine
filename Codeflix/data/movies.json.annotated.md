# movies.json - Documentación línea/clave

Este archivo acompaña a `movies.json`. No podemos añadir comentarios dentro de un JSON válido, así que aquí explico, en orden, qué significa cada línea/clave y detallo anomalías que conviene corregir.

Formato general:
- El fichero es un array de objetos, cada objeto representa una película.
- Comentario: las explicaciones siguen el orden y las claves tal como aparecen en el primer objeto. Los objetos siguientes repiten las mismas claves con valores distintos.

Estructura de un objeto película (explicación por clave):

- `id`: número entero único que identifica la película. Se usa en rutas `/api/movies/:id` y en enlaces a `movie.html?id=<id>`.

- `title`: título de la película (string).

- `year`: año de estreno (número).

- `country`: país o países de producción (string).

- `poster`: ruta relativa al archivo de imagen para la carátula (string). Ejemplo: `images/conjuro.png`.

- `video` o `trailer`: ruta o referencia al video/tráiler. Atención:
  - Puede aparecer como `video` (ruta local tipo `videos/archivo.mp4`) o `trailer`.
  - `trailer` en algunos objetos es un string (por ejemplo un enlace a YouTube) o un objeto con `{ type, url, format }` para distinguir trailers locales de embebidos.
  - Nota: hay inconsistencias (espacios extra en `"video": " videos/saw.mp4"` y rutas con o sin `/` al inicio). Conviene normalizar.

- `synopsis`: resumen de la película (string).

- `tags`: array de strings con etiquetas útiles para filtros y búsquedas.

- `gore`: puntuación numérica (float/entero) que mide la intensidad de gore. Se utiliza para filtros por métricas.

- `scares`: puntuación numérica (float/entero) que mide la intensidad de sustos.

- `subgenre`: subgénero textual (string).

- `comments`: array de objetos con comentarios de usuarios. Cada comentario tiene:
  - `user`: nombre del usuario (string).
  - `text`: texto del comentario (string).
  - `date`: fecha/hora en ISO o en una cadena; se observan distintos formatos (`YYYY-MM-DD HH:mm`, ISO `YYYY-MM-DDTHH:mm:ss.sssZ`).
  - Observación: el servidor y frontend deben manejar ambos formatos o normalizar al guardar.

- `jumpscares`: número medio/valor para jumpscares (float). Aparentemente es una métrica agregada.

- `suspense`: número medio/valor para suspense (float).

- `gore_count`, `scares_count`, `jumps_count`, `suspense_count`: contadores enteros usados para computar medias ponderadas al aceptar nuevos ratings. No todos los objetos los tienen; cuando faltan, el código del servidor debería inicializarlos a 0.


Notas y recomendaciones importantes encontradas en `movies.json`:

- Duplicados y keys repetidas: hay al menos dos objetos con `id: 12` (uno para `House (Hausu)` y otro para `Creepy`). IDs deben ser únicos: revisar y corregir si se espera enlace fiable por `id`.

- Inconsistencias en rutas `video`/`poster`: algunos valores incluyen espacios al inicio o barras inconsistentes. Normalizar a una convención (por ejemplo `videos/nombre.mp4` sin espacios y sin barra inicial) reducirá errores en la carga del recurso.

- Tipos mixtos en `trailer`: algunos `trailer` son strings (YouTube), otros objetos (local). Si el frontend detecta `typeof trailer === 'object'` debe renderizar un `video` local; si es `string` y contiene `youtube`/`embed`, renderizar un `iframe`.

- Campos de contadores ausentes: varias películas no tienen `gore_count`, `scares_count`, `jumps_count` o `suspense_count`. El servidor debería usar `|| 0` al leerlos o inicializarlos con la migración (por ejemplo `scripts/add_fields.js`).

- Fechas de comentarios: formatos mixtos. Aconsejo normalizar a ISO cuando se almacena un nuevo comentario y, si es necesario, convertir a localización para mostrar.

- Prefijos inconsistentes en `video` con o sin `/` inicial: elegir una forma consistente. En `server.js` puede usarse `path.join` y servir desde `public/` o `src/` según la configuración.


Estrategia para documentar línea por línea (si quieres que lo haga literalmente):
- Puedo generar un archivo `movies.json.annotated-linebyline.txt` con una línea por línea donde cada entrada original lleva a su lado un comentario explicativo. Aviso: ese archivo será muy grande (tantas líneas como el JSON) y puede ser difícil de revisar.
- Alternativamente, puedo añadir comentarios inline en los archivos JS que manejan este JSON (por ejemplo en `server.js`, `main.js`, `movie.js`) explicando cómo se usan las claves — ya lo hice para esas fuentes.

Si quieres que genere la anotación literal línea-a-línea (archivo grande), dime y lo creo; si prefieres que corrija/normalice el JSON (p. ej. IDs duplicados, espacios en rutas), dime qué reglas aplicar y lo hago.

---
Archivo inspeccionado: `Codeflix/data/movies.json` (lista de películas).

Fin de `movies.json.annotated.md`.
