import { NextRequest } from 'next/server';
import { chatEventEmitter, ChatEventPayload } from '@/lib/sseEvents';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session non authentifiée' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(req.url);
  const userIdParam = searchParams.get('userId');
  const requestedUserId = userIdParam ? parseInt(userIdParam, 10) : undefined;

  // Prevent client from spoofing another user's stream
  if (requestedUserId && requestedUserId !== session.userId) {
    return new Response(
      JSON.stringify({ error: 'Accès interdit au flux d\'un autre utilisateur' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const userId = session.userId;

  let unsubscribe: (() => void) | null = null;
  let keepAliveTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: any) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream might have closed
        }
      };

      // Initial connected handshake
      sendEvent('connected', {
        status: 'connected',
        userId,
        timestamp: new Date().toISOString(),
      });

      // Subscribe to real-time events from server broker
      unsubscribe = chatEventEmitter.subscribe((event: ChatEventPayload) => {
        sendEvent('chat_event', event);
      });

      // Heartbeat ping every 15s to keep proxy/connection alive
      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          // Stream closed
        }
      }, 15000);
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering (nginx / Cloud Run)
    },
  });
}
