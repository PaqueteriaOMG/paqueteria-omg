import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import path from 'path';

// Opciones de configuración de Swagger
const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Paquetería OMG',
      version: '1.0.0',
      description: 'Documentación de la API del sistema de paquetería OMG',
      contact: {
        name: 'OMG Paquetería',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.resolve(__dirname, '../routes/*.ts'),
    path.resolve(__dirname, '../types/*.ts')
  ], // Rutas donde buscar anotaciones de Swagger
};

// Generar especificación de Swagger
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Función para configurar Swagger en la aplicación
export const setupSwagger = (app: Application): void => {
  // Ruta para la documentación de Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  // Ruta para obtener la especificación en formato JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('Documentación de Swagger disponible en /api-docs');
};