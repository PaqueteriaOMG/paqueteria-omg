import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { Pool } from 'mysql2/promise';

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && (authHeader as string).split(' ')[1];

  if (!token) {
    res.status(401).json({ success: false, error: 'Token de acceso requerido' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', async (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ success: false, error: 'Token inválido' });
      return;
    }

    try {
      const db = (req as any).app?.locals?.db as Pool | undefined;
      if (!db) {
        res.status(500).json({ success: false, error: 'Base de datos no disponible' });
        return;
      }

      // Validar que el usuario existe y está activo
      const [rows] = await db.execute(
        'SELECT usua_id, usua_email, usua_rol FROM Usuarios WHERE usua_id = ? AND usua_activo = 1',
        [decoded.id]
      );
      const users = rows as Array<{ usua_id: number; usua_email: string; usua_rol: string }>;

      if (users.length === 0) {
        res.status(401).json({ success: false, error: 'Usuario no válido o inactivo' });
        return;
      }

      const u = users[0];
      req.user = { id: u.usua_id, email: u.usua_email, rol: u.usua_rol } as any;
      next();
    } catch (e) {
      console.error('Error autenticando token:', e);
      res.status(500).json({ success: false, error: 'Error interno de autenticación' });
    }
  });
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Usuario no autenticado' });
      return;
    }

    if (!roles.includes((req.user as any).rol)) {
      res.status(403).json({ success: false, error: 'No tienes permisos para acceder a este recurso' });
      return;
    }

    next();
  };
};