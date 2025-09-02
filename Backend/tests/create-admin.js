const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAdmin() {
  let connection;
  
  try {
    // Crear conexión a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'paqueteria_app'
    });
    
    console.log('✅ Conectado a la base de datos');
    
    // Verificar si el usuario admin ya existe
    const [existingUsers] = await connection.execute(
      'SELECT usua_id FROM Usuarios WHERE usua_email = ?',
      ['admin@paqueteria.com']
    );
    
    if (existingUsers.length > 0) {
      console.log('ℹ️  El usuario admin ya existe');
      
      // Actualizar la contraseña del usuario existente
      await connection.execute(
        'UPDATE Usuarios SET usua_password_hash = ? WHERE usua_email = ?',
        ['$2a$10$xj9xKEuc0AcYL1nMfZr.Ve9b86hsxoBMhBTMlWoVVCQKqLS5c7uv.', 'admin@paqueteria.com']
      );
      
      console.log('✅ Contraseña del usuario admin actualizada');
    } else {
      // Crear el usuario admin
      await connection.execute(
        'INSERT INTO Usuarios (usua_nombre, usua_rol, usua_email, usua_password_hash, usua_activo) VALUES (?, ?, ?, ?, ?)',
        ['Admin', 'admin', 'admin@paqueteria.com', '$2a$10$xj9xKEuc0AcYL1nMfZr.Ve9b86hsxoBMhBTMlWoVVCQKqLS5c7uv.', true]
      );
      
      console.log('✅ Usuario admin creado exitosamente');
    }
    
    console.log('📧 Email: admin@paqueteria.com');
    console.log('🔑 Contraseña: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createAdmin();