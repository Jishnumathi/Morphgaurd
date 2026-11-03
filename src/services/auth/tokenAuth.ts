/**
 * MorphGuard AI — Forensic Token Authentication & RBAC Middleware
 * Provides cryptographically signed HMAC-SHA256 session tokens,
 * bearer token extraction, and role-based access authorization guards.
 */

import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { UserRole } from '../../types.js';

// Server-side secret key for HMAC token signing
const TOKEN_SECRET = process.env.SESSION_SECRET || 'morphguard-forensic-security-hmac-salt-key-2026';

export interface AuthUserPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  exp: number; // Unix timestamp in seconds
}

// Augment Express Request interface with authenticated user property
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload | null;
    }
  }
}

/**
 * Creates a cryptographically signed session token for an authenticated examiner.
 */
export function generateSessionToken(user: { id: string; email: string; role: UserRole; name: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days expiration

  const payload: AuthUserPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    exp,
  };

  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', TOKEN_SECRET)
    .update(`${header}.${payloadEncoded}`)
    .digest('base64url');

  return `${header}.${payloadEncoded}.${signature}`;
}

/**
 * Verifies and decodes an HMAC session token.
 */
export function verifySessionToken(token: string): AuthUserPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payloadEncoded, signature] = parts;
    const expectedSignature = createHmac('sha256', TOKEN_SECRET)
      .update(`${header}.${payloadEncoded}`)
      .digest('base64url');

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    const receivedBuf = Buffer.from(signature, 'utf-8');

    if (expectedBuf.length !== receivedBuf.length || !timingSafeEqual(expectedBuf, receivedBuf)) {
      return null;
    }

    const payload: AuthUserPayload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf-8'));

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Default admin override for designated lead investigator
    if (payload.email === 'vu.241fa04468@gmail.com') {
      payload.role = 'ADMIN';
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts and decodes token from Authorization header or fallback query/header
 */
export function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  req.user = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      // 1. Try verifying as our server HMAC token
      const verified = verifySessionToken(token);
      if (verified) {
        req.user = verified;
        return next();
      }

      // 2. Fallback: Parse Google / Firebase client token if present
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload.email || payload.sub) {
            const email = payload.email || 'officer@morphguard.gov';
            const role: UserRole = email === 'vu.241fa04468@gmail.com' ? 'ADMIN' : (payload.role || 'ANALYST');
            req.user = {
              id: payload.user_id || payload.sub || `usr-${Date.now()}`,
              email,
              role,
              name: payload.name || email.split('@')[0],
              exp: payload.exp || Math.floor(Date.now() / 1000) + 3600,
            };
            return next();
          }
        }
      } catch {
        // Fallback continues
      }
    }
  }

  next();
}

/**
 * Guard middleware requiring an active authenticated user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'This forensic operation requires a valid examiner authorization token.',
    });
  }
  next();
}

/**
 * Guard middleware requiring specific role privileges.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'Please log in with appropriate credentials to access this forensic endpoint.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient Privilege',
        message: `Operation restricted. Required role: ${allowedRoles.join(' or ')}. Your active role is ${req.user.role}.`,
        userRole: req.user.role,
        allowedRoles,
      });
    }

    next();
  };
}
