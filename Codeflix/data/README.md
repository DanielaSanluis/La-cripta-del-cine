No editar los JSON directamente

Este directorio contiene archivos JSON usados por el servidor:

- `movies.json`: lista de películas con sus propiedades (id, title, poster, synopsis, tags, gore, scares, trailer, comments, etc.)
- `carousels.json`: definición de los carousels (arrays de ids de películas para cada carrusel)

Importante:
- Los archivos JSON no admiten comentarios. Agregar comentarios dentro de los archivos JSON hará que fallen al parsearse.
- Para documentar la estructura o hacer anotaciones, usa este archivo `README.md` o crea archivos `.md` adicionales.

Buenas prácticas:
- Si necesitas agregar un campo, hazlo siguiendo la estructura existente y validando con el servidor.
- Para cambios persistentes, realiza una copia de seguridad antes de editar.
