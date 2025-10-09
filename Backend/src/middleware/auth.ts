import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { models } from '../db/sequelize';

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
      const Usuario = (req as any).app?.locals?.models?.Usuario || models.Usuario;
      if (!Usuario) {
        res.status(500).json({ success: false, error: 'Modelos no disponibles' });
        return;
      }

      const user = await Usuario.findOne({
        where: { usua_id: decoded.id, usua_activo: 1 },
        attributes: ['usua_id', 'usua_email', 'usua_rol']
      });

      if (!user) {
        res.status(401).json({ success: false, error: 'Usuario no válido o inactivo' });
        return;
      }

      req.user = { id: user.usua_id, email: user.usua_email, rol: user.usua_rol } as any;
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