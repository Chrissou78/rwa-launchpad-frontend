import { NextResponse } from 'next/server';

// Use global store to persist across API calls
if (typeof global !== 'undefined') {
  (global as any).__livenessSessionStore = (global as any).__livenessSessionStore || new Map();
}

const getSessionStore = (): Map<string, any> => {
  if (typeof global !== 'undefined' && (global as any).__livenessSessionStore) {
    return (global as any).__livenessSessionStore;
  }
  return new Map();
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, completed, passed, score, completedChallenges } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const store = getSessionStore();
    store.set(sessionId, {
      completed: completed || false,
      passed: passed || false,
      score: score || 0,
      completedChallenges: completedChallenges || 0,
      createdAt: Date.now(),
    });

    console.log(`[Liveness] Session ${sessionId} updated:`, { completed, passed, score });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Liveness] POST error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use /api/kyc/liveness-session/[sessionId] to check status' 
  });
}