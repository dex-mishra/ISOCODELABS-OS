import { NextRequest } from 'next/server';
import { verifyToken, UserPayload } from './jwt';

export function requireAuth(request: NextRequest): UserPayload | null {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer '
  return verifyToken(token);
}
