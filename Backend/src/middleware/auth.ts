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
      const User = (req as any).app?.locals?.models?.User || models.User;
      if (!User) {
        res.status(500).json({ success: false, error: 'Modelos no disponibles' });
        return;
      }

      const user = await User.findOne({
        where: { id: decoded.id, is_active: 1 },
        attributes: ['id', 'email', 'role']
      });

      if (!user) {
        res.status(401).json({ success: false, error: 'Usuario no válido o inactivo' });
        return;
      }

      req.user = { id: (user as any).id, email: (user as any).email, rol: (user as any).role } as any;
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