import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'messagerie_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'messagerie_local_lan_secret_token_2026_key';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Creates a signed session token for a given userId
 */
export function createSessionToken(userId: number): string {
  const timestamp = Date.now();
  const payload = `${userId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64url');
  return token;
}

/**
 * Verifies a signed session token and returns the userId if valid
 */
export function verifySessionToken(token: string | null | undefined): { userId: number } | null {
  if (!token || typeof token !== 'string') return null;

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;

    const [userIdStr, timestampStr, signature] = parts;
    const userId = parseInt(userIdStr, 10);
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(userId) || isNaN(timestamp) || userId <= 0) return null;

    // Check expiration (30 days)
    if (Date.now() - timestamp > SESSION_MAX_AGE_SECONDS * 1000) {
      return null;
    }

    const payload = `${userId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', SESSION_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    return { userId };
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the session from a NextRequest cookie
 */
export function getSessionFromRequest(req: NextRequest): { userId: number } | null {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;
  return verifySessionToken(cookie.value);
}

/**
 * Sets the HttpOnly session cookie on a NextResponse
 */
export function setSessionCookie(response: NextResponse, userId: number): void {
  const token = createSessionToken(userId);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Clears the session cookie on a NextResponse
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
