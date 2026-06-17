import jwt from 'jsonwebtoken';

export interface UserPayload {
  id: string;
  email: string;
  name: string;
}

export function generateToken(user: UserPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL ERROR: JWT_SECRET environment variable is missing.');
  }
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    secret,
    { expiresIn: '7d' } // Simple 7-day token for the two founders
  );
}

export function verifyToken(token: string): UserPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL ERROR: JWT_SECRET environment variable is missing.');
  }
  try {
    return jwt.verify(token, secret) as UserPayload;
  } catch {
    return null;
  }
}
