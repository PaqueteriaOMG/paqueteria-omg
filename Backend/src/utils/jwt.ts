import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

interface AccessPayload {
  id: number;
  email: string;
  rol: string;
}

interface RefreshPayload {
  tokenId: string;
  userId: number;
}

interface ActionPayload {
  tokenId: string;
  userId: number;
}

export function generateAccessToken(payload: AccessPayload): string {
  const secret = process.env.JWT_SECRET || 'secret';
  const expiresInOption = (process.env.JWT_EXPIRES_IN || '15m') as unknown as SignOptions['expiresIn'];
  return jwt.sign(payload, secret, { expiresIn: expiresInOption } as SignOptions);
}

export function createRefreshToken(userId: number): { token: string; tokenId: string } {
  const tokenId = uuidv4();
  const secret = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';
  const days = parseInt(process.env.REFRESH_TOKEN_DAYS || '7', 10);
  const expiresInOption = (`${days}d`) as unknown as SignOptions['expiresIn'];
  const token = jwt.sign({ tokenId, userId } as RefreshPayload, secret, { expiresIn: expiresInOption } as SignOptions);
  return { token, tokenId };
}

export function verifyRefreshTokenPayload(token: string): RefreshPayload {
  const secret = process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';
  return jwt.verify(token, secret) as RefreshPayload;
}

// Password reset token helpers
export function createPasswordResetToken(userId: number): { token: string; tokenId: string } {
  const tokenId = uuidv4();
  const secret = process.env.RESET_TOKEN_SECRET || 'reset_secret';
  const hours = parseInt(process.env.RESET_TOKEN_HOURS || '1', 10);
  const expiresInOption = (`${hours}h`) as unknown as SignOptions['expiresIn'];
  const token = jwt.sign({ tokenId, userId } as ActionPayload, secret, { expiresIn: expiresInOption } as SignOptions);
  return { token, tokenId };
}

export function verifyPasswordResetToken(token: string): ActionPayload {
  const secret = process.env.RESET_TOKEN_SECRET || 'reset_secret';
  return jwt.verify(token, secret) as ActionPayload;
}

// Email verification token helpers
export function createEmailVerificationToken(userId: number): { token: string; tokenId: string } {
  const tokenId = uuidv4();
  const secret = process.env.EMAIL_VERIFY_SECRET || 'email_verify_secret';
  const hours = parseInt(process.env.EMAIL_VERIFY_HOURS || '48', 10);
  const expiresInOption = (`${hours}h`) as unknown as SignOptions['expiresIn'];
  const token = jwt.sign({ tokenId, userId } as ActionPayload, secret, { expiresIn: expiresInOption } as SignOptions);
  return { token, tokenId };
}

export function verifyEmailVerificationToken(token: string): ActionPayload {
  const secret = process.env.EMAIL_VERIFY_SECRET || 'email_verify_secret';
  return jwt.verify(token, secret) as ActionPayload;
}

export type { AccessPayload as AccessTokenPayload, RefreshPayload, ActionPayload };