import fs from 'node:fs';
import path from 'node:path';
import { MODEL_CATALOG, DEFAULT_MODEL_ID } from '../lib/gateway/catalog';

const root = process.cwd();
const docs = [
  path.resolve(root, '..', 'README.md'),
  path.resolve(root, '..', 'docs', 'PRD_Infinall_Chat_Phase1_v2 1.md'),
  path.resolve(root, '..', 'docs', 'detailed.md'),
];

const ids = Object.keys(MODEL_CATALOG);
if (!ids.includes(DEFAULT_MODEL_ID)) throw new Error(`Default model is missing from catalog: ${DEFAULT_MODEL_ID}`);
for (const model of Object.values(MODEL_CATALOG)) {
  if (!model.id || !model.name || !model.endpoint || !model.apiType) throw new Error(`Incomplete model catalog entry: ${model.id}`);
  if (model.provider === 'anthropic' && model.apiType !== 'messages') throw new Error(`Anthropic model has invalid transport: ${model.id}`);
  if (model.provider === 'openai' && model.apiType !== 'chat-completions') throw new Error(`OpenAI-protocol model has invalid transport: ${model.id}`);
}

const staleModelClaims: string[] = [];
for (const file of docs) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('claude-3-7-sonnet-latest')) staleModelClaims.push(`${file}: claude-3-7-sonnet-latest`);
  if (text.includes('Claude Haiku 4.5')) staleModelClaims.push(`${file}: Claude Haiku 4.5`);
}
if (staleModelClaims.length) throw new Error(`Stale model claims found:\n${staleModelClaims.join('\n')}`);

console.log(`Model catalog verified: ${ids.join(', ')}`);
