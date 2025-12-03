# contacts.json - Documentación

Este archivo acompaña a `contacts.json`.

Estado actual:
- `contacts.json` contiene un array vacío (`[]`). Eso indica que actualmente no hay contactos guardados.

Uso en la aplicación:
- El servidor ofrece un endpoint (p. ej. `/api/contact` o `/api/contact-list`) que escribe o lee contactos en este fichero.
- Cada entrada que se añada debería ser un objeto con campos como `name`, `email`, `message`, `date` (según cómo lo maneje el frontend). Revisa `server.js` y `src/scripts/main.js` para ver exactamente qué campos esperan.

Recomendaciones:
- Normaliza la forma de los objetos que guardas aquí (por ejemplo: `{ "name": "Ana", "email": "a@e.com", "message": "hola", "date": "2025-12-02T...Z" }`).
- Valida y sanitiza los datos en el servidor antes de escribir para evitar inyección o errores de formato.
- Si quieres que genere un esquema JSON Schema o una función de validación para el servidor, puedo añadirla.

Fin de `contacts.json.annotated.md`.
