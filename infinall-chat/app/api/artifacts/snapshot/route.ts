import { NextResponse } from 'next/server';
import { ArtifactVersionStore } from '@/lib/artifacts/version-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get('artifactId');

  if (!id) {
    return NextResponse.json({ error: 'artifactId parameter required' }, { status: 400 });
  }

  const history = ArtifactVersionStore.getHistory(id);
  const latest = history[history.length - 1];

  return NextResponse.json({
    artifactId: id,
    latestVersion: latest?.version ?? 1,
    history,
  });
}
