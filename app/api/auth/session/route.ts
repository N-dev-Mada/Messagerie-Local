import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, setSessionCookie, clearSessionCookie } from '@/lib/auth';
import { getUserById, getAllUsers } from '@/lib/data';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const user = getUserById(session.userId);
    if (!user) {
      const response = NextResponse.json({ authenticated: false, user: null });
      clearSessionCookie(response);
      return response;
    }

    return NextResponse.json({ authenticated: true, user });
  } catch (error) {
    console.error('GET /api/auth/session error:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = typeof body.userId === 'number' ? body.userId : parseInt(body.userId, 10);

    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Identifiant utilisateur invalide' }, { status: 400 });
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const response = NextResponse.json({ success: true, user });
    setSessionCookie(response, user.id);
    return response;
  } catch (error) {
    console.error('POST /api/auth/session error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création de la session' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
