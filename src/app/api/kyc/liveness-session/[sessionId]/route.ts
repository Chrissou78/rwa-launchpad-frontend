import { NextResponse } from 'next/server';

const getSessionStore = (): Map<string, any> => {
  if (typeof global !== 'undefined' && (global as any).__livenessSessionStore) {
    return (global as any).__livenessSessionStore;
  }
  return new Map();
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const store = getSessionStore();
    const session = store.get(sessionId);

    if (!session) {
      return NextResponse.json({
        found: false,
        completed: false,
        passed: false,
        score: 0,
        completedChallenges: 0,
      });
    }

    return NextResponse.json({
      found: true,
      completed: session.completed,
      passed: session.passed,
      score: session.score,
      completedChallenges: session.completedChallenges,
    });
  } catch (error) {
    console.error('[Liveness] GET error:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}
