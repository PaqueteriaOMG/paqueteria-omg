import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { Pool } from 'mysql2/promise';
import { LoginRequest, LoginResponse, Usuario } from '../types';
import { generateAccessToken, createRefreshToken, verifyRefreshTokenPayload, createPasswordResetToken, verifyPasswordResetToken, createEmailVerificationToken, verifyEmailVerificationToken } from '../utils/jwt';

// Ventana y políticas anti-bruteforce (por email)
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const LOGIN_MAX_ATTEMPTS = 5; // intentos permitidos por ventana
const LOGIN_BLOCK_MS = 30 * 60 * 1000; // bloqueo 30 minutos
const loginAttempts = new Map<string, { count: number; first: number; blockedUntil?: number }>();

export class AuthController {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async login(req: any, res: Response) {
    try {
      const { email, password } = req.body as LoginRequest;

      // Bloqueo temporal por múltiples intentos fallidos
      const now = Date.now();
      const rec = loginAttempts.get(email);
      if (rec?.blockedUntil && now < rec.blockedUntil) {
        const retryAfterSec = Math.ceil((rec.blockedUntil - now) / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        res.status(429).json({ error: 'Cuenta temporalmente bloqueada por intentos fallidos. Intenta más tarde', details: { retry_after_seconds: retryAfterSec } });
        return;
      }

      const incFailed = () => {
        const current = loginAttempts.get(email);
        const now2 = Date.now();
        if (!current) {
          loginAttempts.set(email, { count: 1, first: now2 });
          return;
        }
        // Reiniciar ventana si expiró
        if (now2 - current.first > LOGIN_WINDOW_MS) {
          loginAttempts.set(email, { count: 1, first: now2 });
          return;
        }
        const newCount = current.count + 1;
        const updated = { ...current, count: newCount } as { count: number; first: number; blockedUntil?: number };
        if (newCount >= LOGIN_MAX_ATTEMPTS) {
          updated.blockedUntil = now2 + LOGIN_BLOCK_MS;
        }
        loginAttempts.set(email, updated);
      };

      const resetAttempts = () => {
        loginAttempts.delete(email);
      };

      // Buscar usuario por email (activo)
      const [rows] = await this.db.execute(
        'SELECT * FROM Usuarios WHERE usua_email = ? AND usua_activo = 1',
        [email]
      );
      const users = rows as Usuario[];

      if (users.length === 0) {
        incFailed();
        res.status(401).json({ error: 'Credenciales inválidas' });
        return;
      }

      const user = users[0];

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.usua_password_hash);
      if (!isValidPassword) {
        incFailed();
        res.status(401).json({ error: 'Credenciales inválidas' });
        return;
      }

      // impiar contador de intentos
      resetAttempts();

      // Generar access token corto y refresh token persistido
      const accessToken = generateAccessToken({ 
        id: user.usua_id!, 
        email: user.usua_email, 
        rol: user.usua_rol 
      });

      const { token: refreshToken, tokenId } = createRefreshToken(user.usua_id!);

      // Guardar/rotar refresh token en BD
      await this.db.execute(
        'INSERT INTO RefreshTokens (reto_token_id, reto_user_id, reto_revoked) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE reto_revoked = 0',
        [tokenId, user.usua_id]
      );

      // Setear cookie httpOnly con refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: (process.env.NODE_ENV === 'production') || (process.env.COOKIE_SAMESITE?.toLowerCase() === 'none'),
        sameSite: (process.env.COOKIE_SAMESITE as any) || 'lax',
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: '/',
        maxAge: this.getRefreshCookieMaxAge()
      });

      res.json({
        token: accessToken,
        user: {
          id: user.usua_id!,
          nombre: user.usua_nombre,
          email: user.usua_email,
          rol: user.usua_rol
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async register(req: any, res: Response) {
    try {
      const { nombre, email, password, rol } = req.body;

      const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!strongPwdRegex.test(password)) {
        res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, números y un carácter especial' });
        return;
      }

      // Verificar si el usuario ya existe
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

      // Crear usuario INACTIVO
      const [result] = await this.db.execute(
        'INSERT INTO Usuarios (usua_nombre, usua_email, usua_password_hash, usua_rol, usua_activo) VALUES (?, ?, ?, ?, 0)',
        [nombre, email, hashedPassword, rol]
      );

      const insertId = (result as any).insertId as number;

      // Crear token de verificación de email y persistir
      const { tokenId, token } = createEmailVerificationToken(insertId);
      await this.db.execute('INSERT INTO EmailVerificationTokens (evt_token_id, evt_user_id, evt_used) VALUES (?, ?, 0)', [tokenId, insertId]);

      // Nota: en producción se debe enviar el token por email. En desarrollo lo devolvemos para pruebas.
      const isProd = process.env.NODE_ENV === 'production';
      if (!isProd) {
        console.log(`[EmailVerification] Token para ${email}:`, token);
      }

      res.status(201).json({ message: 'Usuario creado. Revisa tu correo para activar la cuenta', ...(isProd ? {} : { verificationToken: token }) });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  async verify(req: any, res: Response) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        res.status(401).json({
          error: 'Token no proporcionado'
        });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
      
      // Verificar que el usuario aún existe y está activo
      const [rows] = await this.db.execute(
        'SELECT usua_id, usua_nombre, usua_email, usua_rol FROM Usuarios WHERE usua_id = ? AND usua_activo = 1',
        [decoded.id]
      );
      const users = rows as Usuario[];

      if (users.length === 0) {
        res.status(401).json({
          error: 'Usuario no válido'
        });
        return;
      }

      res.json({
        user: users[0],
        valid: true
      });
    } catch (error) {
      console.error('Error en verificación:', error);
      res.status(401).json({
        error: 'Token inválido'
      });
    }
  }

  async logout(req: any, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        res.status(400).json({ error: 'No hay token de refresco para cerrar sesión' });
        return;
      }

      const payload = verifyRefreshTokenPayload(refreshToken);
      await this.db.execute('UPDATE RefreshTokens SET reto_revoked = 1 WHERE reto_token_id = ?', [payload.tokenId]);

      res.clearCookie('refreshToken');
      res.json({ message: 'Sesión cerrada correctamente' });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({ error: 'Error del servidor al cerrar sesión' });
    }
  }

  async refresh(req: any, res: Response) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        res.status(401).json({ error: 'No hay token de refresco' });
        return;
      }

      const payload = verifyRefreshTokenPayload(refreshToken);

      // Comprobar que el token existe y no está revocado
      const [rows] = await this.db.execute('SELECT reto_revoked AS revoked, reto_user_id AS user_id FROM RefreshTokens WHERE reto_token_id = ?', [payload.tokenId]);
      const tokens = rows as Array<{ revoked: number; user_id: number }>;
      if (tokens.length === 0 || tokens[0].revoked) {
        res.status(401).json({ error: 'Token inválido o revocado' });
        return;
      }

      const userId = tokens[0].user_id;

      // Verificar que el usuario existe y está activo; obtener email y rol
      const [userRows] = await this.db.execute(
        'SELECT usua_email, usua_rol FROM Usuarios WHERE usua_id = ? AND usua_activo = 1',
        [userId]
      );
      const users = userRows as Array<{ usua_email: string; usua_rol: string }>;
      if (users.length === 0) {
        // Usuario inválido: revocar token actual y limpiar cookie
        await this.db.execute('UPDATE RefreshTokens SET reto_revoked = 1 WHERE reto_token_id = ?', [payload.tokenId]);
        try { res.clearCookie('refreshToken', { path: '/' }); } catch {}
        res.status(401).json({ error: 'Usuario no válido o inactivo' });
        return;
      }

      const { usua_email, usua_rol } = users[0];

      // Revocar token actual y emitir uno nuevo (rotación)
      await this.db.execute('UPDATE RefreshTokens SET reto_revoked = 1 WHERE reto_token_id = ?', [payload.tokenId]);

      const { token: newRefreshToken, tokenId: newTokenId } = createRefreshToken(userId);
      await this.db.execute('INSERT INTO RefreshTokens (reto_token_id, reto_user_id, reto_revoked) VALUES (?, ?, 0)', [newTokenId, userId]);

      // Setear nueva cookie
      res.cookie('refreshToken', newRefreshToken, {
        httpOnly: true,
        secure: (process.env.NODE_ENV === 'production') || (process.env.COOKIE_SAMESITE?.toLowerCase() === 'none'),
        sameSite: (process.env.COOKIE_SAMESITE as any) || 'lax',
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: '/',
        maxAge: this.getRefreshCookieMaxAge()
      });

      // Emitir nuevo access token con datos del usuario obtenidos de la BD
      const accessToken = generateAccessToken({ id: userId, email: usua_email, rol: usua_rol });

      res.json({ accessToken });
    } catch (error) {
      console.error('Error en refresh:', error);
      res.status(401).json({ error: 'Token de refresco inválido' });
    }
  }

  async forgotPassword(req: any, res: Response) {
    try {
      const { email } = req.body as { email: string };
      if (!email) {
        res.status(400).json({ error: 'Email requerido' });
        return;
      }

      const [rows] = await this.db.execute('SELECT usua_id, usua_activo FROM Usuarios WHERE usua_email = ?', [email]);
      const users = rows as Array<{ usua_id: number; usua_activo: number }>;
      if (users.length > 0 && users[0].usua_activo === 1) {
        const userId = users[0].usua_id;
        const { tokenId, token } = createPasswordResetToken(userId);
        await this.db.execute('INSERT INTO PasswordResetTokens (token_id, user_id, used) VALUES (?, ?, 0)', [tokenId, userId]);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[PasswordReset] Token para ${email}:`, token);
        }
        // Aquí se enviaría email con el enlace de restablecimiento
      }

      // Responder siempre igual por seguridad
      res.json({ message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña' });
    } catch (error) {
      console.error('Error en forgotPassword:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async resetPassword(req: any, res: Response) {
    try {
      const { token, newPassword } = req.body as { token: string; newPassword: string };
      if (!token || !newPassword) {
        res.status(400).json({ error: 'Datos incompletos' });
        return;
      }

      const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!strongPwdRegex.test(newPassword)) {
        res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, números y un carácter especial' });
        return;
      }

      const payload = verifyPasswordResetToken(token);
      const [rows] = await this.db.execute('SELECT prt_used AS used, prt_user_id AS user_id FROM PasswordResetTokens WHERE prt_token_id = ?', [payload.tokenId]);
      const tokens = rows as Array<{ used: number; user_id: number }>;
      if (tokens.length === 0 || tokens[0].used === 1) {
        res.status(400).json({ error: 'Token inválido o ya utilizado' });
        return;
      }

      const userId = tokens[0].user_id;
      const hashed = await bcrypt.hash(newPassword, 10);

      await this.db.execute('UPDATE Usuarios SET usua_password_hash = ? WHERE usua_id = ?', [hashed, userId]);
      await this.db.execute('UPDATE PasswordResetTokens SET prt_used = 1 WHERE prt_token_id = ?', [payload.tokenId]);

      // Revocar todos los refresh tokens activos del usuario
      await this.db.execute('UPDATE RefreshTokens SET reto_revoked = 1 WHERE reto_user_id = ? AND reto_revoked = 0', [userId]);

      res.json({ message: 'Contraseña actualizada. Vuelve a iniciar sesión.' });
    } catch (error) {
      console.error('Error en resetPassword:', error);
      res.status(400).json({ error: 'Token inválido o expirado' });
    }
  }

  async verifyEmail(req: any, res: Response) {
    try {
      const token = (req.query?.token as string) || (req.body?.token as string);
      if (!token) {
        res.status(400).json({ error: 'Token requerido' });
        return;
      }

      const payload = verifyEmailVerificationToken(token);
      const [rows] = await this.db.execute('SELECT evt_used AS used, evt_user_id AS user_id FROM EmailVerificationTokens WHERE evt_token_id = ?', [payload.tokenId]);
      const tokens = rows as Array<{ used: number; user_id: number }>;
      if (tokens.length === 0 || tokens[0].used === 1) {
        res.status(400).json({ error: 'Token inválido o ya utilizado' });
        return;
      }

      const userId = tokens[0].user_id;
      await this.db.execute('UPDATE Usuarios SET usua_activo = 1 WHERE usua_id = ?', [userId]);
      await this.db.execute('UPDATE EmailVerificationTokens SET evt_used = 1 WHERE evt_token_id = ?', [payload.tokenId]);

      res.json({ message: 'Email verificado. Ya puedes iniciar sesión.' });
    } catch (error) {
      console.error('Error en verifyEmail:', error);
      res.status(400).json({ error: 'Token inválido o expirado' });
    }
  }

  private getRefreshCookieMaxAge(): number {
    const days = parseInt(process.env.REFRESH_TOKEN_DAYS || '7', 10);
    return days * 24 * 60 * 60 * 1000;
  }
}