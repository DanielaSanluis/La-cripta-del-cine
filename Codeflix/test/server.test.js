/**
 * Importamos las herramientas necesarias:
 * - node:test → framework nativo de pruebas en Node.js
 * - assert/strict → para validar resultados
 * - supertest → para simular peticiones HTTP sin levantar el servidor
 * - app → nuestra aplicación Express
 */
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../server.js";

/**
 * CP-01: Comprobar que la página principal carga correctamente
 */
test("GET / debe responder 200 y HTML", async () => {
    // Realiza una petición GET a la ruta principal "/"
  const res = await request(app).get("/").expect(200);
    // Verifica que el contenido devuelto sea HTML
  assert.match(res.headers["content-type"], /html/);
});

/**
 * CP-02: Comprobar que puedo navegar a la página de detalle (/movie.html)
 */
test("GET /movie.html debe responder 200 y HTML", async () => {
  const res = await request(app).get("/movie.html").expect(200);
  assert.match(res.headers["content-type"], /html/);
});

/**
 * CP-03: Verificar que si busco una película (lista y detalle) obtengo datos coherentes
 */
test("GET /api/movies y /api/movies/:id devuelven datos coherentes", async () => {
  // Primero obtenemos la lista completa de películas
  const resLista = await request(app)
    .get("/api/movies")
    .expect(200)
    .expect("Content-Type", /json/);

  // Debe devolver un arreglo
  assert.ok(Array.isArray(resLista.body), "Debe devolver un arreglo");
  assert.ok(resLista.body.length > 0, "Debe haber al menos una película");

  // Tomamos la primera película de la lista
  const movie = resLista.body[0];
  assert.ok(movie.id, "La película debe tener id");

  // Ahora consultamos la información detallada de esa misma película
  const resDetalle = await request(app)
    .get(`/api/movies/${movie.id}`)
    .expect(200)
    .expect("Content-Type", /json/);

  // Comprobamos que ambos endpoints coinciden
  assert.equal(resDetalle.body.id, movie.id);
  assert.equal(resDetalle.body.title, movie.title);
});

/**
 * CP-04: Verificar que puedo agregar un comentario a una película
 */
test("POST /api/movies/:id/comment agrega un comentario", async () => {
  // Primero obtenemos una película existente
  const resLista = await request(app).get("/api/movies").expect(200);
  const movie = resLista.body[0];

  // Creamos un comentario de prueba
  const comentario = {
    user: "Daniela",
    text: "Prueba de comentario desde test"
  };

  // Enviamos el comentario al endpoint correspondiente
  const res = await request(app)
    .post(`/api/movies/${movie.id}/comment`)
    .send(comentario)
    .expect(201)
    .expect("Content-Type", /json/);

   // Comprobaciones del resultado
  assert.equal(res.body.success, true);
  assert.ok(res.body.comment, "Debe regresar el comentario guardado");
  assert.equal(res.body.comment.user, comentario.user);
  assert.equal(res.body.comment.text, comentario.text);
});

/**
 * CP-05: Validación — No debo dejar el correo vacío en /api/contact
 */
test("POST /api/contact rechaza correo vacío", async () => {
  const res = await request(app)
    .post("/api/contact")
    .send({
      name: "Daniela",
      email: "",
      message: "Hola, esto no debería pasar"
    });

  // Debe regresar error 400
  assert.equal(res.statusCode, 400);
  // El mensaje de error debe mencionar que falta un campo o correo inválido
  assert.match(res.body.error, /Faltan campos|correo/i);
});

/**
 * CP-06: No acepta correos con dominio inválido (ej. gmail.sfvn)
 */
test("POST /api/contact rechaza correo con dominio inválido", async () => {
  const res = await request(app)
    .post("/api/contact")
    .send({
      name: "Daniela",
      email: "estrellasanluis4@gmail.sfvn",
      message: "Probando dominio inválido"
    });

   // Tiene que regresar error 400
  assert.equal(res.statusCode, 400);
  // El mensaje debe indicar que el correo es inválido
  assert.match(res.body.error, /inválido/i);
});

/**
 * CP-07: Acepta correo válido y guarda mensaje correctamente
 */
test("POST /api/contact acepta correo válido", async () => {
  const res = await request(app)
    .post("/api/contact")
    .send({
      name: "Daniela",
      email: "estrellasanluis4@gmail.com",
      message: "Quiero más pelis de terror en la cartelera"
    })
    .expect(201)
    .expect("Content-Type", /json/);

  // Comprobaciones de éxito
  assert.equal(res.body.success, true);
  assert.equal(res.body.contact.name, "Daniela");
  assert.equal(res.body.contact.email, "estrellasanluis4@gmail.com");
});
