import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { Pool } from 'mysql2/promise';
import { Usuario, AuthRequest } from '../types';

export class UsuariosController {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async getAll(req: any, res: Response) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
      const rol = req.query.rol;
      const search = req.query.search || '';

      let query = 'SELECT usua_id AS id, usua_nombre AS nombre, usua_email AS email, usua_rol AS rol, usua_activo AS activo, created_at, updated_at FROM Usuarios WHERE usua_activo = 1';
      let countQuery = 'SELECT COUNT(*) as total FROM Usuarios WHERE usua_activo = 1';
      const params: any[] = [];

      if (rol) {
        query += ' AND usua_rol = ?';
        countQuery += ' AND usua_rol = ?';
        params.push(rol);
      }

      if (search) {
        query += ' AND (usua_nombre LIKE ? OR usua_email LIKE ?)';
        countQuery += ' AND (usua_nombre LIKE ? OR usua_email LIKE ?)';
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await this.db.execute(query, params);
      const [countRows] = await this.db.execute(countQuery, params.slice(0, -2));
      
      const total = (countRows as any[])[0].total;
      const totalPages = Math.ceil(total / limit);

      res.json({
        data: rows as Omit<Usuario, 'password'>[],
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      // Solo admins pueden ver cualquier usuario, otros solo su propio perfil
      if (currentUser?.rol !== 'admin' && currentUser?.id !== parseInt(id)) {
        res.status(403).json({
          error: 'No tienes permisos para ver este usuario'
        });
        return;
      }
      
      const [rows] = await this.db.execute(
        'SELECT usua_id AS id, usua_nombre AS nombre, usua_email AS email, usua_rol AS rol, usua_activo AS activo, created_at, updated_at FROM Usuarios WHERE usua_id = ? AND usua_activo = 1',
        [id]
      );
      const usuarios = rows as Omit<Usuario, 'password'>[];

      if (usuarios.length === 0) {
        res.status(404).json({
          error: 'Usuario no encontrado'
        });
        return;
      }

      res.json(usuarios[0]);
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async create(req: any, res: Response) {
    try {
      const { nombre, email, password, rol } = req.body;

      // Verificar si el usuario ya existe (unicidad por email)
      const [existingUsers] = await this.db.execute(
        'SELECT usua_id FROM Usuarios WHERE usua_email = ?',
        [email]
      );
      
      if ((existingUsers as any[]).length > 0) {
        res.status(400).json({
          error: 'El email ya está registrado'
        });
        return;
      }

      // Encriptar contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      const [result] = await this.db.execute(
        'INSERT INTO Usuarios (usua_nombre, usua_email, usua_password_hash, usua_rol, usua_activo) VALUES (?, ?, ?, ?, 1)',
        [nombre, email, hashedPassword, rol]
      );

      const insertId = (result as any).insertId;
      
      const [newUser] = await this.db.execute(
        'SELECT usua_id AS id, usua_nombre AS nombre, usua_email AS email, usua_rol AS rol, usua_activo AS activo, created_at, updated_at FROM Usuarios WHERE usua_id = ?',
        [insertId]
      );

      res.status(201).json((newUser as Omit<Usuario, 'password'>[])[0]);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { nombre, email, rol } = req.body;
      const currentUser = req.user;

      // Solo admins pueden actualizar cualquier usuario, otros solo su propio perfil
      if (currentUser?.rol !== 'admin' && currentUser?.id !== parseInt(id)) {
        res.status(403).json({
          error: 'No tienes permisos para actualizar este usuario'
        });
        return;
      }

      // Verificar si el usuario existe
      const [existingUser] = await this.db.execute(
        'SELECT usua_id, usua_rol FROM Usuarios WHERE usua_id = ? AND usua_activo = 1',
        [id]
      );
      
      if ((existingUser as any[]).length === 0) {
        res.status(404).json({
          error: 'Usuario no encontrado'
        });
        return;
      }

      const userRow = (existingUser as any[])[0];

      // Solo admins pueden cambiar roles
      let updateRol = userRow.usua_rol;
      if (currentUser?.rol === 'admin' && rol) {
        updateRol = rol;
      }

      // Verificar si el email ya existe en otro usuario
      const [emailCheck] = await this.db.execute(
        'SELECT usua_id FROM Usuarios WHERE usua_email = ? AND usua_id != ? AND usua_activo = 1',
        [email, id]
      );
      
      if ((emailCheck as any[]).length > 0) {
        res.status(400).json({
          error: 'El email ya está registrado por otro usuario'
        });
        return;
      }

      await this.db.execute(
        'UPDATE Usuarios SET usua_nombre = ?, usua_email = ?, usua_rol = ?, usua_updated_at = CURRENT_TIMESTAMP WHERE usua_id = ?',
        [nombre, email, updateRol, id]
      );

      const [updatedUser] = await this.db.execute(
        'SELECT usua_id AS id, usua_nombre AS nombre, usua_email AS email, usua_rol AS rol, usua_activo AS activo, created_at, updated_at FROM Usuarios WHERE usua_id = ?',
        [id]
      );

      res.json((updatedUser as Omit<Usuario, 'password'>[])[0]);
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { current_password, new_password } = req.body;
      const currentUser = req.user;

      // Solo el propio usuario puede cambiar su contraseña
      if (currentUser?.id !== parseInt(id)) {
        res.status(403).json({
          error: 'Solo puedes cambiar tu propia contraseña'
        });
        return;
      }

      // Obtener usuario actual con contraseña (usar columnas reales)
      const [rows] = await this.db.execute(
        'SELECT usua_id, usua_password_hash FROM Usuarios WHERE usua_id = ? AND usua_activo = 1',
        [id]
      );
      const usuarios = rows as Pick<Usuario, 'usua_id' | 'usua_password_hash'>[] as any;

      if (usuarios.length === 0) {
        res.status(404).json({
          error: 'Usuario no encontrado'
        });
        return;
      }

      const user = usuarios[0] as any;
      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(current_password, user.usua_password_hash);
      if (!isValidPassword) {
        res.status(400).json({
          error: 'Contraseña actual incorrecta'
        });
        return;
      }

      // Política básica de contraseña ya debería validarse en la ruta, pero por seguridad
      const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!strongPwdRegex.test(new_password)) {
        res.status(400).json({
          error: 'La nueva contraseña no cumple con la política de seguridad'
        });
        return;
      }

      // Encriptar nueva contraseña
      const hashedNewPassword = await bcrypt.hash(new_password, 10);

      // Actualizar contraseña (columnas reales)
      await this.db.execute(
        'UPDATE Usuarios SET usua_password_hash = ? WHERE usua_id = ?',
        [hashedNewPassword, id]
      );

      // Revocar todos los refresh tokens activos del usuario
      try {
        await this.db.execute(
           'UPDATE RefreshTokens SET reto_revoked = 1 WHERE reto_user_id = ? AND reto_revoked = 0',
           [id]
        );
      } catch (e) {
        console.warn('No se pudo revocar algunos tokens de refresco para el usuario', e);
      }

      // Borrar cookie refreshToken para forzar re-login
      try {
        (res as any).clearCookie('refreshToken', { path: '/' });
      } catch {}

      res.json({ message: 'Contraseña actualizada exitosamente. Por seguridad, se cerró la sesión en otros dispositivos.' });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const currentUser = req.user;

      // No permitir que un usuario se elimine a sí mismo
      if (currentUser?.id === parseInt(id)) {
        res.status(400).json({
          error: 'No puedes eliminar tu propia cuenta'
        });
        return;
      }

      // Verificar si el usuario existe
      const [existingUser] = await this.db.execute(
        'SELECT usua_id FROM Usuarios WHERE usua_id = ? AND usua_activo = 1',
        [id]
      );
      
      if ((existingUser as any[]).length === 0) {
        res.status(404).json({
          error: 'Usuario no encontrado'
        });
        return;
      }

      // Soft delete
      await this.db.execute(
        'UPDATE Usuarios SET usua_activo = 0, usua_updated_at = CURRENT_TIMESTAMP WHERE usua_id = ?',
        [id]
      );

      // Revocar todos los refresh tokens activos del usuario desactivado
      try {
        await this.db.execute(
          'UPDATE RefreshTokens SET reto_revoked = 1 WHERE reto_user_id = ? AND reto_revoked = 0',
          [id]
        );
      } catch (e) {
        console.warn('No se pudo revocar tokens de refresco al desactivar usuario', e);
      }

      res.json({ message: 'Usuario desactivado exitosamente' });
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async getProfile(req: AuthRequest, res: Response) {
    try {
      const currentUser = req.user;

      if (!currentUser) {
        res.status(401).json({
          error: 'Usuario no autenticado'
        });
        return;
      }

      const [rows] = await this.db.execute(
        'SELECT usua_id AS id, usua_nombre AS nombre, usua_email AS email, usua_rol AS rol, usua_activo AS activo, created_at, updated_at FROM Usuarios WHERE usua_id = ? AND usua_activo = 1',
        [currentUser.id]
      );
      const usuarios = rows as Omit<Usuario, 'password'>[];

      if (usuarios.length === 0) {
        res.status(404).json({
          error: 'Usuario no encontrado'
        });
        return;
      }

      res.json(usuarios[0]);
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  // Editar el propio perfil (nombre, email) usando columnas reales y alias en salida
  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const currentUser = req.user;
      if (!currentUser) {
        res.status(401).json({ error: 'Usuario no autenticado' });
        return;
      }

      const { nombre, email } = req.body as { nombre?: string; email?: string };

      // Validación mínima
      if ((nombre === undefined || nombre === null) && (email === undefined || email === null)) {
        res.status(400).json({ error: 'Debe enviar al menos un campo a actualizar' });
        return;
      }

      // Si viene email, verificar unicidad en usuarios activos
      if (email) {
        const [emailRows] = await this.db.execute(
          'SELECT usua_id FROM Usuarios WHERE usua_email = ? AND usua_id != ? AND usua_activo = 1',
          [email, currentUser.id]
        );
        if ((emailRows as any[]).length > 0) {
          res.status(400).json({ error: 'El email ya está registrado por otro usuario' });
          return;
        }
      }

      // Construir SET dinámico
      const fields: string[] = [];
      const params: any[] = [];
      if (typeof nombre === 'string') {
        fields.push('usua_nombre = ?');
        params.push(nombre);
      }
      if (typeof email === 'string') {
        fields.push('usua_email = ?');
        params.push(email);
      }
      if (fields.length === 0) {
        res.status(400).json({ error: 'Sin cambios para aplicar' });
        return;
      }

      fields.push('usua_updated_at = CURRENT_TIMESTAMP');
      const sql = `UPDATE Usuarios SET ${fields.join(', ')} WHERE usua_id = ? AND usua_activo = 1`;
      params.push(currentUser.id);

      const [upd] = await this.db.execute(sql, params);
      // Confirmar que se actualizó
      const [rows] = await this.db.execute(
        'SELECT usua_id AS id, usua_nombre AS nombre, usua_email AS email, usua_rol AS rol, usua_activo AS activo, usua_created_at AS created_at, usua_updated_at AS updated_at FROM Usuarios WHERE usua_id = ?',
        [currentUser.id]
      );
      const user = (rows as any[])[0];

      res.json(user);
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Restaurar usuario (soft-deleted)
  async restore(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };

      // Verificar que existe y está inactivo
      const [rows] = await this.db.execute(
        'SELECT usua_id FROM Usuarios WHERE usua_id = ? AND usua_activo = 0',
        [id]
      );
      if ((rows as any[]).length === 0) {
        res.status(404).json({ error: 'Usuario no encontrado o ya activo' });
        return;
      }

      await this.db.execute(
        'UPDATE Usuarios SET usua_activo = 1, usua_updated_at = CURRENT_TIMESTAMP WHERE usua_id = ?',
        [id]
      );

      const [userRows] = await this.db.execute(
        'SELECT usua_id AS id, usua_nombre AS nombre, usua_email AS email, usua_rol AS rol, usua_activo AS activo, usua_created_at, usua_updated_at FROM Usuarios WHERE usua_id = ?',
        [id]
      );

      res.json((userRows as any[])[0]);
    } catch (error) {
      console.error('Error al restaurar usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}