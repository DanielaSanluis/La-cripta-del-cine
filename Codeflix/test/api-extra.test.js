import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../server.js";

/* ============================================================
   CP-08: Validación de comentarios incompletos
   ------------------------------------------------------------
   La API debe rechazar comentarios si falta algún campo obligatorio.
   En este caso, falta "text", por lo que debe regresar 400.
   ============================================================ */
test("POST /api/movies/:id/comment rechaza comentario incompleto", async () => {
  // Obtener una película existente
  const resLista = await request(app).get("/api/movies").expect(200);
  const movie = resLista.body[0];

  // Enviamos un comentario sin el campo "text"
  const res = await request(app)
    .post(`/api/movies/${movie.id}/comment`)
    .send({ user: "Daniela" }) // falta text
    .expect(400);

  // Validamos el mensaje de error
  assert.match(res.body.error, /Faltan campos/i);
});

/* ============================================================
   CP-09: Manejo de película inexistente al comentar
   ------------------------------------------------------------
   Si la película no existe, la API debe responder 404.
   ============================================================ */
test("POST /api/movies/:id/comment devuelve 404 si no existe la película", async () => {
  const res = await request(app)
    .post("/api/movies/999999/comment") // ID inexistente
    .send({ user: "Dani", text: "Comentario fantasma" });

  assert.equal(res.statusCode, 404);
  assert.match(res.body.error, /Película no encontrada/i);
});

/* ============================================================
   CP-10: Validación de valores fuera de rango en /rate
   ------------------------------------------------------------
   Las métricas deben ser valores numéricos entre 0 y 5.
   Si se envía un número mayor (ej. gore = 10), debe dar error 400.
   ============================================================ */
test("POST /api/movies/:id/rate rechaza valores > 5", async () => {
  const resLista = await request(app).get("/api/movies").expect(200);
  const movie = resLista.body[0];

  const res = await request(app)
    .post(`/api/movies/${movie.id}/rate`)
    .send({ gore: 10, scares: 3, jumpscares: 2, suspense: 4 }) // gore fuera de rango
    .expect(400);

  assert.match(res.body.error, /Campo inválido/i);
});

/* ============================================================
   CP-11: /rate acepta valores válidos y actualiza las métricas
   ------------------------------------------------------------
   Aquí verificamos:
    - Que los valores enviados estén en rango
    - Que se incrementen los contadores
    - Que las métricas resultantes sigan en 0–5
   ============================================================ */
test("POST /api/movies/:id/rate incrementa contadores y mantiene métricas en rango", async () => {
  const resLista = await request(app).get("/api/movies").expect(200);
  const movie = resLista.body[0];

  // Valores válidos dentro de 0–5
  const body = { gore: 5, scares: 4, jumpscares: 3, suspense: 2 };

  const res = await request(app)
    .post(`/api/movies/${movie.id}/rate`)
    .send(body)
    .expect(200)
    .expect("Content-Type", /json/);

  assert.equal(res.body.success, true);

  // Obtenemos película actualizada
  const updated = res.body.movie;

  // Verificamos que cada métrica esté en rango válido
  ["gore", "scares", "jumpscares", "suspense"].forEach((k) => {
    assert.ok(typeof updated[k] === "number");
    assert.ok(updated[k] >= 0 && updated[k] <= 5);
  });
});

/* ============================================================
   CP-12: Verificar que el contacto recién creado aparece en la lista
   ------------------------------------------------------------
   Flujo completo:
   1. Crear un contacto con POST /api/contact
   2. Obtener todos los contactos con GET /api/contact-list
   3. Confirmar que el contacto recién agregado esté presente
   ============================================================ */
test("GET /api/contact-list incluye el contacto recién creado", async () => {

  // 1. Creamos un nuevo contacto
  const newContact = {
    name: "Prueba Contacto",
    email: "prueba@ciencias.unam.mx",
    message: "Mensaje para probar el listado",
  };

  const resPost = await request(app)
    .post("/api/contact")
    .send(newContact)
    .expect(201);

  assert.equal(resPost.body.success, true);

  // 2. Obtenemos la lista completa de contactos
  const resList = await request(app)
    .get("/api/contact-list")
    .expect(200)
    .expect("Content-Type", /json/);

  const all = resList.body;
  assert.ok(Array.isArray(all));

  // 3. Verificamos que el contacto aparezca
  const found = all.find(
    (c) => c.email === newContact.email && c.message === newContact.message
  );

  assert.ok(found, "El nuevo contacto debe aparecer en /api/contact-list");
});
