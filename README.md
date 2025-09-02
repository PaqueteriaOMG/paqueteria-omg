# PaqueteriaOMG

## Descripcion

PaqueteriaOMG es una aplicacion web para la gestion de paqueteria.
La aplicacion permite a los usuarios registrarse, iniciar sesion, y realizar pedidos de paqueteria.
Cuenta con un panel de administracion que permite a los administradores agregar, editar, y eliminar usuarios, productos, y pedidos.

## Instalacion
- Clonar el repositorio
  - `git clone https://github.com/PaqueteriaOMG/PaqueteriaOMG.git`
- Instalar las dependencias
  - En la carpeta Backend, ejecutar `npm install`
  - En la carpeta Frontend, ejecutar `npm install`
- Configurar la base de datos
  - Crear una base de datos MySQL
  - Actualizar las credenciales de la base de datos en el archivo `.env`
  - Ejecutar el archivo `db.sql` para crear las tablas necesarias
- Ejecutar la aplicacion
  - En la carpeta Backend, ejecutar `npm start`
  - En la carpeta Frontend, ejecutar `ng serve`
- Acceder a la aplicacion en http://localhost:4200

## Tecnologias
- Node.js
- Express
- MySQL
- Angular

## TESTS

- Requisitos previos
  - Backend levantado en http://localhost:3000 (puedes usar `npm run dev` durante desarrollo o `npm start` tras compilar).
  - Base de datos creada y migrada con `db.sql`, y variables de entorno correctas en Backend (`.env`).
  - Usuario admin disponible (email: `admin@paqueteria.com`, pass: `admin123`). Si no existe, puedes crearlo con:
    - Desde la carpeta Backend: `node tests/create-admin.js`

- Ejecutar los tests (Backend/tests/)
  - Test de login básico: `npm run test:login` (alias: `npm test`)
  - Test E2E de flujo multi-paquetes/envíos: `npm run test:e2e`
  - Test E2E de tracking público (sin autenticación): `npm run test:public`

- ¿Qué valida cada test?
  - test-login.js: verifica el inicio de sesión con credenciales admin y la validez del token llamando a `/api/auth/verify`.
  - e2e-multipackage-test.js: prueba un flujo completo de negocio creando cliente, paquetes A y B, creando un envío, agregando y quitando paquetes del envío, y listando su contenido.
  - test-public-tracking.js: crea un cliente y un paquete, verifica que se genere `paqu_codigo_rastreo_publico` y consulta el endpoint público `/api/paquetes/public/track/:code` validando que devuelve datos sanitizados y 404 para códigos inexistentes.

- Notas y resolución de problemas
  - Todos los tests asumen el backend en `http://localhost:3000`. Si el puerto 3000 está ocupado, libera ese puerto antes de ejecutar los tests.
  - El endpoint público tiene limitación de tasa (rate limit). Si haces muchas solicitudes seguidas, podrías recibir 429 (Demasiadas solicitudes). Espera un minuto y vuelve a intentar.
  - Asegúrate de que la base de datos y el usuario admin estén preparados antes de correr los tests para evitar fallos de autenticación o referencias inexistentes.
