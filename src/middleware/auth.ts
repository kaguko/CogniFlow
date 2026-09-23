import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email: string };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Allow demo/guest mode for frictionless initial experience
    req.user = { uid: 'guest_user_cogniflow', email: 'developer@cogniflow.local' };
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.warn('Firebase token verification error, falling back to guest:', error);
    req.user = { uid: 'guest_user_cogniflow', email: 'developer@cogniflow.local' };
    next();
  }
};
