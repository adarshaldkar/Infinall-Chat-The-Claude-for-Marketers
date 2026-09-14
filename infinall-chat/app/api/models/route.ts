import { NextResponse } from 'next/server';
import { MODEL_CATALOG, DEFAULT_MODEL_ID } from '@/lib/gateway/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const models = Object.values(MODEL_CATALOG).map(
    ({ id, name, provider, apiType, supportsExtendedThinking, supportsPromptCaching, supportsVision, contextWindow }) => ({
      id,
      name,
      provider,
      apiType,
      supportsExtendedThinking,
      supportsPromptCaching,
      supportsVision,
      contextWindow,
      isDefault: id === DEFAULT_MODEL_ID,
    })
  );

  return NextResponse.json({
    defaultModel: DEFAULT_MODEL_ID,
    count: models.length,
    models,
  });
}
