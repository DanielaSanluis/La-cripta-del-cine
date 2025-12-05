
___________________________________________
CodeFlix – Documentación del Proyecto
___________________________________________

CodeFlix es una aplicación web ligera que sirve como catálogo de
videos/películas con una estructura de datos local basada en JSON. El
repositorio incluye un servidor Node.js (archivo server.js), datos de
ejemplo en la carpeta data/, assets públicos en public/, scripts
utilitarios en scripts/ y la interfaz estática en src/.

El objetivo de esta documentación es proporcionar instrucciones
claras para ejecutar, mantener y ampliar el sistema.

___________________________________________
Estructura del repositorio
___________________________________________


  Archivo/Carpeta   Descripción
  ----------------- ---------------------------------------------------------------------------------
  package.json      Dependencias y scripts del proyecto (Node.js).
  server.js         Servidor HTTP principal (Node/Express o http nativo según implementación).
  test_rating.js    Pruebas / scripts para evaluar la puntuación o lógica (archivo de test manual).
  data/             Datos de entrada (movies.json, carousels.json, …).
  public/           Recursos públicos servidos al cliente (imágenes, videos).
  scripts/          Utilidades y scripts de normalización/transformación de datos.
  src/              Código front-end (HTML, CSS, JS).
  README.tex        Esta documentación.

___________________________________________
Instrucciones de desarrollo y ejecución
___________________________________________

Requisitos

- Node.js v14+ (recomendado).

Instalación

npm install

Ejecución en entorno de desarrollo

node server.js

Luego abrir en el navegador http://localhost:3000

______________________________________________
Documentación del código y tareas realizadas
______________________________________________

En el repositorio se han añadido comentarios en los puntos de
entrada principales para facilitar mantenimiento.


______________________________________________
Cómo contribuir
______________________________________________
- Crear rama feature/ o fix/. - Añadir tests. - Abrir pull request.


______________________________________________
Contact Us
______________________________________________

Facultad de Ciencias, UNAM Investigación Científica, C.U., Alcaldía Coyoacán, C.P. 04510. Ciudad de México, México.
